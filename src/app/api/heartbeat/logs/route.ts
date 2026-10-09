import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { authenticateUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const routerId = url.searchParams.get("routerId");

  const sessionUser = await authenticateUser(request);

  const client = await pool.connect();
  try {
    let query = `
      SELECT l.*, r.nom_routeur, r.identifiant_unique_token
      FROM router_heartbeat_logs l
      LEFT JOIN routers r ON r.id = l.router_id
    `;
    const params: any[] = [];

    if (sessionUser && sessionUser.role !== "admin") {
      query += ` WHERE r.user_id = $1`;
      params.push(sessionUser.id);
    }

    if (routerId) {
      query += params.length > 0 ? ` AND l.router_id = $${params.length + 1}` : ` WHERE l.router_id = $1`;
      params.push(parseInt(routerId, 10));
    }

    query += ` ORDER BY l.date_log DESC LIMIT 100`;

    const res = await client.query(query, params);
    return NextResponse.json({ success: true, logs: res.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
