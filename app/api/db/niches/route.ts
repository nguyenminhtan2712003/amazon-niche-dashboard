import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

const SORT_COLS = new Set([
  "search_volume_360", "search_volume_growth_360",
  "avg_price", "max_units_sold_360", "product_count_360",
  "return_rate_360", "search_conversion_rate_7",
]);

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get("category") || "all";
    const status = sp.get("status") || "all";
    const minVolume = parseInt(sp.get("min_volume") || "0", 10);
    const sort = sp.get("sort") || "search_volume_360";
    const dir = (sp.get("direction") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const q = sp.get("q") || "";
    const limit = Math.min(parseInt(sp.get("limit") || "100", 10), 2000);
    const offset = parseInt(sp.get("offset") || "0", 10);

    const sortCol = SORT_COLS.has(sort) ? sort : "search_volume_360";

    const where: string[] = ["search_volume_360 >= ?"];
    const args: any[] = [minVolume];
    if (category !== "all") { where.push("category = ?"); args.push(category); }
    if (status !== "all") { where.push("status = ?"); args.push(status); }
    if (q) {
      const w = `%${q}%`;
      where.push("(niche_title ILIKE ? OR top_search_term ILIKE ? OR category ILIKE ?)");
      args.push(w, w, w);
    }
    const whereSql = where.join(" AND ");

    const items = await query(`
      SELECT
        niche_id, niche_title AS title, category, status, top_search_term,
        reference_image AS image,
        search_volume_360 AS search_volume,
        ROUND(search_volume_growth_360, 2) AS growth_pct,
        ROUND(avg_price, 2) AS avg_price,
        ROUND(minimum_price, 2) AS min_price,
        ROUND(maximum_price, 2) AS max_price,
        ROUND(return_rate_360 * 100, 3) AS return_rate,
        product_count_360 AS product_count,
        brand_count_360 AS brand_count,
        ROUND(search_conversion_rate_7 * 100, 3) AS conv_rate_7
      FROM niche_summaries
      WHERE ${whereSql}
      ORDER BY ${sortCol} ${dir} NULLS LAST
      LIMIT ? OFFSET ?
    `, [...args, limit, offset]);

    const [{ total }] = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM niche_summaries WHERE ${whereSql}`,
      args,
    );
    return NextResponse.json({ total, items, limit, offset });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
