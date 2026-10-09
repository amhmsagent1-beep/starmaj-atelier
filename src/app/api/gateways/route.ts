import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM payment_gateways ORDER BY id ASC`
    );
    return NextResponse.json({ success: true, gateways: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/gateways
 * Strictly guarded: requires ADMIN role verified in PostgreSQL database.
 * Prevents non-admin users from tampering with payment gateway receiving numbers (Airtel, Moov, Wave, etc.)
 */
export async function PATCH(request: NextRequest) {
  // 1. Strict server-side check: decode token & verify ADMIN role in DB
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }
  const adminUser = auth.user;

  const body = await request.json();
  const { id, numeroTelephoneDefaut, nomBeneficiaire, instructions, statut, fraisPourcentage } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID passerelle requis" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE payment_gateways 
       SET numero_telephone_defaut = COALESCE($1, numero_telephone_defaut),
           nom_beneficiaire = COALESCE($2, nom_beneficiaire),
           instructions = COALESCE($3, instructions),
           statut = COALESCE($4, statut),
           frais_pourcentage = COALESCE($5, frais_pourcentage),
           mis_a_jour_a = NOW()
       WHERE id = $6
       RETURNING *`,
      [numeroTelephoneDefaut, nomBeneficiaire, instructions, statut, fraisPourcentage, id]
    );

    return NextResponse.json({
      success: true,
      gateway: result.rows[0],
      modifiePar: adminUser.nom,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
