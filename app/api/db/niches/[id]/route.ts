import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const row = await queryOne(`
      SELECT niche_id, niche_title AS title, category, status, top_search_term,
        reference_image AS image, search_volume_360 AS search_volume,
        ROUND(search_volume_growth_360, 2) AS growth_pct,
        ROUND(avg_price, 2) AS avg_price,
        ROUND(minimum_price, 2) AS min_price,
        ROUND(maximum_price, 2) AS max_price,
        min_units_sold_360 AS min_units_360,
        max_units_sold_360 AS max_units_360,
        ROUND(return_rate_360 * 100, 3) AS return_rate,
        product_count_360 AS product_count,
        brand_count_360 AS brand_count,
        successful_launch_360_360 AS successful_launch,
        new_product_launch_360_360 AS new_launch,
        ROUND(search_conversion_rate_7 * 100, 3) AS conv_rate_7
      FROM niche_summaries WHERE niche_id = ?
    `, [ctx.params.id]);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
