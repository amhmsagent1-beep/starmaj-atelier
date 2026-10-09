import { PoolClient } from "pg";
import { pool } from "@/db";

export interface ActionCost {
  codeAction: string;
  nomAction: string;
  prixSc: number;
  prixCfa: number;
}

/**
 * Fetch the current price for a specific action from PostgreSQL.
 */
export async function getActionPrice(codeAction: string): Promise<ActionCost> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT code_action, nom_action, prix_sc, prix_cfa FROM action_pricing WHERE code_action = $1 AND actif = true",
      [codeAction]
    );

    if (res.rows.length === 0) {
      return {
        codeAction,
        nomAction: codeAction,
        prixSc: 5.0,
        prixCfa: 250.0,
      };
    }

    const row = res.rows[0];
    return {
      codeAction: row.code_action,
      nomAction: row.nom_action,
      prixSc: parseFloat(row.prix_sc),
      prixCfa: parseFloat(row.prix_cfa),
    };
  } finally {
    client.release();
  }
}

/**
 * Check if the user has reached the 500 free ticket threshold.
 * Règle StarMaj : Le client ne paie RIEN pour la génération jusqu'à 500 tickets.
 * Dès qu'il atteint 500 tickets générés au total, la génération devient payante en StarCoins.
 */
export async function getUserTicketQuota(userId: number): Promise<{
  totalTicketsGenerated: number;
  isFreeTier: boolean;
  freeRemaining: number;
}> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT COUNT(*)::int as count FROM wifi_tickets WHERE user_id = $1",
      [userId]
    );
    const count = res.rows[0]?.count || 0;
    const isFreeTier = count < 500;
    const freeRemaining = Math.max(0, 500 - count);
    return { totalTicketsGenerated: count, isFreeTier, freeRemaining };
  } finally {
    client.release();
  }
}

/**
 * Verify and charge user's StarCoin balance for an action.
 * - If user is ADMIN: actions are completely free (super-user).
 * - For 'generate_batch': 100% GRATUIT tant que le client a généré moins de 500 tickets au total !
 *   Dès qu'il atteint 500 tickets, l'action est débitée en StarCoins selon le tarif en base.
 */
export async function chargeUserForAction(
  client: PoolClient,
  userId: number,
  codeAction: string,
  userRole?: string
): Promise<{
  success: boolean;
  error?: string;
  prixSc: number;
  nouveauSolde?: number;
  isFreeExemption?: boolean;
}> {
  // 1. If role is admin, actions are free
  if (userRole === "admin") {
    return { success: true, prixSc: 0, isFreeExemption: true };
  }

  // 2. Double-check real role in database to prevent client-side tampering
  const userRes = await client.query(
    "SELECT id, role, solde_starcoin FROM users WHERE id = $1 FOR UPDATE",
    [userId]
  );

  if (userRes.rows.length === 0) {
    return { success: false, error: "Utilisateur non trouvé en base de données.", prixSc: 0 };
  }

  const dbUser = userRes.rows[0];
  if (dbUser.role === "admin") {
    return { success: true, prixSc: 0, isFreeExemption: true };
  }

  // 3. Règle spéciale pour la génération de lots : GRATUIT jusqu'à 500 tickets !
  if (codeAction === "generate_batch") {
    const countRes = await client.query(
      "SELECT COUNT(*)::int as count FROM wifi_tickets WHERE user_id = $1",
      [userId]
    );
    const totalGenerated = countRes.rows[0]?.count || 0;

    if (totalGenerated < 500) {
      // Exemption de paiement : le client est encore dans son quota gratuit de 500 tickets
      return {
        success: true,
        prixSc: 0,
        isFreeExemption: true,
        nouveauSolde: parseFloat(dbUser.solde_starcoin),
      };
    }
  }

  // 4. Récupérer le tarif de l'action
  const priceRes = await client.query(
    "SELECT code_action, nom_action, prix_sc, prix_cfa FROM action_pricing WHERE code_action = $1 AND actif = true",
    [codeAction]
  );

  let prixSc = 5.0;
  let prixCfa = 250.0;
  let nomAction = codeAction;

  if (priceRes.rows.length > 0) {
    prixSc = parseFloat(priceRes.rows[0].prix_sc);
    prixCfa = parseFloat(priceRes.rows[0].prix_cfa);
    nomAction = priceRes.rows[0].nom_action;
  }

  const currentSolde = parseFloat(dbUser.solde_starcoin);

  if (currentSolde < prixSc) {
    return {
      success: false,
      error: `Solde StarCoin insuffisant (${currentSolde.toLocaleString()} SC disponibles vs ${prixSc.toLocaleString()} SC requis pour "${nomAction}"). Veuillez recharger vos StarCoins.`,
      prixSc,
    };
  }

  // Déduire les StarCoins
  const nouveauSolde = currentSolde - prixSc;
  await client.query(
    "UPDATE users SET solde_starcoin = solde_starcoin - $1 WHERE id = $2",
    [prixSc, userId]
  );

  // Enregistrer la transaction
  const ref = `ACT-${codeAction.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`;
  await client.query(
    `INSERT INTO transactions 
     (user_id, type, montant_sc, montant_cfa, methode_paiement, reference_manuelle, commentaire_admin, statut, date_traitement)
     VALUES ($1, 'achat_action', $2, $3, 'Solde StarCoin', $4, $5, 'valide', NOW())`,
    [userId, prixSc, prixCfa, ref, `Facturation action : ${nomAction}`]
  );

  return { success: true, prixSc, nouveauSolde, isFreeExemption: false };
}
