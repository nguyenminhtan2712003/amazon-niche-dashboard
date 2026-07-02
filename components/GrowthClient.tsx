"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import type { Snapshot, Niche, Segment } from "@/lib/types";
import { fmtNum, fmtMoney, fmtPct, segmentOf, SEG_COLOR, COMPARE_PALETTE , fmtInt } from "@/lib/format";
import { Header, Nav, Container, Card, Footer } from "./Shell";

export default function GrowthClient({ data }: { data: Snapshot }) {
  const [category, setCategory] = useState("all");
  const [status,   setStatus]   = useState("all");
  const [minVol,   setMinVol]   = useState("");
  const [segFilter, setSegFilter] = useState<"all" | Segment>("all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [picker, setPicker] = useState("");

  const categories = useMemo(() => Array.from(new Set(data.niches.map(n => n.category))).sort(), [data]);

  const filtered = useMemo(() => {
    const min = parseFloat(minVol) || 0;
    return data.niches.filter(n => {
      if (category !== "all" && n.category !== category) return false;
      if (status   !== "all" && n.status   !== status)   return false;
      if (n.search_volume < min) return false;
      if (segFilter !== "all" && segmentOf(n.growth_pct) !== segFilter) return false;
      return true;
    });
  }, [data, category, status, minVol, segFilter]);

  /* ---------- Segments ---------- */
  const segCounts = useMemo(() => {
    const c: Record<string, number> = { hot: 0, rising: 0, stable: 0, cool: 0, dec: 0 };
    filtered.forEach(n => {
      const s = segmentOf(n.growth_pct);
      if (s in c) c[s]++;
    });
    return c;
  }, [filtered]);

  /* ---------- Scatter ---------- */
  const scatterPts = useMemo(() =>
    filtered
      .filter(n => n.growth_pct != null && n.search_volume > 0)
      .map(n => ({
        x: n.search_volume,
        y: n.growth_pct as number,
        z: n.avg_price ? Math.max(20, Math.min(400, (n.avg_price as number) * 10)) : 30,
        title: n.title, cat: n.category, price: n.avg_price,
        color: SEG_COLOR[segmentOf(n.growth_pct)],
      })),
    [filtered],
  );

  /* ---------- Histogram ---------- */
  const histData = useMemo(() => {
    const buckets = [
      { lo: -Infinity, hi: -10, lbl: "< -10%" },
      { lo: -10, hi: -5,  lbl: "-10 to -5%" },
      { lo: -5,  hi: -2,  lbl: "-5 to -2%" },
      { lo: -2,  hi: 0,   lbl: "-2 to 0%" },
      { lo: 0,   hi: 2,   lbl: "0 to 2%" },
      { lo: 2,   hi: 5,   lbl: "2 to 5%" },
      { lo: 5,   hi: 10,  lbl: "5 to 10%" },
      { lo: 10,  hi: Infinity, lbl: "> 10%" },
    ];
    const cnt = buckets.map(() => 0);
    filtered.forEach(n => {
      if (n.growth_pct == null) return;
      const i = buckets.findIndex(b => n.growth_pct! >= b.lo && n.growth_pct! < b.hi);
      if (i >= 0) cnt[i]++;
    });
    return buckets.map((b, i) => ({
      label: b.lbl, n: cnt[i],
      color: b.hi <= 0 ? (b.hi <= -5 ? "#dc2626" : "#f87171")
           : b.lo >= 5 ? "#fb923c"
           : b.lo >= 2 ? "#4ade80" : "#86efac",
    }));
  }, [filtered]);

  /* ---------- Category growth ---------- */
  const catGrowth = useMemo(() => {
    const byCat: Record<string, { sum: number; n: number }> = {};
    filtered.forEach(n => {
      if (n.growth_pct == null) return;
      byCat[n.category] = byCat[n.category] || { sum: 0, n: 0 };
      byCat[n.category].sum += n.growth_pct;
      byCat[n.category].n++;
    });
    const arr = Object.entries(byCat)
      .filter(([, v]) => v.n >= 2)
      .map(([cat, v]) => ({ cat, avg: v.sum / v.n, n: v.n }))
      .sort((a, b) => b.n - a.n).slice(0, 12)
      .sort((a, b) => b.avg - a.avg);
    const overall = filtered.filter(n => n.growth_pct != null).reduce((s, n) => s + (n.growth_pct as number), 0)
                    / Math.max(1, filtered.filter(n => n.growth_pct != null).length);
    return arr.map(x => ({ ...x, color: x.avg >= overall ? "#4ade80" : "#f87171" }));
  }, [filtered]);

  /* ---------- Growth vs Conv ---------- */
  const convPts = useMemo(() =>
    filtered
      .filter(n => n.growth_pct != null && n.conv_rate_7 != null)
      .map(n => ({
        x: n.conv_rate_7 as number, y: n.growth_pct as number, z: 30,
        title: n.title, cat: n.category,
        color: SEG_COLOR[segmentOf(n.growth_pct)],
      })),
    [filtered],
  );

  /* ---------- Top / bottom growers ---------- */
  const sortedByGrowth = useMemo(
    () => filtered.filter(n => n.growth_pct != null).slice().sort((a, b) => (b.growth_pct! - a.growth_pct!)),
    [filtered],
  );
  const top20 = sortedByGrowth.slice(0, 20);
  const bot20 = sortedByGrowth.slice(-20).reverse();

  /* ---------- Compare ---------- */
  const compareItems = useMemo(() => {
    return compareIds
      .map((id, i) => {
        const n = data.niches.find(x => x.niche_id === id);
        return n ? { ...n, color: COMPARE_PALETTE[i % COMPARE_PALETTE.length] } : null;
      })
      .filter(Boolean) as (Niche & { color: string })[];
  }, [compareIds, data]);

  const addCompare = (id: string) => {
    if (!id) return;
    if (compareIds.includes(id)) return;
    if (compareIds.length >= 6) { alert("Maximum 6 niches"); return; }
    setCompareIds([...compareIds, id]);
    setPicker("");
  };
  const removeCompare = (id: string) => setCompareIds(compareIds.filter(x => x !== id));

  return (
    <Container>
      <Header
        title="Niche Growth Analysis"
        subtitle={`${fmtInt(data.niches.length)} niches • Source: ${fmtInt(data.meta.total_niches_source)}`}
        variant="green"
        right={
          <div className="text-[12px] text-ink-dim max-w-[380px] text-right">
            Growth = 360-day search volume growth (year-over-year style). Positive = niche is expanding.
          </div>
        }
      />
      <Nav />

      {/* Segments */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-[18px]">
        {(
          [
            ["hot",    "🔥", "Hot",       "growth ≥ 5%",      "#fb923c", segCounts.hot],
            ["rising", "📈", "Rising",    "1% to 5%",         "#4ade80", segCounts.rising],
            ["stable", "⚖️", "Stable",    "-1% to 1%",        "#60a5fa", segCounts.stable],
            ["cool",   "❄️", "Cooling",   "-5% to -1%",       "#94a3b8", segCounts.cool],
            ["dec",    "📉", "Declining", "growth ≤ -5%",     "#f87171", segCounts.dec],
          ] as const
        ).map(([key, ico, name, hint, color, count]) => {
          const active = segFilter === key;
          return (
            <div key={key}
                 onClick={() => setSegFilter(active ? "all" : key)}
                 className={`relative overflow-hidden bg-gradient-to-br from-card to-card-2 border rounded-xl shadow-card p-[18px_20px] cursor-pointer transition-all hover:-translate-y-1 ${active ? "border-accent shadow-[0_0_0_2px_rgba(96,165,250,.35)]" : "border-line"}`}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
              <div className="text-[11px] text-ink-dim uppercase tracking-[.6px] font-semibold mb-1 flex items-center gap-1.5">
                <span className="text-[18px]">{ico}</span> {name}
              </div>
              <div className="text-[26px] font-extrabold" style={{ color }}>{fmtInt(count)}</div>
              <div className="text-[11px] text-muted mt-1">{hint} • {((count / Math.max(1, filtered.length)) * 100).toFixed(0)}% of view</div>
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <section className="bg-card border border-line rounded-xl shadow-card p-[14px_18px] mb-[18px] flex flex-wrap gap-3 items-end">
        <Select label="Category" value={category} onChange={setCategory} options={[{value:"all",label:"All categories"}, ...categories.map(c=>({value:c,label:c}))]} />
        <Select label="Status" value={status} onChange={setStatus} options={[{value:"all",label:"All"},{value:"Crawled",label:"Crawled"},{value:"Error",label:"Error"}]} />
        <NumberInput label="Min search volume" value={minVol} onChange={setMinVol} placeholder="e.g. 100000" />
        <Select label="Segment focus" value={segFilter} onChange={v=>setSegFilter(v as any)} options={[
          {value:"all",label:"All segments"},
          {value:"hot",label:"🔥 Hot (≥ 5%)"},
          {value:"rising",label:"📈 Rising (1–5%)"},
          {value:"stable",label:"⚖️ Stable (-1 to 1%)"},
          {value:"cool",label:"❄️ Cooling (-5 to -1%)"},
          {value:"dec",label:"📉 Declining (≤ -5%)"},
        ]} />
        <button onClick={() => { setCategory("all"); setStatus("all"); setMinVol(""); setSegFilter("all"); }}
                className="px-4 py-2 rounded-md text-[13px] font-semibold text-ink bg-bg-2 border border-line hover:bg-card-h">Reset</button>
      </section>

      {/* Scatter + Histogram */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[14px] mb-[18px]">
        <Card title="Search Volume vs Growth (bubble = avg price)" desc="Each point = a niche. Up → faster growth. Right → bigger market.">
          <div className="h-[420px]">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 60 }}>
                <CartesianGrid stroke="rgba(36,48,73,.4)" />
                <XAxis dataKey="x" type="number" scale="log" domain={["auto","auto"]} stroke="#a4b1c6"
                       tick={{ fontSize: 11 }} tickFormatter={(v)=>fmtNum(v)}
                       label={{ value: "Search Volume (log)", position: "bottom", fill: "#a4b1c6", fontSize: 12 }} />
                <YAxis dataKey="y" type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }}
                       tickFormatter={(v)=>`${v}%`}
                       label={{ value: "Growth %", angle: -90, position: "insideLeft", fill: "#a4b1c6", fontSize: 12 }} />
                <ZAxis dataKey="z" range={[20, 400]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.3)" />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(_v, _n, p: any) => {
                    const d = p.payload;
                    return [`${d.cat} • Vol ${fmtNum(d.x)} • Growth ${d.y.toFixed(2)}% • ${fmtMoney(d.price)}`, d.title];
                  }} />
                <Scatter data={scatterPts}>
                  {scatterPts.map((p, i) => <Cell key={i} fill={p.color} fillOpacity={0.8} stroke={p.color} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Growth Distribution" desc="How many niches fall into each growth bucket.">
          <div className="h-[420px]">
            <ResponsiveContainer>
              <BarChart data={histData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="rgba(36,48,73,.4)" vertical={false} />
                <XAxis dataKey="label" stroke="#a4b1c6" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="#a4b1c6" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                         formatter={(v: any) => [`${v} niches`, ""]} />
                <Bar dataKey="n" radius={[6,6,0,0]}>
                  {histData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Category growth + Conv */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[18px]">
        <Card title="Avg Growth by Category (top 12)" desc="Category-level momentum. Green = beats overall average.">
          <div className="h-[340px]">
            <ResponsiveContainer>
              <BarChart data={catGrowth} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="rgba(36,48,73,.4)" horizontal={false} />
                <XAxis type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} tickFormatter={(v)=>`${v.toFixed(1)}%`} />
                <YAxis dataKey="cat" type="category" stroke="#a4b1c6" width={150} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                         formatter={(v: any, _n, p: any) => [`Avg growth: ${fmtPct(v, true)}  •  ${p.payload.n} niches`, p.payload.cat]} />
                <Bar dataKey="avg" radius={[0,4,4,0]}>
                  {catGrowth.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Growth vs Conversion Rate (7d)" desc="Top-right corner = strongest opportunities.">
          <div className="h-[340px]">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 50 }}>
                <CartesianGrid stroke="rgba(36,48,73,.4)" />
                <XAxis dataKey="x" type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} tickFormatter={(v)=>`${v}%`}
                       label={{ value: "Conversion 7d (%)", position: "bottom", fill: "#a4b1c6", fontSize: 12 }} />
                <YAxis dataKey="y" type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} tickFormatter={(v)=>`${v}%`}
                       label={{ value: "Growth %", angle: -90, position: "insideLeft", fill: "#a4b1c6", fontSize: 12 }} />
                <ZAxis dataKey="z" range={[30, 30]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.3)" />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                  formatter={(_v, _n, p: any) => {
                    const d = p.payload;
                    return [`${d.cat} • Conv ${d.x.toFixed(2)}% • Growth ${d.y.toFixed(2)}%`, d.title];
                  }} />
                <Scatter data={convPts}>
                  {convPts.map((p, i) => <Cell key={i} fill={p.color} fillOpacity={0.8} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Top / bottom growers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[18px]">
        <GrowerList title="🚀 Top 20 Fastest Growing" items={top20} variant="pos" onClick={(n) => addCompare(n.niche_id)} selectedIds={compareIds} />
        <GrowerList title="📉 Top 20 Declining"        items={bot20} variant="neg" onClick={(n) => addCompare(n.niche_id)} selectedIds={compareIds} />
      </section>

      {/* Compare */}
      <section className="bg-card border border-line rounded-xl shadow-card p-[20px_22px] mb-[18px]">
        <h2 className="title-bar text-[16px] font-bold mb-3.5">Compare Niches Side by Side</h2>
        <div className="flex gap-2.5 mb-3.5 flex-wrap">
          <select value={picker} onChange={e => setPicker(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2.5 border border-line rounded-md bg-bg-2 text-ink text-sm">
            <option value="">Search and add niche...</option>
            {data.niches.slice().sort((a,b)=>b.search_volume-a.search_volume).map(n => (
              <option key={n.niche_id} value={n.niche_id}>{n.title} — {n.category}{n.growth_pct != null ? ` (${fmtPct(n.growth_pct, true)})` : ""}</option>
            ))}
          </select>
          <button onClick={() => addCompare(picker)}
                  className="px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-gradient-to-br from-emerald-500 to-blue-500">+ Add</button>
          <button onClick={() => setCompareIds([])}
                  className="px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-gradient-to-br from-red-500 to-red-700">Clear all</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3.5">
          {compareItems.map(n => (
            <span key={n.niche_id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-card-2 border border-line rounded-full text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
              {n.title}
              <span className="cursor-pointer text-neg font-bold text-sm" onClick={() => removeCompare(n.niche_id)}>×</span>
            </span>
          ))}
        </div>

        {compareItems.length < 2 ? (
          <div className="text-center text-ink-dim p-10 text-sm">
            Pick 2 to 6 niches above to compare growth, volume, price, and conversion side by side.
          </div>
        ) : <CompareBody items={compareItems} />}
      </section>

      <Footer>
        Growth Analysis • Generated <time suppressHydrationWarning>{new Date(data.meta.generated_at).toLocaleString("en-US")}</time>
      </Footer>
    </Container>
  );
}

/* ---------- subcomponents ---------- */

function Select({ label, value, onChange, options }:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-ink-dim uppercase tracking-[.4px] font-semibold">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
              className="px-3 py-2 border border-line rounded-md text-[13px] bg-bg-2 text-ink min-w-[130px] focus:outline-none focus:border-accent">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder }:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-ink-dim uppercase tracking-[.4px] font-semibold">{label}</label>
      <input type="number" min={0} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
             className="px-3 py-2 border border-line rounded-md text-[13px] bg-bg-2 text-ink min-w-[130px] focus:outline-none focus:border-accent" />
    </div>
  );
}

function GrowerList({ title, items, variant, onClick, selectedIds }:{title:string; items:Niche[]; variant:"pos"|"neg"; onClick:(n:Niche)=>void; selectedIds:string[]}) {
  const pillCls = variant === "pos"
    ? "bg-[rgba(74,222,128,.15)] text-[#86efac] border-[rgba(74,222,128,.3)]"
    : "bg-[rgba(248,113,113,.15)] text-[#fca5a5] border-[rgba(248,113,113,.3)]";
  return (
    <div className="bg-card border border-line rounded-xl shadow-card overflow-hidden">
      <div className="p-[16px_20px] border-b border-line flex items-center gap-2.5">
        <h3 className="text-[14px] font-bold">{title}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${pillCls}`}>in current filter</span>
      </div>
      {items.length === 0 && <div className="p-7 text-center text-ink-dim">No data</div>}
      {items.map((n, i) => {
        const sel = selectedIds.includes(n.niche_id);
        return (
          <div key={n.niche_id} onClick={() => onClick(n)}
               className={`grid grid-cols-[32px_1fr_auto] gap-3 p-[10px_18px] border-b border-line items-center cursor-pointer transition-colors ${sel ? "bg-[rgba(96,165,250,.12)] border-l-[3px] border-l-accent pl-[15px]" : "hover:bg-card-h"}`}>
            <span className="text-[13px] font-bold text-ink-dim font-mono">#{i+1}</span>
            <div>
              <div className="text-[13px] font-semibold text-ink truncate max-w-[280px]">{n.title}</div>
              <div className="text-[11px] text-ink-dim">{n.category} • Vol {fmtNum(n.search_volume)}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-extrabold ${variant === "pos" ? "text-pos" : "text-neg"}`}>{fmtPct(n.growth_pct, true)}</div>
              <div className="text-[11px] text-ink-dim">{fmtMoney(n.avg_price)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompareBody({ items }: { items: (Niche & { color: string })[] }) {
  const max = {
    search_volume: Math.max(...items.map(n => n.search_volume || 0), 1),
    avg_price:     Math.max(...items.map(n => n.avg_price || 0), 1),
    product_count: Math.max(...items.map(n => n.product_count || 0), 1),
    brand_count:   Math.max(...items.map(n => n.brand_count || 0), 1),
    new_launch:    Math.max(...items.map(n => n.new_launch || 0), 1),
    successful_launch: Math.max(...items.map(n => n.successful_launch || 0), 1),
  };

  const bar = (val: number | null | undefined, mx: number, color: string, fmtFn: (v: any) => string) => {
    const v = val ?? 0;
    const w = Math.max(2, (v / mx) * 100);
    return (
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="flex-1 h-1.5 bg-bg-2 rounded-sm overflow-hidden">
          <div style={{ width: `${w}%`, background: color }} className="h-full" />
        </div>
        <span className="text-right min-w-[70px]">{fmtFn(v)}</span>
      </div>
    );
  };

  const growthBarData = items.map(n => ({ name: n.title.length > 18 ? n.title.slice(0, 16) + "…" : n.title, v: n.growth_pct ?? 0, color: n.color }));
  const dims = ["search_volume","avg_price","product_count","brand_count","new_launch","successful_launch"] as const;
  const dimLbl = ["Search Vol","Avg Price","Products","Brands","New Launches","Success Launches"];
  const dimMax = dims.map(d => Math.max(...items.map(n => (n as any)[d] || 0), 1));
  const radarData = dimLbl.map((label, i) => {
    const row: any = { dim: label };
    items.forEach(n => { row[n.niche_id] = Math.round((((n as any)[dims[i]] || 0) / dimMax[i]) * 100); });
    return row;
  });

  return (
    <>
      <div className="overflow-x-auto mb-3.5">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-card-2 text-ink-dim text-[11px] uppercase tracking-[.5px]">
              <th className="p-2.5 text-left">Niche</th><th className="p-2.5 text-left">Category</th>
              <th className="p-2.5 text-left">Growth %</th><th className="p-2.5 text-left">Search Vol</th>
              <th className="p-2.5 text-left">Avg Price</th><th className="p-2.5 text-left">Conv 7d</th>
              <th className="p-2.5 text-left">Return %</th><th className="p-2.5 text-left">Products</th>
              <th className="p-2.5 text-left">Brands</th><th className="p-2.5 text-left">New Launch</th>
              <th className="p-2.5 text-left">Success Launch</th>
            </tr>
          </thead>
          <tbody>
            {items.map(n => (
              <tr key={n.niche_id} className="border-b border-line hover:bg-card-h">
                <td className="p-2.5">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: n.color }} />
                  {n.image && <img src={n.image} alt="" className="w-7 h-7 inline-block align-middle bg-white rounded-sm p-0.5 mr-2" />}
                  <b>{n.title}</b>
                </td>
                <td className="p-2.5">{n.category}</td>
                <td className="p-2.5">
                  <span className={(n.growth_pct ?? 0) >= 0 ? "text-pos font-bold" : "text-neg font-bold"}>{fmtPct(n.growth_pct, true)}</span>
                </td>
                <td className="p-2.5">{bar(n.search_volume, max.search_volume, n.color, fmtNum)}</td>
                <td className="p-2.5">{bar(n.avg_price, max.avg_price, n.color, fmtMoney)}</td>
                <td className="p-2.5">{fmtPct(n.conv_rate_7)}</td>
                <td className="p-2.5">{fmtPct(n.return_rate)}</td>
                <td className="p-2.5">{bar(n.product_count, max.product_count, n.color, fmtNum)}</td>
                <td className="p-2.5">{bar(n.brand_count, max.brand_count, n.color, fmtNum)}</td>
                <td className="p-2.5">{bar(n.new_launch, max.new_launch, n.color, fmtNum)}</td>
                <td className="p-2.5">{bar(n.successful_launch, max.successful_launch, n.color, fmtNum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-card-2 border border-line rounded-lg p-3.5">
          <h4 className="text-[12px] font-bold text-ink-dim uppercase tracking-[.5px] mb-2.5">Growth %</h4>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={growthBarData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="rgba(36,48,73,.4)" horizontal={false} />
                <XAxis type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} tickFormatter={(v)=>`${v}%`} />
                <YAxis dataKey="name" type="category" stroke="#a4b1c6" width={140} tick={{ fontSize: 11 }} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,.4)" />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                         formatter={(v: any) => [fmtPct(v, true), ""]} />
                <Bar dataKey="v" radius={[0,6,6,0]}>
                  {growthBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card-2 border border-line rounded-lg p-3.5">
          <h4 className="text-[12px] font-bold text-ink-dim uppercase tracking-[.5px] mb-2.5">Multi-metric radar (normalized)</h4>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(36,48,73,.6)" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "#a4b1c6", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                {items.map(n => (
                  <Radar key={n.niche_id} name={n.title.length > 14 ? n.title.slice(0, 14) + "…" : n.title} dataKey={n.niche_id}
                         stroke={n.color} fill={n.color} fillOpacity={0.2} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

