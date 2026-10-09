import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { chargeUserForAction } from "@/lib/pricing";

// Parité officielle StarMaj : 50 Francs CFA = 1 StarCoin (SC)
const CFA_PER_SC = 50;

function generateTicketCode(length = 4) {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude 0, 1, I, O
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePassword(length = 4) {
  const nums = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  const client = await pool.connect();
  try {
    let query = `
      SELECT b.*, b.logo_ticket, r.nom_routeur, r.identifiant_unique_token, p.nom_profil, p.vitesse_upload, p.vitesse_download, p.prix_sc, p.prix_cfa,
             (SELECT COUNT(*) FROM wifi_tickets t WHERE t.batch_id = b.id) as tickets_total,
             (SELECT COUNT(*) FROM wifi_tickets t WHERE t.batch_id = b.id AND t.est_utilise = true) as tickets_utilises
      FROM ticket_batches b
      LEFT JOIN routers r ON r.id = b.router_id
      LEFT JOIN user_profiles p ON p.id = b.profile_id
    `;
    const params: any[] = [];
    if (userId) {
      query += ` WHERE b.user_id = $1`;
      params.push(parseInt(userId, 10));
    }
    query += ` ORDER BY b.date_creation DESC`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, batches: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    userId,
    routerId,
    profileId,
    nomLot,
    quantite = 50,
    prefixe = "SM",
    codeLongueur = 4,
    avecMotDePasse = true,
    templateDesign = "mikhmon_thermal",
    logoTicket = "STARMAJ WIFI",
  } = body;

  if (!userId || !routerId || !profileId || !nomLot) {
    return NextResponse.json(
      { success: false, error: "Champs requis : utilisateur, routeur, profil et nom du lot" },
      { status: 400 }
    );
  }

  const quantiteNum = Math.min(Math.max(parseInt(quantite, 10), 5), 500);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Charge action cost in StarCoins
    const charge = await chargeUserForAction(client, parseInt(userId, 10), "generate_batch");
    if (!charge.success) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
    }

    // Fetch profile details
    const profRes = await client.query(
      `SELECT nom_profil, vitesse_upload, vitesse_download, limite_temps, duree_validite, prix_sc, prix_cfa FROM user_profiles WHERE id = $1`,
      [profileId]
    );

    if (profRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Profil introuvable" }, { status: 404 });
    }

    const profile = profRes.rows[0];
    const vitesseStr = `${profile.vitesse_upload}/${profile.vitesse_download}`;
    // Parité officielle : 50 FCFA = 1 SC → 1 SC = 50 CFA
    const sc = parseFloat(String(profile.prix_sc || 2));
    const cfa = profile.prix_cfa ? parseFloat(String(profile.prix_cfa)) : sc * CFA_PER_SC;

    // 1. Create Batch record
    const finalLogo = (logoTicket && logoTicket.trim()) ? logoTicket.trim() : "STARMAJ WIFI";
    const batchRes = await client.query(
      `INSERT INTO ticket_batches (user_id, router_id, profile_id, nom_lot, quantite, template_design, logo_ticket)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom_lot, quantite, logo_ticket, date_creation`,
      [userId, routerId, profileId, nomLot, quantiteNum, templateDesign, finalLogo]
    );

    const batchId = batchRes.rows[0].id;
    const routerosAddCommands: string[] = [];
    const valuesParts: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    for (let i = 0; i < quantiteNum; i++) {
      const uniqueCode = `${prefixe}-${generateTicketCode(codeLongueur)}`;
      const pwd = avecMotDePasse ? generatePassword(4) : uniqueCode;

      valuesParts.push(
        `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, true, false, true)`
      );
      params.push(
        batchId,
        routerId,
        userId,
        uniqueCode,
        pwd,
        vitesseStr,
        profile.limite_temps,
        cfa,
        sc,
        finalLogo
      );

      routerosAddCommands.push(
        `/ip hotspot user add name="${uniqueCode}" password="${pwd}" profile="${profile.nom_profil}" comment="Lot:${batchId} - StarMaj";`
      );
    }

    // Insert tickets in bulk
    const insertTicketsQuery = `
      INSERT INTO wifi_tickets 
      (batch_id, router_id, user_id, code_ticket, mot_de_passe, profil_vitesse, duree_validite, prix_cfa, prix_sc, logo_ticket, est_actif, est_utilise, roaming_enabled)
      VALUES ${valuesParts.join(", ")}
      ON CONFLICT (code_ticket) DO NOTHING;
    `;
    await client.query(insertTicketsQuery, params);

    // Queue RouterOS commands in router's script_pending so they're pushed at next /tool fetch!
    const queuedScript = routerosAddCommands.slice(0, 100).join("\n");
    await client.query(
      `UPDATE routers 
       SET script_pending = COALESCE(script_pending, '') || E'\\n' || $1 
       WHERE id = $2`,
      [queuedScript, routerId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Lot '${nomLot}' de ${quantiteNum} tickets généré avec succès !`,
      batchId,
      quantite: quantiteNum,
      profile: profile.nom_profil,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
