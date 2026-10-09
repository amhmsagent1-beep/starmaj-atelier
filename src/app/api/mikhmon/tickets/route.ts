import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const batchId = url.searchParams.get("batchId");
  const routerId = url.searchParams.get("routerId");
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");

  const client = await pool.connect();
  try {
    let query = `
      SELECT t.*, r.nom_routeur, b.nom_lot, b.template_design
      FROM wifi_tickets t
      LEFT JOIN routers r ON r.id = t.router_id
      LEFT JOIN ticket_batches b ON b.id = t.batch_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (userId) {
      params.push(parseInt(userId, 10));
      conditions.push(`t.user_id = $${params.length}`);
    }

    if (batchId) {
      params.push(parseInt(batchId, 10));
      conditions.push(`t.batch_id = $${params.length}`);
    }

    if (routerId) {
      params.push(parseInt(routerId, 10));
      conditions.push(`t.router_id = $${params.length}`);
    }

    if (status === "actifs") {
      conditions.push(`t.est_actif = true AND t.est_utilise = false`);
    } else if (status === "utilises") {
      conditions.push(`t.est_utilise = true`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(t.code_ticket ILIKE $${params.length} OR t.session_active_mac ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY t.date_creation DESC LIMIT 300`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, tickets: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * POST /api/mikhmon/tickets
 * CONSOMMATION & SUPPRESSION AUTOMATIQUE (SERVEUR + ROUTEUR)
 * Règle StarMaj : Dès qu'un ticket est consommé :
 * 1. Enregistre la vente dans 'transactions' pour sauvegarder le chiffre d'affaires.
 * 2. Supprime DIRECTEMENT le ticket de la base du serveur (wifi_tickets).
 * 3. Envoie l'ordre de suppression immédiate au routeur (/ip hotspot user remove).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { codeTicket, deviceMac, targetRouterId, action } = body;

  if (!codeTicket) {
    return NextResponse.json({ success: false, error: "Code ticket requis" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ticketRes = await client.query(
      `SELECT t.*, r.roaming_zone_id, r.nom_routeur 
       FROM wifi_tickets t 
       LEFT JOIN routers r ON r.id = t.router_id 
       WHERE t.code_ticket = $1 FOR UPDATE OF t`,
      [codeTicket]
    );

    if (ticketRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Ticket introuvable, déjà consommé et supprimé ou invalide." },
        { status: 404 }
      );
    }

    const ticket = ticketRes.rows[0];

    if (!ticket.est_actif) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Ce coupon est désactivé." }, { status: 403 });
    }

    const incomingMac = deviceMac || "C4:B3:01:88:22:FE";
    if (ticket.session_active_mac && ticket.session_active_mac !== incomingMac) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          success: false,
          error: `[ANTI-FRAUDE STRICTE] Ce ticket est déjà verrouillé sur l'appareil MAC : ${ticket.session_active_mac}. Un seul appareil simultané autorisé.`,
          antiFraudBlocked: true,
        },
        { status: 409 }
      );
    }

    let roamingAllowed = true;
    if (targetRouterId && parseInt(targetRouterId, 10) !== ticket.router_id) {
      const targetRouterRes = await client.query(
        "SELECT roaming_zone_id, nom_routeur FROM routers WHERE id = $1",
        [targetRouterId]
      );
      if (targetRouterRes.rows.length > 0) {
        const targetR = targetRouterRes.rows[0];
        if (!ticket.roaming_zone_id || ticket.roaming_zone_id !== targetR.roaming_zone_id) {
          roamingAllowed = false;
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              success: false,
              error: `[ROAMING REFUSÉ] Ce ticket appartient au routeur '${ticket.nom_routeur}' et n'est pas autorisé sur '${targetR.nom_routeur}'.`,
            },
            { status: 403 }
          );
        }
      }
    }

    // Calcul montants
    const sc = parseFloat(String(ticket.prix_sc || 2));
    const cfa = ticket.prix_cfa ? parseFloat(String(ticket.prix_cfa)) : sc * 50;

    // 1. Sauvegarder la vente dans 'transactions' pour la comptabilité permanente
    await client.query(
      `INSERT INTO transactions 
       (user_id, type, montant_sc, montant_cfa, methode_paiement, reference_manuelle, commentaire_admin, statut, date_traitement)
       VALUES ($1, 'vente_ticket', $2, $3, 'Coupon Hotspot', $4, $5, 'valide', NOW())`,
      [
        ticket.user_id,
        sc,
        cfa,
        ticket.code_ticket,
        `Vente coupon ${ticket.code_ticket} (${ticket.profil_vitesse}) - Consommé et supprimé`,
      ]
    );

    // 2. SUPPRESSION DIRECTE DU SERVEUR
    await client.query("DELETE FROM wifi_tickets WHERE id = $1", [ticket.id]);

    // 3. SUPPRESSION DIRECTE DU ROUTEUR MIKROTIK (En file de déploiement en RAM)
    if (ticket.router_id) {
      const routerDeleteCmd = `
# SUPPRESSION DIRECTE DU TICKET CONSOMMÉ : ${ticket.code_ticket}
/ip hotspot user remove [find name="${ticket.code_ticket}"];
/ip hotspot active remove [find user="${ticket.code_ticket}"];
/ip hotspot cookie remove [find user="${ticket.code_ticket}"];
:log info "[StarMaj Cloud] Ticket ${ticket.code_ticket} consomme : supprime de la RAM du routeur.";
`;
      await client.query(
        `UPDATE routers 
         SET script_pending = COALESCE(script_pending, '') || E'\\n' || $1 
         WHERE id = $2`,
        [routerDeleteCmd, ticket.router_id]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      codeTicket: ticket.code_ticket,
      profil: ticket.profil_vitesse,
      prixCfa: cfa,
      prixSc: sc,
      message: `✅ Ticket ${ticket.code_ticket} consommé ! Supprimé directement du serveur et du routeur MikroTik.`,
      actionEffectuee: "suppression_serveur_et_routeur",
      statutServeur: "Ticket retire de wifi_tickets",
      statutRouteur: "Ordre /ip hotspot user remove execute",
      statutComptable: `Vente de ${cfa} CFA (${sc} SC) enregistree en transactions`,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// Modify ticket (Code, Password, Price, Validity, Active status, Unbind MAC)
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, codeTicket, motDePasse, profilVitesse, dureeValidite, prixCfa, prixSc, estActif, resetMac, consumeAndDelete } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID du ticket requis" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query("SELECT * FROM wifi_tickets WHERE id = $1 FOR UPDATE", [id]);
    if (tRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Ticket introuvable ou déjà supprimé." }, { status: 404 });
    }
    const ticket = tRes.rows[0];

    // If explicit consume and delete requested from dashboard UI:
    if (consumeAndDelete === true) {
      const sc = parseFloat(String(ticket.prix_sc || 2));
      const cfa = ticket.prix_cfa ? parseFloat(String(ticket.prix_cfa)) : sc * 50;

      // 1. Record sale in transactions
      await client.query(
        `INSERT INTO transactions 
         (user_id, type, montant_sc, montant_cfa, methode_paiement, reference_manuelle, commentaire_admin, statut, date_traitement)
         VALUES ($1, 'vente_ticket', $2, $3, 'Coupon Hotspot', $4, $5, 'valide', NOW())`,
        [ticket.user_id, sc, cfa, ticket.code_ticket, `Coupon ${ticket.code_ticket} consommé et supprimé manuellement`]
      );

      // 2. Delete from server
      await client.query("DELETE FROM wifi_tickets WHERE id = $1", [ticket.id]);

      // 3. Queue removal from router
      if (ticket.router_id) {
        await client.query(
          `UPDATE routers SET script_pending = COALESCE(script_pending, '') || E'\\n/ip hotspot user remove [find name="${ticket.code_ticket}"];' WHERE id = $1`,
          [ticket.router_id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: `Ticket ${ticket.code_ticket} consommé : supprimé directement du serveur et du routeur !`,
        deleted: true,
      });
    }

    const cfa = prixCfa ? parseFloat(prixCfa) : (prixSc ? parseFloat(prixSc) * 50 : undefined);
    const sc = prixSc ? parseFloat(prixSc) : (prixCfa ? parseFloat(prixCfa) / 50 : undefined);

    let query = `UPDATE wifi_tickets SET `;
    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (codeTicket !== undefined) {
      updates.push(`code_ticket = $${pIdx++}`);
      params.push(codeTicket);
    }
    if (motDePasse !== undefined) {
      updates.push(`mot_de_passe = $${pIdx++}`);
      params.push(motDePasse);
    }
    if (profilVitesse !== undefined) {
      updates.push(`profil_vitesse = $${pIdx++}`);
      params.push(profilVitesse);
    }
    if (dureeValidite !== undefined) {
      updates.push(`duree_validite = $${pIdx++}`);
      params.push(dureeValidite);
    }
    if (cfa !== undefined) {
      updates.push(`prix_cfa = $${pIdx++}`);
      params.push(cfa);
    }
    if (sc !== undefined) {
      updates.push(`prix_sc = $${pIdx++}`);
      params.push(sc);
    }
    if (estActif !== undefined) {
      updates.push(`est_actif = $${pIdx++}`);
      params.push(estActif);
    }
    if (resetMac === true) {
      updates.push(`session_active_mac = NULL`);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: true, message: "Aucune modification demandée." });
    }

    query += updates.join(", ") + ` WHERE id = $${pIdx} RETURNING *`;
    params.push(id);

    const result = await client.query(query, params);
    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      ticket: result.rows[0],
      message: resetMac ? "Ticket mis à jour et verrouillage MAC réinitialisé !" : "Ticket mis à jour avec succès.",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// Delete ticket directly from server and router
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query("DELETE FROM wifi_tickets WHERE id = $1 RETURNING router_id, code_ticket", [id]);
    if (res.rows.length > 0 && res.rows[0].router_id) {
      const rId = res.rows[0].router_id;
      const code = res.rows[0].code_ticket;
      await client.query(
        `UPDATE routers SET script_pending = COALESCE(script_pending, '') || E'\\n/ip hotspot user remove [find name="${code}"];\\n/ip hotspot active remove [find user="${code}"];' WHERE id = $1`,
        [rId]
      );
    }
    return NextResponse.json({ success: true, message: "Coupon supprimé directement du serveur et du routeur !" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
