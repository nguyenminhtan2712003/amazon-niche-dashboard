import { NextResponse } from "next/server";
import { query } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await query("SELECT table_name FROM information_schema.tables");
    const hasAsins = tables.some(t => t.table_name === "niche_asins");
    const niches = await query("SELECT COUNT(*) AS n FROM niche_summaries");
    const cats = await query("SELECT COUNT(DISTINCT category) AS n FROM niche_summaries WHERE category IS NOT NULL");
    let asinStats: any = { asins: null, brands: null };
    if (hasAsins) {
      const [a] = await query("SELECT COUNT(*) AS n FROM niche_asins");
      const [b] = await query("SELECT COUNT(DISTINCT brand) AS n FROM niche_asins WHERE brand IS NOT NULL");
      asinStats = { asins: a.n, brands: b.n };
    }
    return NextResponse.json({
      niches: niches[0].n,
      categories: cats[0].n,
      ...asinStats,
      asins_table_loaded: hasAsins,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
