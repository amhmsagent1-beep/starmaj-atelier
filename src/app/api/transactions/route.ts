import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAdmin, authenticateUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get("userId");
  const wantsAdminView = url.searchParams.get("isAdmin") === "true";
  const statusFilter = url.searchParams.get("status");

  // Verify session user from token / cookie
  const sessionUser = await authenticateUser(request);

  const client = await pool.connect();
  try {
    let query = `
      SELECT t.*, u.nom as user_nom, u.email as user_email, u.telephone as user_phone,
             v.nom as validateur_nom
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN users v ON v.id = t.valide_par
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    // Security enforcement: if requesting admin view or all transactions,
    // verify in database that the user is actually an ADMIN!
    if (wantsAdminView) {
      if (!sessionUser || sessionUser.role !== "admin") {
        // Not a verified admin in database: restrict strictly to their own transactions
        if (sessionUser) {
          params.push(sessionUser.id);
          conditions.push(`t.user_id = $${params.length}`);
        } else {
          return NextResponse.json(
            { success: false, error: "Accès refusé. Rôle ADMIN requis." },
            { status: 403 }
          );
        }
      }
    } else {
      // Normal user query: force to session user ID or requested ID if permitted
      const targetUserId = sessionUser
        ? sessionUser.role === "admin" && requestedUserId
          ? parseInt(requestedUserId, 10)
          : sessionUser.id
        : requestedUserId
        ? parseInt(requestedUserId, 10)
        : null;

      if (targetUserId) {
        params.push(targetUserId);
        conditions.push(`t.user_id = $${params.length}`);
      }
    }

    if (statusFilter && statusFilter !== "tous") {
      params.push(statusFilter);
      conditions.push(`t.statut = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY t.date_transaction DESC`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, transactions: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, type, montantCfa, methodePaiement, numeroExpediteur, referenceManuelle, captureEcranUrl } = body;

  // Authenticate session user if present
  const sessionUser = await authenticateUser(request);
  const actualUserId = sessionUser ? sessionUser.id : (userId ? parseInt(userId, 10) : null);

  if (!actualUserId || !montantCfa || !methodePaiement) {
    return NextResponse.json({ success: false, error: "Données de paiement incomplètes" }, { status: 400 });
  }

  // PARITÉ OFFICIELLE : 50 Francs CFA = 1 SC (StarCoin)
  const cfaNum = parseFloat(montantCfa);
  const montantSc = parseFloat((cfaNum / 50).toFixed(2));

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, type, montant_sc, montant_cfa, methode_paiement, numero_expediteur, reference_manuelle, capture_ecran_url, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente')
       RETURNING *`,
      [
        actualUserId,
        type || "depot",
        montantSc,
        cfaNum,
        methodePaiement,
        numeroExpediteur || (sessionUser ? sessionUser.telephone : null),
        referenceManuelle || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        captureEcranUrl || null,
      ]
    );

    return NextResponse.json({ success: true, transaction: result.rows[0], montantSc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/transactions
 * Strictly guarded: requires ADMIN role verified in PostgreSQL database.
 * Prevents privilege escalation and client-side impersonation.
 */
export async function PATCH(request: NextRequest) {
  // 1. Strict server-side check: decode token & verify ADMIN role in DB
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }
  const adminUser = auth.user;

  const body = await request.json();
  const { transactionId, decision, commentaireAdmin } = body;

  if (!transactionId || !decision) {
    return NextResponse.json(
      { success: false, error: "ID transaction et décision requis" },
      { status: 400 }
    );
  }

  if (decision !== "valide" && decision !== "rejete") {
    return NextResponse.json(
      { success: false, error: "Décision invalide (valide ou rejete)" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch existing transaction with row-level lock
    const txRes = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [transactionId]
    );
    if (txRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Transaction non trouvée" }, { status: 404 });
    }

    const tx = txRes.rows[0];
    if (tx.statut !== "en_attente") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Cette transaction a déjà été traitée." },
        { status: 400 }
      );
    }

    // Update transaction using verified admin ID from database session
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

    // If validated and type is depot, credit user's StarCoin balance in DB
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
          ? `Dépôt de ${tx.montant_cfa} CFA (= ${tx.montant_sc} SC) validé et crédité par ${adminUser.nom} !`
          : "Dépôt rejeté par l'administrateur.",
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
