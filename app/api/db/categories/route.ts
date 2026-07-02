import { NextResponse } from "next/server";
import { query } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(`
      SELECT category, COUNT(*) AS count,
        AVG(search_volume_growth_360) AS avg_growth,
        SUM(search_volume_360) AS total_volume
      FROM niche_summaries
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 200
    `);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
