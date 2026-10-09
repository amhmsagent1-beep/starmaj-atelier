import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

// Parité officielle StarMaj : 50 Francs CFA = 1 StarCoin (SC)
const CFA_PER_SC = 50;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  const client = await pool.connect();
  try {
    let query = `SELECT * FROM user_profiles`;
    const params: any[] = [];
    if (userId) {
      query += ` WHERE user_id = $1`;
      params.push(parseInt(userId, 10));
    }
    query += ` ORDER BY id ASC`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, profiles: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, nomProfil, vitesseUpload, vitesseDownload, limiteTemps, dureeValidite, prixCfa, prixSc, sharedUsers = 1 } = body;

  if (!userId || !nomProfil) {
    return NextResponse.json({ success: false, error: "Nom du profil et utilisateur requis" }, { status: 400 });
  }

  // Parité officielle : 50 FCFA = 1 SC → 1 SC = 50 CFA
  const cfa = prixCfa ? parseFloat(prixCfa) : (prixSc ? parseFloat(prixSc) * CFA_PER_SC : 100);
  const sc = prixSc ? parseFloat(prixSc) : (prixCfa ? parseFloat(prixCfa) / CFA_PER_SC : 2);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO user_profiles 
       (user_id, nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_cfa, prix_sc, shared_users)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        nomProfil,
        vitesseUpload || "1M",
        vitesseDownload || "2M",
        limiteTemps || "1h",
        dureeValidite || "24h",
        cfa,
        sc,
        sharedUsers || 1,
      ]
    );

    return NextResponse.json({ success: true, profile: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, nomProfil, vitesseUpload, vitesseDownload, limiteTemps, dureeValidite, prixCfa, prixSc, sharedUsers } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID du profil requis" }, { status: 400 });
  }

  const cfa = prixCfa ? parseFloat(prixCfa) : (prixSc ? parseFloat(prixSc) * 50 : undefined);
  const sc = prixSc ? parseFloat(prixSc) : (prixCfa ? parseFloat(prixCfa) / 50 : undefined);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE user_profiles 
       SET nom_profil = COALESCE($1, nom_profil),
           vitesse_upload = COALESCE($2, vitesse_upload),
           vitesse_download = COALESCE($3, vitesse_download),
           limite_temps = COALESCE($4, limite_temps),
           duree_validite = COALESCE($5, duree_validite),
           prix_cfa = COALESCE($6, prix_cfa),
           prix_sc = COALESCE($7, prix_sc),
           shared_users = COALESCE($8, shared_users)
       WHERE id = $9
       RETURNING *`,
      [
        nomProfil,
        vitesseUpload,
        vitesseDownload,
        limiteTemps,
        dureeValidite,
        cfa,
        sc,
        sharedUsers,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Profil introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: result.rows[0], message: "Profil mis à jour avec succès" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID du profil manquant" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Unlink tickets and batches first
    await client.query("UPDATE ticket_batches SET profile_id = NULL WHERE profile_id = $1", [id]);
    await client.query("DELETE FROM user_profiles WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Profil supprimé." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
