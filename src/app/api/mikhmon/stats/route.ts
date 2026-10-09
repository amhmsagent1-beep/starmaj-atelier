import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

// Parité officielle StarMaj : 50 Francs CFA = 1 StarCoin (SC)
const CFA_PER_SC = 50;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  const client = await pool.connect();
  try {
    let whereUserTx = "";
    let whereUserTickets = "";
    const params: any[] = [];
    if (userId) {
      whereUserTx = " AND user_id = $1";
      whereUserTickets = " AND user_id = $1";
      params.push(parseInt(userId, 10));
    }

    // Daily consumed tickets & sales (tracked from transactions and consumed tickets)
    const dayRes = await client.query(
      `SELECT COALESCE(SUM(montant_sc), 0) as total_sc, 
              COALESCE(SUM(montant_cfa), 0) as total_cfa, 
              COUNT(id) as count_tickets
       FROM transactions
       WHERE type = 'vente_ticket' AND date_transaction >= CURRENT_DATE` + whereUserTx,
      params
    );

    // Weekly sales
    const weekRes = await client.query(
      `SELECT COALESCE(SUM(montant_sc), 0) as total_sc, 
              COALESCE(SUM(montant_cfa), 0) as total_cfa, 
              COUNT(id) as count_tickets
       FROM transactions
       WHERE type = 'vente_ticket' AND date_transaction >= NOW() - INTERVAL '7 days'` + whereUserTx,
      params
    );

    // Monthly sales
    const monthRes = await client.query(
      `SELECT COALESCE(SUM(montant_sc), 0) as total_sc, 
              COALESCE(SUM(montant_cfa), 0) as total_cfa, 
              COUNT(id) as count_tickets
       FROM transactions
       WHERE type = 'vente_ticket' AND date_transaction >= NOW() - INTERVAL '30 days'` + whereUserTx,
      params
    );

    // Tickets currently in stock (unused, waiting on server)
    const stockRes = await client.query(
      `SELECT COUNT(id) as count_stock FROM wifi_tickets WHERE est_utilise = false AND est_actif = true` + whereUserTickets,
      params
    );

    // Active MAC sessions
    const activeMacRes = await client.query(
      `SELECT COUNT(id) as count_active FROM wifi_tickets WHERE session_active_mac IS NOT NULL AND est_actif = true` + whereUserTickets,
      params
    );

    // Total tickets consumed all-time
    const totalConsumedRes = await client.query(
      `SELECT COUNT(id)::int as count_consumed FROM transactions WHERE type = 'vente_ticket'` + whereUserTx,
      params
    );
    const totalConsumed = totalConsumedRes.rows[0]?.count_consumed || 0;

    // Total tickets in database currently + total consumed
    const totalStockRes = await client.query(
      `SELECT COUNT(id)::int as count_tickets FROM wifi_tickets WHERE 1=1` + whereUserTickets,
      params
    );
    const totalGenerated = (totalStockRes.rows[0]?.count_tickets || 0) + totalConsumed;
    const isFreeTier = totalGenerated < 500;
    const freeRemaining = Math.max(0, 500 - totalGenerated);

    // Parité officielle : 50 FCFA = 1 SC → 1 SC = 50 CFA
    const daySc = parseFloat(dayRes.rows[0].total_sc);
    const weekSc = parseFloat(weekRes.rows[0].total_sc);
    const monthSc = parseFloat(monthRes.rows[0].total_sc);

    return NextResponse.json({
      success: true,
      stats: {
        quota: {
          total_generes: totalGenerated,
          est_gratuit: isFreeTier,
          tickets_gratuits_restants: freeRemaining,
          seuil_gratuit: 500,
        },
        jour: {
          chiffre_affaires_sc: daySc,
          chiffre_affaires_cfa: parseFloat(dayRes.rows[0].total_cfa) || daySc * CFA_PER_SC,
          tickets_vendus: parseInt(dayRes.rows[0].count_tickets, 10),
        },
        semaine: {
          chiffre_affaires_sc: weekSc,
          chiffre_affaires_cfa: parseFloat(weekRes.rows[0].total_cfa) || weekSc * CFA_PER_SC,
          tickets_vendus: parseInt(weekRes.rows[0].count_tickets, 10),
        },
        mois: {
          chiffre_affaires_sc: monthSc,
          chiffre_affaires_cfa: parseFloat(monthRes.rows[0].total_cfa) || monthSc * CFA_PER_SC,
          tickets_vendus: parseInt(monthRes.rows[0].count_tickets, 10),
        },
        stock_disponible: parseInt(stockRes.rows[0].count_stock, 10),
        sessions_actives: parseInt(activeMacRes.rows[0].count_active, 10),
        total_tickets_consommes: totalConsumed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
