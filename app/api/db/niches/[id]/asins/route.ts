import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") || "100", 10), 500);

    // Check if niche_asins table exists
    const t = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'niche_asins'");
    if (t.length === 0) {
      return NextResponse.json({ total: 0, items: [], note: "niche_asins table not loaded yet. Run import script." });
    }

    const rows = await query(`
      SELECT asin, asin_title AS title, image, brand, category,
        launch_date AS launch,
        ROUND(avg_price_360, 2) AS price,
        ROUND(customer_rating, 2) AS rating,
        total_reviews AS reviews,
        CAST(best_seller_ranking AS BIGINT) AS bsr,
        click_count_360 AS clicks,
        ROUND(click_share_360 * 100, 3) AS click_share,
        status
      FROM niche_asins
      WHERE niche_id = ?
      ORDER BY click_count_360 DESC NULLS LAST
      LIMIT ?
    `, [ctx.params.id, limit]);
    const [{ total }] = await query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM niche_asins WHERE niche_id = ?", [ctx.params.id]
    );
    return NextResponse.json({ total, items: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
