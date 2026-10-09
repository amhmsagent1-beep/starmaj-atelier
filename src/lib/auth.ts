import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "starmaj_atelier_secret_key_2026_vercel_production_security_min32chars"
);

export const COOKIE_NAME = "starmaj_session";

export interface SessionPayload {
  userId: number;
  role: string;
  telephone: string;
}

export interface AuthenticatedUser {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: "admin" | "user";
  pays: string | null;
  solde_starcoin: string | number;
  plan_actuel: string | null;
}

/**
 * Sign a secure JWT session token for an authenticated user.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    telephone: payload.telephone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.userId) return null;
    return {
      userId: Number(payload.userId),
      role: String(payload.role || "user"),
      telephone: String(payload.telephone || ""),
    };
  } catch {
    return null;
  }
}

/**
 * Extract token from either HttpOnly Cookie, Authorization Header (Bearer), or custom header.
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  // 1. Check HttpOnly Cookie
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Check Authorization Header (Bearer <token>)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 3. Check X-StarMaj-Session header
  const customHeader = request.headers.get("x-starmaj-session");
  if (customHeader) return customHeader.trim();

  return null;
}

/**
 * Authenticate session and ALWAYS verify user existence and real role directly against PostgreSQL.
 * NEVER trust client-passed roles or claims without database verification.
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.userId) return null;

  // Query database directly to fetch real, untampered user record and role
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, nom, telephone, email, role, pays, solde_starcoin, plan_actuel 
       FROM users 
       WHERE id = $1`,
      [payload.userId]
    );

    if (res.rows.length === 0) return null;

    const dbUser = res.rows[0];
    return {
      id: dbUser.id,
      nom: dbUser.nom,
      telephone: dbUser.telephone,
      email: dbUser.email,
      role: dbUser.role as "admin" | "user",
      pays: dbUser.pays,
      solde_starcoin: dbUser.solde_starcoin,
      plan_actuel: dbUser.plan_actuel,
    };
  } catch (err) {
    console.error("[AUTH] Erreur vérification base de données :", err);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Strict server-side ADMIN authorization guard.
 * Returns the verified admin user, or a 401/403 NextResponse if unauthorized.
 */
export async function requireAdmin(request: NextRequest): Promise<
  { user: AuthenticatedUser; errorResponse?: never } | { user?: never; errorResponse: NextResponse }
> {
  const user = await authenticateUser(request);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Session invalide ou expirée. Veuillez vous authentifier.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      ),
    };
  }

  // Strict database check: role MUST be 'admin' in PostgreSQL
  if (user.role !== "admin") {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Accès interdit (403 Forbidden) : Rôle ADMIN obligatoire vérifié en base de données.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Helper to set session cookie on a NextResponse.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Helper to clear session cookie on logout.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * getSession — Retourne l'utilisateur authentifié de la session courante,
 * vérifié DIRECTEMENT en base de données (jamais confiance aux claims du client).
 * Alias de authenticateUser, exposé sous le nom attendu par les routes API.
 */
export async function getSession(request: NextRequest): Promise<AuthenticatedUser | null> {
  return authenticateUser(request);
}

/**
 * verifyAdminApi — Garde stricte ADMIN pour les routes API sensibles.
 * Retourne l'utilisateur admin vérifié en base, ou une réponse d'erreur 401/403.
 * Alias de requireAdmin, exposé sous le nom attendu par les routes API.
 */
export async function verifyAdminApi(request: NextRequest): Promise<
  { user: AuthenticatedUser; errorResponse?: never } | { user?: never; errorResponse: NextResponse }
> {
  return requireAdmin(request);
}

/**
 * requireAuth — Garde d'authentification stricte (tous rôles).
 * Retourne l'utilisateur authentifié VÉRIFIÉ EN BASE DE DONNÉES,
 * ou lance une erreur 401 si la session est absente/expiree/invalide.
 * Utilisé par les routes API et composants serveur qui exigent un utilisateur connecté.
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await authenticateUser(request);
  if (!user) {
    const err = new Error("UNAUTHENTICATED: Session invalide ou expirée. Veuillez vous authentifier.") as Error & {
      status: number;
    };
    err.status = 401;
    throw err;
  }
  return user;
}
