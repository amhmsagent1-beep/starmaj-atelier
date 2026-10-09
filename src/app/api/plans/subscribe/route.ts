import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

// Parité : 50 FCFA = 1 SC
const PLANS_CONFIG: Record<string, { nom: string; prixSc: number; prixCfa: number; maxRouteurs: number; maxAntennes: string; autoIaCredits: number; roamingCount: number }> = {
  wifi_basic: {
    nom: "Plan WiFi Basic",
    prixSc: 150, // 7 500 CFA / 50
    prixCfa: 7500,
    maxRouteurs: 15,
    maxAntennes: "10 équipements",
    autoIaCredits: 1,
    roamingCount: 2,
  },
  wifi_pro: {
    nom: "Plan WiFi Pro",
    prixSc: 300, // 15 000 CFA / 50
    prixCfa: 15000,
    maxRouteurs: 25,
    maxAntennes: "30 équipements",
    autoIaCredits: 3,
    roamingCount: 4,
  },
  installateur: {
    nom: "Plan Installateur",
    prixSc: 800, // 40 000 CFA / 50
    prixCfa: 40000,
    maxRouteurs: 50,
    maxAntennes: "Illimité",
    autoIaCredits: 7,
    roamingCount: 6,
  },
  aventurier: {
    nom: "Plan Aventurier",
    prixSc: 1500, // 75 000 CFA / 50
    prixCfa: 75000,
    maxRouteurs: 100,
    maxAntennes: "Illimité",
    autoIaCredits: 999,
    roamingCount: 100,
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, planCode } = body;

  if (!userId || !planCode || !PLANS_CONFIG[planCode]) {
    return NextResponse.json({ success: false, error: "Plan ou utilisateur invalide" }, { status: 400 });
  }

  const selectedPlan = PLANS_CONFIG[planCode];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const user = userRes.rows[0];
    const userBalance = parseFloat(user.solde_starcoin);

    if (userBalance < selectedPlan.prixSc) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: false,
        error: `Solde StarCoin insuffisant (${userBalance.toLocaleString()} SC disponible vs ${selectedPlan.prixSc.toLocaleString()} SC requis). Veuillez recharger votre compte.`,
        soldeActuel: userBalance,
        requis: selectedPlan.prixSc,
      }, { status: 402 });
    }

    // Deduct balance and update plan
    await client.query(
      `UPDATE users 
       SET solde_starcoin = solde_starcoin - $1,
           plan_actuel = $2,
           plan_expire_a = NOW() + INTERVAL '30 days'
       WHERE id = $3`,
      [selectedPlan.prixSc, planCode, userId]
    );

    // Create transaction log
    await client.query(
      `INSERT INTO transactions 
       (user_id, type, montant_sc, montant_cfa, methode_paiement, statut, reference_manuelle, commentaire_admin, date_traitement)
       VALUES ($1, 'achat_plan', $2, $3, 'Solde StarCoin', 'valide', $4, $5, NOW())`,
      [
        userId,
        selectedPlan.prixSc,
        selectedPlan.prixCfa,
        `SUB-${planCode.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        `Souscription automatique mensuelle : ${selectedPlan.nom}`,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Félicitations ! Vous êtes désormais abonné au ${selectedPlan.nom}. Débité : ${selectedPlan.prixSc} SC (= ${selectedPlan.prixCfa} FCFA).`,
      nouveauSolde: userBalance - selectedPlan.prixSc,
      plan: selectedPlan,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
