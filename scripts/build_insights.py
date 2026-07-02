"""
Build insights_data.json từ niche.duckdb (203K niches).
9 góc nhìn: opportunities, brand-lite, returns, underserved, launches,
            categories, prices, profit potential, growth racers.

Usage:  python scripts/build_insights.py
"""
import duckdb, json, statistics, sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "niche.duckdb"
OUT = ROOT / "insights_data.json"

if not DB.exists():
    sys.exit(f"Missing: {DB}. Run scripts/build_duckdb.py first.")

con = duckdb.connect(str(DB), read_only=True)
print(f"Loading niches from {DB.name}...")

rows = con.execute("""
  SELECT niche_id, niche_title, category, status, reference_image,
    search_volume_360, search_volume_growth_360, avg_price,
    minimum_price, maximum_price,
    return_rate_360, product_count_360, brand_count_360,
    successful_launch_360_360, new_product_launch_360_360,
    search_conversion_rate_7
  FROM niche_summaries
""").fetchall()
cols = ["niche_id","title","category","status","image","search_volume","growth_pct",
        "avg_price","min_price","max_price","return_rate","product_count","brand_count",
        "successful_launch","new_launch","conv_rate_7"]
N = [dict(zip(cols, r)) for r in rows]
for n in N:
    n["search_volume"] = int(n["search_volume"] or 0)
    if n["return_rate"] is not None: n["return_rate"] = round(n["return_rate"]*100, 3)
    if n["conv_rate_7"] is not None: n["conv_rate_7"] = round(n["conv_rate_7"]*100, 3)
    if n["growth_pct"] is not None: n["growth_pct"] = round(n["growth_pct"], 2)

print(f"Analyzing {len(N):,} niches...")

# 1. Opportunities
def opp_score(n):
    vol = n["search_volume"]
    g = n.get("growth_pct") or 0
    p = n.get("product_count") or 1
    b = n.get("brand_count") or 1
    return (vol * max(0.5, 1+g/10)) / max(1, (p*b)**0.5)

top_opps = sorted(
    [n for n in N if n.get("product_count") and n.get("brand_count") and n["search_volume"]>1e6],
    key=opp_score, reverse=True
)[:30]

# 2. Brand-lite
brand_lite = sorted(
    [n for n in N if (n.get("brand_count") or 99)<=3 and n["search_volume"]>5e6 and (n.get("growth_pct") or 0)>5],
    key=lambda x: -x["search_volume"]
)[:30]

# 3. Returns
returns = sorted(
    [n for n in N if (n.get("return_rate") or 0)>10 and n["search_volume"]>1e6],
    key=lambda x: -(x.get("return_rate") or 0)
)[:30]

# 4. Underserved
chv = [n for n in N if (n.get("conv_rate_7") or 0)>0 and n["search_volume"]>5e6]
median_conv = statistics.median([n["conv_rate_7"] for n in chv]) if chv else 0
underserved = sorted(
    [n for n in chv if n["conv_rate_7"]<median_conv/3],
    key=lambda x: -x["search_volume"]
)[:30]

# 5. Launch boom
launches = []
for n in N:
    nw = n.get("new_launch") or 0
    sc = n.get("successful_launch") or 0
    if nw>=10 and n["search_volume"]>5e6:
        launches.append({**n, "success_rate": round(sc/nw*100, 1)})
launches.sort(key=lambda x: (-x["success_rate"], -x["search_volume"]))

# 6. Category health
by_cat = defaultdict(list)
for n in N:
    if n["category"]: by_cat[n["category"]].append(n)
cat_health = []
for cat, ns in by_cat.items():
    if len(ns) < 10: continue
    vg = [x["growth_pct"] for x in ns if x.get("growth_pct") is not None]
    vc = [x["conv_rate_7"] for x in ns if x.get("conv_rate_7") is not None]
    vr = [x["return_rate"] for x in ns if x.get("return_rate") is not None]
    if not (vg and vc and vr): continue
    g, c, r = statistics.mean(vg), statistics.mean(vc), statistics.mean(vr)
    v = sum(x["search_volume"] for x in ns)
    cat_health.append({"category":cat, "n_niches":len(ns),
        "avg_growth":round(g,2), "avg_conv":round(c,2), "avg_return":round(r,2),
        "total_vol":int(v), "score":round(g*5+c*30-r*10, 1)})
cat_health.sort(key=lambda x: -x["score"])

# 7. Price tiers
tiers = {"<$10":0, "$10-25":0, "$25-50":0, "$50-100":0, ">$100":0}
for n in N:
    p = n.get("avg_price") or 0
    if p<10: tiers["<$10"]+=1
    elif p<25: tiers["$10-25"]+=1
    elif p<50: tiers["$25-50"]+=1
    elif p<100: tiers["$50-100"]+=1
    else: tiers[">$100"]+=1

# 8. Profit Potential (high price + conv, low return)
profit = sorted(
    [n for n in N
     if (n.get("avg_price") or 0)>30 and (n.get("conv_rate_7") or 0)>3
     and (n.get("return_rate") or 0)<3 and n["search_volume"]>1e6],
    key=lambda x: -((x["avg_price"] or 0) * (x.get("conv_rate_7") or 0) * x["search_volume"] / 1e9)
)[:30]

# 9. Growth Racers (sustainable, multi-brand)
racers = sorted(
    [n for n in N
     if 10<=(n.get("growth_pct") or 0)<=100 and (n.get("conv_rate_7") or 0)>1
     and n["search_volume"]>2e6 and (n.get("brand_count") or 0)>=3],
    key=lambda x: -((x["growth_pct"] or 0)*(x.get("conv_rate_7") or 0)*x["search_volume"]/1e8)
)[:30]

insights = {
    "top_opportunities": [{**n, "score":round(opp_score(n))} for n in top_opps],
    "brand_lite": brand_lite,
    "return_warnings": returns,
    "conversion_outliers": [{**n, "ratio_to_median":round(n["conv_rate_7"]/median_conv*100) if median_conv else 0} for n in underserved],
    "launch_success": launches[:30],
    "category_health": cat_health[:40],
    "price_tier_dist": tiers,
    "profit_potential": profit,
    "growth_racers": racers,
    "median_conv": round(median_conv, 3),
    "stats": {
        "total_niches": len(N),
        "categories": len({n["category"] for n in N if n.get("category")}),
    },
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(insights, f, ensure_ascii=False, separators=(",",":"))
print(f"✓ {OUT.name} ({OUT.stat().st_size/1024:.0f} KB)")
