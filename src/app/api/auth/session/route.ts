import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { authenticateUser, createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

/**
 * GET /api/auth/session
 * Decodes the session token and fetches the verified user directly from the database.
 * WRAPPED IN TRY/CATCH — always returns JSON, never lets an error escape (→ "Unexpected end of JSON input").
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/auth/session
 * Handles ONLY genuine password-authenticated login, issuing a cryptographically signed JWT cookie.
 * SÉCURITÉ : L'usurpation de session ou le basculement arbitraire ("switch") a été TOTALEMENT supprimé.
 * WRAPPED IN TRY/CATCH — always returns JSON, never lets an error escape (→ "Unexpected end of JSON input").
 */
export async function POST(request: NextRequest) {
  // 1. Parse the JSON body safely — wrap in try/catch so that a malformed/empty body
  //    returns a clean JSON 400 instead of throwing (→ "Unexpected end of JSON input").
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête JSON invalide ou vide." },
      { status: 400 }
    );
  }

  const { action, telephone, motDePasse } = body;

  if (action !== "login") {
    return NextResponse.json(
      { success: false, error: "Action non autorisée. Seule l'authentification par mot de passe est permise." },
      { status: 403 }
    );
  }

  if (!telephone || !motDePasse) {
    return NextResponse.json(
      { success: false, error: "Numéro de téléphone et mot de passe requis." },
      { status: 400 }
    );
  }

  // 2. Connect to the pool INSIDE the try/catch so that a connection timeout
  //    returns a clean JSON 500 instead of throwing (→ "Unexpected end of JSON input").
  let client: any;
  try {
    client = await pool.connect();

    const res = await client.query(
      `SELECT id, nom, telephone, email, mot_de_passe, role, pays, solde_starcoin, plan_actuel
       FROM users
       WHERE telephone = $1 OR (email IS NOT NULL AND email = $1)`,
      [telephone.trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Numéro de téléphone ou identifiant introuvable." },
        { status: 404 }
      );
    }

    const targetUser = res.rows[0];

    // 3. Verify the password using bcrypt (hashed comparison — never plaintext).
    const passwordMatch = await bcrypt.compare(motDePasse, targetUser.mot_de_passe);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "Mot de passe incorrect." },
        { status: 401 }
      );
    }

    // Sign JWT session token with real database role
    const token = await createSessionToken({
      userId: targetUser.id,
      role: targetUser.role,
      telephone: targetUser.telephone,
    });

    const safeUser = {
      id: targetUser.id,
      nom: targetUser.nom,
      telephone: targetUser.telephone,
      email: targetUser.email,
      role: targetUser.role,
      pays: targetUser.pays,
      solde_starcoin: targetUser.solde_starcoin,
      plan_actuel: targetUser.plan_actuel,
    };

    const response = NextResponse.json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: safeUser,
    });

    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    // Connection timeout or DB error → return clean JSON 500 (NOT an empty/HTML response)
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à la base de données. Réessayez dans quelques secondes." },
      { status: 503 }
    );
  } finally {
    if (client) client.release();
  }
}

/**
 * DELETE /api/auth/session
 * Logs out user by clearing the session cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Déconnecté." });
  clearSessionCookie(response);
  return response;
}
