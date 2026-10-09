import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { createSessionToken, setSessionCookie, authenticateUser, requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

/**
 * GET /api/users
 * WRAPPED IN TRY/CATCH — always returns JSON, never lets an error escape (→ "Unexpected end of JSON input").
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    const client = await pool.connect();
    try {
      if (userId) {
        const res = await client.query(
          "SELECT id, nom, telephone, email, role, pays, solde_starcoin, plan_actuel, plan_expire_a, date_creation FROM users WHERE id = $1",
          [userId]
        );
        if (res.rows.length === 0) {
          return NextResponse.json({ success: false, error: "Utilisateur non trouvé" }, { status: 404 });
        }
        return NextResponse.json({ success: true, user: res.rows[0] });
      }

      const res = await client.query(
        "SELECT id, nom, telephone, email, role, pays, solde_starcoin, plan_actuel, plan_expire_a, date_creation FROM users ORDER BY id ASC"
      );
      return NextResponse.json({ success: true, users: res.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    // DB connection timeout or error → return clean JSON 503 (NOT an empty/HTML response)
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à la base de données. Réessayez dans quelques secondes." },
      { status: 503 }
    );
  }
}

/**
 * POST /api/users
 * Inscription / Connexion avec numéro de téléphone (international tous pays, email facultatif).
 * SÉCURITÉ : Les mots de passe sont hachés avec bcrypt (jamais en clair).
 * ROBUSTESSE : request.json() et pool.connect() sont dans des try/catch pour
 * retourner une réponse JSON propre même en cas d'erreur (→ pas de "Unexpected end of JSON input").
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

  const { action, nom, telephone, email, motDePasse, pays } = body;

  if (!telephone || !motDePasse) {
    return NextResponse.json(
      { success: false, error: "Numéro de téléphone et mot de passe obligatoires." },
      { status: 400 }
    );
  }

  const cleanPhone = telephone.trim();
  const cleanEmail = email && email.trim() ? email.trim() : null;

  // 2. Connect to the pool INSIDE the try/catch so that a connection timeout
  //    returns a clean JSON 503 instead of throwing (→ "Unexpected end of JSON input").
  let client: any;
  try {
    client = await pool.connect();

    if (action === "register") {
      if (!nom || !nom.trim()) {
        return NextResponse.json(
          { success: false, error: "Le nom complet ou nom de l'entreprise est obligatoire." },
          { status: 400 }
        );
      }

      // Check if phone already registered
      const existRes = await client.query("SELECT id FROM users WHERE telephone = $1", [cleanPhone]);
      if (existRes.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Ce numéro de téléphone possède déjà un compte StarMaj Atelier." },
          { status: 409 }
        );
      }

      // 3. HASH the password with bcrypt (NEVER store plaintext)
      const hashedPassword = await bcrypt.hash(motDePasse, 10);

      // Create new user (Solde d'accueil : 2 500 CFA = 50 SC offerts pour démarrer)
      const insertRes = await client.query(
        `INSERT INTO users (nom, telephone, email, mot_de_passe, role, pays, solde_starcoin, plan_actuel)
         VALUES ($1, $2, $3, $4, 'user', $5, 50.00, 'wifi_basic')
         RETURNING id, nom, telephone, email, role, pays, solde_starcoin, plan_actuel, date_creation`,
        [nom.trim(), cleanPhone, cleanEmail, hashedPassword, pays || "Niger"]
      );

      const newUser = insertRes.rows[0];

      const token = await createSessionToken({
        userId: newUser.id,
        role: newUser.role,
        telephone: newUser.telephone,
      });

      const response = NextResponse.json({
        success: true,
        message: "Compte créé avec succès ! Bienvenue sur StarMaj Atelier.",
        user: newUser,
        token,
      });

      setSessionCookie(response, token);
      return response;
    }

    if (action === "login") {
      const userRes = await client.query(
        `SELECT id, nom, telephone, email, mot_de_passe, role, pays, solde_starcoin, plan_actuel, date_creation
         FROM users
         WHERE telephone = $1 OR (email IS NOT NULL AND email = $1)`,
        [cleanPhone]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Numéro de téléphone introuvable. Veuillez vous inscrire." },
          { status: 404 }
        );
      }

      const foundUser = userRes.rows[0];

      // 4. Verify the password using bcrypt (hashed comparison — never plaintext)
      const passwordMatch = await bcrypt.compare(motDePasse, foundUser.mot_de_passe);
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: "Mot de passe incorrect pour ce numéro." },
          { status: 401 }
        );
      }

      const { mot_de_passe, ...safeUser } = foundUser;

      const token = await createSessionToken({
        userId: safeUser.id,
        role: safeUser.role,
        telephone: safeUser.telephone,
      });

      const response = NextResponse.json({
        success: true,
        message: "Connexion réussie !",
        user: safeUser,
        token,
      });

      setSessionCookie(response, token);
      return response;
    }

    return NextResponse.json({ success: false, error: "Action non supportée" }, { status: 400 });
  } catch (error: any) {
    // DB connection timeout or error → return clean JSON 503 (NOT an empty/HTML response)
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à la base de données. Réessayez dans quelques secondes." },
      { status: 503 }
    );
  } finally {
    if (client) client.release();
  }
}

/**
 * PATCH /api/users
 * Strictly guarded: requires ADMIN role verified in PostgreSQL.
 * Allows administrator to adjust role ('admin' or 'user'), credit StarCoins, or adjust plan.
 * WRAPPED IN TRY/CATCH — always returns JSON, never lets an error escape.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }
  const adminUser = auth.user;

  // Parse JSON body safely
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête JSON invalide ou vide." },
      { status: 400 }
    );
  }

  const { targetUserId, role, ajusterSoldeSc, planActuel } = body;

  if (!targetUserId) {
    return NextResponse.json({ success: false, error: "targetUserId requis" }, { status: 400 });
  }

  if (role && role !== "admin" && role !== "user") {
    return NextResponse.json({ success: false, error: "Rôle invalide. Seuls 'admin' et 'user' sont permis." }, { status: 400 });
  }

  let client: any;
  try {
    client = await pool.connect();

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (role !== undefined) {
      updates.push(`role = $${pIdx++}`);
      params.push(role);
    }
    if (ajusterSoldeSc !== undefined) {
      const amount = parseFloat(ajusterSoldeSc);
      updates.push(`solde_starcoin = $${pIdx++}`);
      params.push(amount);
    }
    if (planActuel !== undefined) {
      updates.push(`plan_actuel = $${pIdx++}`);
      params.push(planActuel);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "Aucune modification demandée." });
    }

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${pIdx} RETURNING id, nom, telephone, email, role, solde_starcoin, plan_actuel`;
    params.push(targetUserId);

    const res = await client.query(query, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Utilisateur "${res.rows[0].nom}" mis à jour avec succès par ${adminUser.nom}.`,
      user: res.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à la base de données. Réessayez dans quelques secondes." },
      { status: 503 }
    );
  } finally {
    if (client) client.release();
  }
}
