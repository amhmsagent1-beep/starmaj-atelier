import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  const client = await pool.connect();
  try {
    let query = `
      SELECT z.*, 
             (SELECT COUNT(*) FROM routers r WHERE r.roaming_zone_id = z.id) as routers_count
      FROM roaming_zones z
    `;
    const params: any[] = [];
    if (userId) {
      query += ` WHERE z.user_id = $1`;
      params.push(parseInt(userId, 10));
    }
    query += ` ORDER BY z.id ASC`;

    const result = await client.query(query, params);
    return NextResponse.json({ success: true, zones: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, nomZone, description } = body;

  if (!userId || !nomZone) {
    return NextResponse.json({ success: false, error: "Nom de zone et utilisateur requis" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO roaming_zones (user_id, nom_zone, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, nomZone, description || null]
    );

    return NextResponse.json({ success: true, zone: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
