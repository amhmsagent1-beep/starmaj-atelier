import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/action-pricing
 * Public list of action costs in StarCoins & Francs CFA.
 */
export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id, code_action, nom_action, description, categorie, prix_sc, prix_cfa, actif, mis_a_jour_a FROM action_pricing ORDER BY id ASC"
    );
    return NextResponse.json({ success: true, pricing: res.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/action-pricing
 * Allows administrator to modify every single action price one by one!
 * Strictly guarded: requires verified ADMIN role in PostgreSQL.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }
  const adminUser = auth.user;

  const body = await request.json();
  const { id, codeAction, prixSc, prixCfa, nomAction, description, actif } = body;

  if (!id && !codeAction) {
    return NextResponse.json(
      { success: false, error: "ID ou code action requis." },
      { status: 400 }
    );
  }

  // Calculate matching currency if one is passed (Parité: 50 CFA = 1 SC)
  let scVal: number | undefined = prixSc !== undefined ? parseFloat(prixSc) : undefined;
  let cfaVal: number | undefined = prixCfa !== undefined ? parseFloat(prixCfa) : undefined;

  if (scVal !== undefined && cfaVal === undefined) {
    cfaVal = scVal * 50;
  } else if (cfaVal !== undefined && scVal === undefined) {
    scVal = parseFloat((cfaVal / 50).toFixed(2));
  }

  const client = await pool.connect();
  try {
    let query = `UPDATE action_pricing SET `;
    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (scVal !== undefined) {
      updates.push(`prix_sc = $${pIdx++}`);
      params.push(scVal);
    }
    if (cfaVal !== undefined) {
      updates.push(`prix_cfa = $${pIdx++}`);
      params.push(cfaVal);
    }
    if (nomAction !== undefined) {
      updates.push(`nom_action = $${pIdx++}`);
      params.push(nomAction);
    }
    if (description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      params.push(description);
    }
    if (actif !== undefined) {
      updates.push(`actif = $${pIdx++}`);
      params.push(actif);
    }

    updates.push(`mis_a_jour_a = NOW()`);

    if (id) {
      query += updates.join(", ") + ` WHERE id = $${pIdx} RETURNING *`;
      params.push(id);
    } else {
      query += updates.join(", ") + ` WHERE code_action = $${pIdx} RETURNING *`;
      params.push(codeAction);
    }

    const res = await client.query(query, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Action introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Tarif pour "${res.rows[0].nom_action}" mis à jour avec succès : ${res.rows[0].prix_sc} SC (= ${res.rows[0].prix_cfa} CFA).`,
      action: res.rows[0],
      modifiePar: adminUser.nom,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
