"use client";
import { useState } from "react";
import { Header, Nav, Container, Card, Footer } from "./Shell";
import { fmtInt, fmtNum, fmtMoney, fmtPct } from "@/lib/format";

type Niche = {
  niche_id: string; title: string; category: string; image: string;
  search_volume: number; growth_pct?: number | null; avg_price?: number | null;
  brand_count?: number | null; product_count?: number | null;
  return_rate?: number | null; conv_rate_7?: number | null;
  new_launch?: number | null; successful_launch?: number | null;
  score?: number; success_rate?: number; ratio_to_median?: number;
};

type Health = {
  category: string; n_niches: number; avg_growth: number;
  avg_conv: number; avg_return: number; total_vol: number; score: number;
};

export type Insights = {
  top_opportunities: Niche[];
  brand_lite: Niche[];
  return_warnings: Niche[];
  conversion_outliers: Niche[];
  launch_success: Niche[];
  category_health: Health[];
  price_tier_dist: Record<string, number>;
  profit_potential: Niche[];
  growth_racers: Niche[];
  median_conv: number;
  stats: { total_niches: number; categories: number };
};

const TABS = [
  { id: "opp",   label: "🚀 Opportunities", desc: "High demand + growth + low competition (score = vol × growth_boost ÷ √competition)" },
  { id: "racer", label: "🏃 Growth Racers",  desc: "Sustainable growth 10-100%, multi-brand, high conv. Hơn phantom hype keywords." },
  { id: "profit",label: "💰 Profit Potential", desc: "Avg price >$30, conv >3%, return <3% — niches có margin cao bền vững" },
  { id: "lite",  label: "🌿 Brand-lite",     desc: "≤3 brands, vol >5M, growth >5% — chỗ trống cho người mới" },
  { id: "under", label: "💎 Underserved",    desc: "Search volume cao, conversion <⅓ median — demand chưa được match" },
  { id: "boom",  label: "🔥 Launch Boom",    desc: "Niches mà mọi product mới launch đều thành công" },
  { id: "warn",  label: "⚠️ Return Risks",   desc: "Return rate >10% — apparel, dresses, formal wear" },
  { id: "cat",   label: "📊 Category Health", desc: "Composite score per category (3K+ categories có data)" },
  { id: "price", label: "💵 Price Tiers",    desc: "Phân bổ niches theo tier giá. $10-25 là impulse zone" },
] as const;

export default function InsightsClient({ data }: { data: Insights }) {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("opp");
  const current = TABS.find(t => t.id === tab)!;

  return (
    <Container>
      <Header
        title="Market Insights"
        subtitle={`Phân tích ${fmtInt(data.stats.total_niches)} niches qua ${fmtInt(data.stats.categories)} categories`}
        variant="green"
        right={<div className="text-[12px] text-ink-dim max-w-[380px] text-right">
          9 góc nhìn — opportunity, profit, brand-lite, growth racer, underserved, launch boom, return risk, category health, price tiers.
        </div>}
      />
      <Nav />

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
              tab === t.id
                ? "bg-gradient-to-br from-emerald-500 to-blue-500 text-white border-transparent shadow-[0_4px_14px_rgba(16,185,129,.35)]"
                : "bg-card border-line text-ink-dim hover:text-ink hover:bg-card-h"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="text-[12px] text-ink-dim mb-4 italic">{current.desc}</div>

      {tab === "opp"    && <NicheList list={data.top_opportunities} highlight="score" />}
      {tab === "racer"  && <NicheList list={data.growth_racers}     highlight="growth" />}
      {tab === "profit" && <NicheList list={data.profit_potential}  highlight="profit" />}
      {tab === "lite"   && <NicheList list={data.brand_lite}        highlight="brand_count" />}
      {tab === "under"  && <NicheList list={data.conversion_outliers} highlight="under" />}
      {tab === "boom"   && <NicheList list={data.launch_success}    highlight="launch" />}
      {tab === "warn"   && <NicheList list={data.return_warnings}   highlight="return" />}
      {tab === "cat"    && <CatTab list={data.category_health} />}
      {tab === "price"  && <PriceTab dist={data.price_tier_dist} total={data.stats.total_niches} />}

      <Footer>Source: 203K niches × 9.6M ASINs. Re-run `python scripts/build_insights.py` to refresh.</Footer>
    </Container>
  );
}

function Img({src, size=56}:{src?:string; size?:number}) {
  if (!src) return <div className="bg-card-2 rounded-md flex-shrink-0" style={{width:size, height:size}} />;
  return <img src={src} className="bg-white rounded-md p-1 flex-shrink-0 object-contain"
              style={{width:size, height:size}}
              onError={e => { (e.target as HTMLImageElement).style.visibility="hidden"; }} />;
}

function NicheList({list, highlight}:{list:Niche[]; highlight?:string}) {
  return (
    <Card>
      <div className="space-y-0">
        {list.map((n, i) => (
          <div key={n.niche_id+i} className="grid grid-cols-[32px_auto_1fr_auto_auto] gap-3 p-3 border-b border-line hover:bg-card-h items-center">
            <span className="font-bold text-ink-dim font-mono">#{i+1}</span>
            <Img src={n.image} />
            <div className="min-w-0">
              <div className="font-semibold text-ink truncate">{n.title}</div>
              <div className="text-[11px] text-ink-dim">{n.category}</div>
              <div className="flex gap-3 text-[11px] text-ink-dim mt-0.5">
                <span>Vol <b className="text-white">{fmtNum(n.search_volume)}</b></span>
                {n.growth_pct != null && <span className={n.growth_pct>=0?"text-pos":"text-neg"}>
                  {fmtPct(n.growth_pct, true)}
                </span>}
                <span>Avg {fmtMoney(n.avg_price)}</span>
                {n.brand_count != null && <span>Brands <b className="text-white">{n.brand_count}</b></span>}
              </div>
            </div>
            <div className="text-right">
              {highlight === "score" && <Badge color="warn" label="Score" value={fmtNum(n.score)} />}
              {highlight === "growth" && <Badge color="pos" label="Growth" value={fmtPct(n.growth_pct, true)} />}
              {highlight === "profit" && <Badge color="warn" label="Conv" value={`${n.conv_rate_7}%`} hint={`return ${n.return_rate}%`} />}
              {highlight === "brand_count" && <Badge color="accent" label="Brands" value={String(n.brand_count)} />}
              {highlight === "under" && <Badge color="neg" label="Conv" value={`${n.conv_rate_7}%`} hint={`${n.ratio_to_median}% median`} />}
              {highlight === "launch" && <Badge color="pos" label="Success" value={`${n.success_rate}%`} hint={`${n.successful_launch}/${n.new_launch}`} />}
              {highlight === "return" && <Badge color="neg" label="Return" value={`${n.return_rate}%`} />}
            </div>
            <div className="text-right">
              <a href={`/?id=${n.niche_id}`} className="text-accent text-xs hover:underline">View →</a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Badge({label, value, color, hint}: {label:string; value:string; color:string; hint?:string}) {
  const cls = color === "warn" ? "text-warn"
            : color === "pos"  ? "text-pos"
            : color === "neg"  ? "text-neg"
            : "text-accent";
  return (
    <div>
      <div className="text-[10px] text-ink-dim uppercase">{label}</div>
      <div className={`font-extrabold text-lg ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}

function CatTab({list}: {list: Health[]}) {
  const maxScore = Math.max(...list.map(c => Math.abs(c.score)));
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-ink-dim text-[11px] uppercase tracking-[.5px] border-b border-line">
              <th className="text-left p-2">Category</th>
              <th className="text-right p-2">Niches</th>
              <th className="text-right p-2">Growth</th>
              <th className="text-right p-2">Conv 7d</th>
              <th className="text-right p-2">Return</th>
              <th className="text-right p-2">Volume</th>
              <th className="text-right p-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => {
              const bar = Math.min(100, Math.abs(c.score) / maxScore * 100);
              const cls = c.score >= 0 ? "from-emerald-500 to-blue-500" : "from-orange-500 to-red-500";
              return (
                <tr key={c.category} className="border-b border-line hover:bg-card-h">
                  <td className="p-2 font-semibold">{c.category}</td>
                  <td className="p-2 text-right">{c.n_niches}</td>
                  <td className={`p-2 text-right font-bold ${c.avg_growth>=0?"text-pos":"text-neg"}`}>
                    {fmtPct(c.avg_growth, true)}
                  </td>
                  <td className="p-2 text-right font-bold text-white">{c.avg_conv}%</td>
                  <td className={`p-2 text-right ${c.avg_return>5?"text-neg font-bold":""}`}>{c.avg_return}%</td>
                  <td className="p-2 text-right">{fmtNum(c.total_vol)}</td>
                  <td className="p-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-20 h-1.5 bg-bg-2 rounded-sm overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${cls}`} style={{width:`${Math.max(2,bar)}%`}} />
                      </div>
                      <span className="font-bold text-warn min-w-[60px] text-right">{fmtNum(c.score)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PriceTab({dist, total}:{dist:Record<string,number>; total:number}) {
  const max = Math.max(...Object.values(dist));
  return (
    <Card>
      <div className="space-y-4">
        {Object.entries(dist).map(([tier, count]) => (
          <div key={tier}>
            <div className="flex justify-between mb-1.5">
              <span className="font-semibold text-white">{tier}</span>
              <span className="font-bold text-warn">{fmtInt(count)} niches ({Math.round(count/total*100)}%)</span>
            </div>
            <div className="h-4 bg-bg-2 rounded-md overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{width:`${(count/max)*100}%`}} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-card-2 border-l-4 border-l-warn rounded-md text-sm text-ink-dim">
        <strong className="text-warn">💡 Insight:</strong> Tier $10-25 chiếm phần lớn niches — impulse buy zone trên Amazon, cạnh tranh khốc liệt.
        Tier $50-100 và $100+ ít competition hơn, phù hợp brand premium hoặc specialty niche với conversion cao.
      </div>
    </Card>
  );
}
