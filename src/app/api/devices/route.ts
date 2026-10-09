import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { chargeUserForAction } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  const client = await pool.connect();
  try {
    let query = `
      SELECT d.*, r.nom_routeur, r.identifiant_unique_token
      FROM third_party_devices d
      LEFT JOIN routers r ON r.id = d.router_id
    `;
    const params: any[] = [];
    if (userId) {
      query += ` WHERE d.user_id = $1`;
      params.push(parseInt(userId, 10));
    }
    query += ` ORDER BY d.id DESC`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, devices: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * POST /api/devices
 * Raccordement & Auto-Configuration d'Antennes / Points d'accès (Ubiquiti, Ruijie, Grandstream, MikroTik)
 * Déploie automatiquement les règles de bypass et d'isolation dans le routeur hôte sans manipulation manuelle !
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, routerId, marque, nomAppareil, adresseIp, adresseMac, vlanId = 10, etherPort = "ether3" } = body;

  if (!userId || !marque || !nomAppareil || !adresseIp) {
    return NextResponse.json({ success: false, error: "Marque, nom d'antenne et adresse IP requis" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Facturation de l'action si utilisateur régulier
    const charge = await chargeUserForAction(client, parseInt(userId, 10), "add_antenna");
    if (!charge.success) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: charge.error }, { status: 402 });
    }

    const result = await client.query(
      `INSERT INTO third_party_devices 
       (user_id, router_id, marque, nom_appareil, adresse_ip, adresse_mac, vlan_id, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_ligne')
       RETURNING *`,
      [
        userId,
        routerId ? parseInt(routerId, 10) : null,
        marque,
        nomAppareil,
        adresseIp,
        adresseMac || null,
        vlanId ? parseInt(vlanId, 10) : 10,
      ]
    );

    const device = result.rows[0];

    // Déploiement automatique des règles dans le routeur hôte (Zero-Touch en RAM)
    if (routerId) {
      const antennaCommands = `
# AUTO-CONFIGURATION ZERO-TOUCH ANTENNE : ${nomAppareil} (${marque})
:log info "[StarMaj Cloud] Deploiement antenne ${nomAppareil} (IP: ${adresseIp})...";
/ip hotspot ip-binding add address=${adresseIp} type=bypassed comment="Bypass Antenne ${nomAppareil} - StarMaj";
${adresseMac ? `/ip dhcp-server lease add address=${adresseIp} mac-address=${adresseMac} comment="Bail Statique ${nomAppareil}";` : ""}
/interface bridge port set [find interface=${etherPort}] horizon=1;
:log info "[StarMaj Cloud] Antenne ${nomAppareil} raccordee avec succes.";
`;
      await client.query(
        `UPDATE routers SET script_pending = COALESCE(script_pending, '') || E'\\n' || $1 WHERE id = $2`,
        [antennaCommands, routerId]
      );
    }

    await client.query("COMMIT");

    const steps = [
      `1. Enregistrement antenne ${marque} (${nomAppareil})`,
      `2. Création de la règle de Bypass Hotspot (/ip hotspot ip-binding) pour ${adresseIp}`,
      `3. Réservation DHCP statique & isolation client (horizon=1)`,
      `4. Transmission automatique au routeur hôte en RAM via /tool fetch`,
    ];

    return NextResponse.json({
      success: true,
      device,
      steps,
      message: `Antenne "${nomAppareil}" raccordée et configurée automatiquement !`,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const devRes = await client.query("SELECT * FROM third_party_devices WHERE id = $1", [id]);
    if (devRes.rows.length > 0) {
      const dev = devRes.rows[0];
      if (dev.router_id) {
        // Queue command to remove bypass rule on router
        await client.query(
          `UPDATE routers SET script_pending = COALESCE(script_pending, '') || E'\\n/ip hotspot ip-binding remove [find address="${dev.adresse_ip}"];' WHERE id = $1`,
          [dev.router_id]
        );
      }
    }

    await client.query("DELETE FROM third_party_devices WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Équipement antenne retiré avec succès." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
