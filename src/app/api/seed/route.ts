import { NextResponse } from "next/server";
import { seedDatabase } from "@/db/seed";

export async function GET() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true, message: "Database checked/seeded." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
