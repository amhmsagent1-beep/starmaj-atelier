import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/validation
 * Validates or rejects a deposit transaction.
 * Strictly guarded: decodes session JWT and verifies in PostgreSQL that the user has role 'admin'.
 * Returns 403 Forbidden if the user is not an admin in the database.
 */
export async function POST(request: NextRequest) {
  // 1. Strict server-side check: decode token & verify ADMIN role in DB
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }
  const adminUser = auth.user;

  // 2. Parse body
  const body = await request.json();
  const { transactionId, decision, commentaireAdmin } = body;

  if (!transactionId || !decision) {
    return NextResponse.json(
      { success: false, error: "ID de transaction et décision requis." },
      { status: 400 }
    );
  }

  if (decision !== "valide" && decision !== "rejete") {
    return NextResponse.json(
      { success: false, error: "Décision invalide. Valeurs permises : 'valide' ou 'rejete'." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch transaction with row-level lock
    const txRes = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [transactionId]
    );

    if (txRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Transaction introuvable." },
        { status: 404 }
      );
    }

    const tx = txRes.rows[0];
    if (tx.statut !== "en_attente") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Cette transaction a déjà été traitée." },
        { status: 400 }
      );
    }

    // Update transaction using authenticated admin's ID (NEVER trust client-provided IDs)
    await client.query(
      `UPDATE transactions 
       SET statut = $1, 
           valide_par = $2, 
           commentaire_admin = $3, 
           date_traitement = NOW() 
       WHERE id = $4`,
      [
        decision,
        adminUser.id,
        commentaireAdmin || (decision === "valide" ? "Validé par administrateur certifié" : "Rejeté par administrateur"),
        transactionId,
      ]
    );

    // If validated and type is depot, credit user's StarCoin balance in PostgreSQL
    if (decision === "valide" && tx.type === "depot") {
      await client.query(
        `UPDATE users 
         SET solde_starcoin = solde_starcoin + $1 
         WHERE id = $2`,
        [tx.montant_sc, tx.user_id]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message:
        decision === "valide"
          ? `Dépôt de ${tx.montant_cfa} CFA (= ${tx.montant_sc} SC) validé avec succès par ${adminUser.nom}.`
          : "Transaction rejetée.",
      validateur: adminUser.nom,
      statut: decision,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
