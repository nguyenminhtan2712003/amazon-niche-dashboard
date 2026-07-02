"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Snapshot, Niche, Asin } from "@/lib/types";
import { fmtNum, fmtMoney, fmtPct, fmtStars , fmtInt } from "@/lib/format";
import { Header, Nav, Container, Card, Footer } from "./Shell";

const PALETTE = ["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#2dd4bf","#f472b6","#84cc16","#fb923c","#818cf8"];

type SortKey = "search_volume"|"growth_pct"|"avg_price"|"max_units_360"|"product_count"|"return_rate"|"conv_rate_7";

export default function DashboardClient({ data }: { data: Snapshot }) {
  const [category, setCategory] = useState("all");
  const [status, setStatus]     = useState("all");
  const [minVol, setMinVol]     = useState("");
  const [sortKey, setSortKey]   = useState<SortKey>("search_volume");
  const [dir, setDir]           = useState<"asc"|"desc">("desc");
  const [q, setQ]               = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalAsin, setModalAsin] = useState<Asin | null>(null);
  // Live data from DuckDB API
  const [liveNiches, setLiveNiches] = useState<Niche[] | null>(null);  // search results 203K
  const [searching, setSearching] = useState(false);
  const [liveAsins, setLiveAsins] = useState<Asin[] | null>(null);     // full asins per niche
  const [loadingAsins, setLoadingAsins] = useState(false);
  const [asinsTotal, setAsinsTotal] = useState<number>(0);

  const categories = useMemo(() => {
    const s = new Set(data.niches.map(n => n.category));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const min = parseFloat(minVol) || 0;
    const ql = q.trim().toLowerCase();
    // If live search results exist (user typed ≥ 2 chars), prefer those (from full 203K DB)
    const source = (ql.length >= 2 && liveNiches) ? liveNiches : data.niches;
    let res = source.filter(n => {
      if (category !== "all" && n.category !== category) return false;
      if (status   !== "all" && n.status   !== status)   return false;
      if (n.search_volume < min) return false;
      if (ql) {
        const inNiche =
          n.title.toLowerCase().includes(ql) ||
          (n.top_search_term || "").toLowerCase().includes(ql) ||
          (n.category || "").toLowerCase().includes(ql);
        if (!inNiche) {
          const asins = data.asins_by_niche[n.niche_id] || [];
          const found = asins.some(a =>
            a.asin.toLowerCase().includes(ql) ||
            (a.title || "").toLowerCase().includes(ql) ||
            (a.brand || "").toLowerCase().includes(ql),
          );
          if (!found) return false;
        }
      }
      return true;
    });
    res.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      return dir === "asc" ? av - bv : bv - av;
    });
    return res;
  }, [data, category, status, minVol, sortKey, dir, q, liveNiches]);

  // KPIs
  const kpi = useMemo(() => {
    const list = filtered;
    const totalVol = list.reduce((s, n) => s + n.search_volume, 0);
    const priced = list.filter(n => n.avg_price);
    const avgPrice = priced.reduce((s, n) => s + (n.avg_price || 0), 0) / Math.max(1, priced.length);
    const positive = list.filter(n => (n.growth_pct ?? 0) > 0).length;
    const asinsCount = list.reduce((s, n) => s + (data.asins_by_niche[n.niche_id]?.length || 0), 0);
    return { count: list.length, totalVol, avgPrice, positive, asinsCount };
  }, [filtered, data]);

  // Chart data
  const catData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(n => { m[n.category] = (m[n.category] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([cat, n]) => ({ cat: cat.length > 22 ? cat.slice(0, 20) + "…" : cat, n, full: cat }));
  }, [filtered]);

  const topNiches = useMemo(() =>
    [...filtered].sort((a,b) => b.search_volume - a.search_volume).slice(0,20)
      .map(n => ({ name: n.title.length>22 ? n.title.slice(0,20)+"…" : n.title, v: n.search_volume })),
  [filtered]);

  // Live search: query DuckDB when user types ≥ 2 chars (search across all 203K niches)
  useEffect(() => {
    const ql = q.trim();
    if (ql.length < 2) { setLiveNiches(null); return; }
    setSearching(true);
    const ctrl = new AbortController();
    fetch(`/api/db/niches?q=${encodeURIComponent(ql)}&limit=200`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (d?.items) setLiveNiches(d.items);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
    return () => ctrl.abort();
  }, [q]);

  // Fetch ALL asins from DuckDB when a niche is selected
  useEffect(() => {
    if (!selectedId) { setLiveAsins(null); setAsinsTotal(0); return; }
    setLoadingAsins(true);
    setLiveAsins(null);
    fetch(`/api/db/niches/${selectedId}/asins?limit=500`)
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (d?.items) { setLiveAsins(d.items); setAsinsTotal(d.total || d.items.length); }
      })
      .catch(() => {})
      .finally(() => setLoadingAsins(false));
  }, [selectedId]);

  const reset = () => {
    setCategory("all"); setStatus("all"); setMinVol(""); setSortKey("search_volume"); setDir("desc"); setQ("");
  };

  const selected = selectedId ? data.niches.find(n => n.niche_id === selectedId) : null;
  const selectedAsins: Asin[] = liveAsins ?? (selectedId ? (data.asins_by_niche[selectedId] || []) : []);

  return (
    <Container>
      <Header
        title="Amazon Niche & ASIN Dashboard"
        subtitle={`${fmtInt(data.niches.length)} top niches • ${fmtInt(data.meta.total_asins_kept)} top ASINs • Source: ${fmtInt(data.meta.total_niches_source)} niches / ${fmtInt(data.meta.total_asins_source)} ASINs`}
        right={
          <div className="relative min-w-[300px] flex-1 max-w-[480px]">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={searching ? "Searching 203K niches..." : "🔍 Search 203K niches in DB..."}
              className="w-full px-4 py-[10px] border border-line rounded-lg bg-white/[.04] text-ink text-sm placeholder:text-muted focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(96,165,250,.35)]"
            />
          </div>
        }
      />
      <Nav />

      {/* KPI */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(195px,1fr))] gap-[14px] mb-[18px]">
        <Kpi label={q.trim().length >= 2 ? "Search results (203K)" : "Niches in view"} value={fmtNum(kpi.count)} hint={q.trim().length >= 2 ? `from full database` : `of ${fmtNum(data.niches.length)} snapshot`} accent />
        <Kpi label="Total Search Vol (360d)" value={fmtNum(kpi.totalVol)}    hint="summed across filtered niches" />
        <Kpi label="Avg Price"             value={fmtMoney(kpi.avgPrice)}  hint="mean across niches" />
        <Kpi label="Niches w/ growth +"    value={fmtNum(kpi.positive)}    hint={`${((kpi.positive/Math.max(1,kpi.count))*100).toFixed(0)}% of view`} />
        <Kpi label="ASINs in view"         value={fmtNum(kpi.asinsCount)}  hint="top 12 / niche" />
      </section>

      {/* Filters */}
      <section className="bg-card border border-line rounded-xl shadow-card p-[14px_18px] mb-[18px] flex flex-wrap gap-3 items-end">
        <Select label="Category" value={category} onChange={setCategory} options={[{value:"all",label:"All categories"}, ...categories.map(c=>({value:c,label:c}))]} />
        <Select label="Status" value={status} onChange={setStatus} options={[{value:"all",label:"All"},{value:"Crawled",label:"Crawled"},{value:"Error",label:"Error"}]} />
        <NumberInput label="Min search volume" value={minVol} onChange={setMinVol} placeholder="e.g. 100000" />
        <Select label="Sort by" value={sortKey} onChange={v=>setSortKey(v as SortKey)} options={[
          {value:"search_volume",label:"Search Volume"},
          {value:"growth_pct",label:"Growth %"},
          {value:"avg_price",label:"Avg Price"},
          {value:"max_units_360",label:"Max Units Sold"},
          {value:"product_count",label:"Product Count"},
          {value:"return_rate",label:"Return Rate"},
          {value:"conv_rate_7",label:"Conversion 7d"},
        ]} />
        <Select label="Direction" value={dir} onChange={v=>setDir(v as "asc"|"desc")} options={[{value:"desc",label:"High → Low"},{value:"asc",label:"Low → High"}]} />
        <button onClick={reset} className="px-4 py-2 rounded-md text-[13px] font-semibold text-ink bg-bg-2 border border-line hover:bg-card-h">Reset</button>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-[14px] mb-[18px]">
        <Card title="Top 10 Categories (by # niches in view)">
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={catData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="rgba(36,48,73,.5)" horizontal={false} />
                <XAxis type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="cat" stroke="#a4b1c6" width={140} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                         formatter={(v: any, _n, p: any) => [`${v} niches`, p.payload.full]} />
                <Bar dataKey="n" radius={[0,6,6,0]}>
                  {catData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Top 20 Niches by Search Volume">
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={topNiches} layout="vertical" margin={{ left: 80 }}>
                <defs>
                  <linearGradient id="grad" x1="0" x2="1">
                    <stop offset="0%"  stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(36,48,73,.5)" horizontal={false} />
                <XAxis type="number" stroke="#a4b1c6" tick={{ fontSize: 11 }} tickFormatter={(v)=>fmtNum(v)} />
                <YAxis type="category" dataKey="name" stroke="#a4b1c6" width={140} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{background:"#0a0e1a",border:"1px solid #243049",borderRadius:6}}
                         formatter={(v: any) => [`Vol: ${fmtNum(v)}`, ""]} />
                <Bar dataKey="v" fill="url(#grad)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Main: list + detail */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-[14px] mb-[18px]">
        {/* List */}
        <div className="bg-card border border-line rounded-xl shadow-card overflow-hidden flex flex-col max-h-[780px]">
          <div className="px-[18px] py-[14px] border-b border-line flex justify-between items-center bg-gradient-to-b from-card-2 to-transparent">
            <h3 className="text-[14px] font-bold">Niches</h3>
            <span className="text-[12px] text-ink-dim">{fmtInt(filtered.length)} niches</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="p-10 text-center text-ink-dim text-[13px]">No niches match the current filters.</div>
            )}
            {filtered.slice(0, 500).map(n => (
              <NicheRow key={n.niche_id} n={n} active={n.niche_id === selectedId} onClick={() => setSelectedId(n.niche_id)} />
            ))}
            {filtered.length > 500 && (
              <div className="p-[14px] text-center text-ink-dim text-[12px]">
                Showing first 500 of {fmtInt(filtered.length)}. Refine filters to narrow down.
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-card border border-line rounded-xl shadow-card overflow-y-auto max-h-[780px]">
          {!selected ? (
            <div className="p-[60px_30px] text-center text-ink-dim">
              <div className="text-[48px] opacity-40 mb-3">📊</div>
              <div>Select a niche on the left to see all metrics and the top ASINs with images.</div>
            </div>
          ) : (
            <NicheDetail niche={selected} asins={selectedAsins} onAsinClick={setModalAsin} />
          )}
        </div>
      </section>

      <Footer>
        Top {data.niches.length} niches by 360-day search volume. 12 top ASINs per niche by 360-day clicks.
        Generated <time suppressHydrationWarning>{new Date(data.meta.generated_at).toLocaleString("en-US")}</time>
      </Footer>

      {modalAsin && <AsinModal asin={modalAsin} onClose={() => setModalAsin(null)} />}
    </Container>
  );
}

/* ---------- subcomponents ---------- */

function Kpi({ label, value, hint, accent }:{label:string;value:string;hint:string;accent?:boolean}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-card to-card-2 border border-line rounded-xl shadow-card p-[18px_20px]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent to-purple opacity-50" />
      <div className="text-[11px] text-ink-dim uppercase tracking-[.6px] font-semibold mb-1.5">{label}</div>
      <div className={`text-[28px] font-bold ${accent ? "gradient-text" : "text-white"} drop-shadow-[0_0_30px_rgba(96,165,250,.35)]`}>{value}</div>
      <div className="text-[12px] text-muted mt-1">{hint}</div>
    </div>
  );
}

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

function NicheRow({ n, active, onClick }:{n:Niche; active:boolean; onClick:()=>void}) {
  const g = n.growth_pct;
  const gCls = g == null ? "" : g >= 0 ? "text-pos font-bold" : "text-neg font-bold";
  const gTxt = g == null ? "—" : `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
  const statusCls = n.status === "Crawled"
    ? "bg-[rgba(74,222,128,.18)] text-[#86efac]"
    : n.status === "Error"
      ? "bg-[rgba(248,113,113,.18)] text-[#fca5a5]"
      : "bg-[rgba(160,170,200,.15)] text-[#cbd5e1]";
  return (
    <div onClick={onClick}
      className={`flex gap-3 p-[11px_14px] border-b border-line cursor-pointer transition-colors ${active ? "bg-[rgba(96,165,250,.12)] border-l-[3px] border-l-accent pl-[11px] shadow-[inset_0_0_24px_rgba(96,165,250,.08)]" : "hover:bg-card-h"}`}
    >
      {n.image ? (
        <img src={n.image} alt="" loading="lazy" className="w-[54px] h-[54px] object-contain rounded-md bg-white p-0.5 flex-shrink-0" onError={(e)=>(e.currentTarget.style.visibility="hidden")} />
      ) : (
        <div className="w-[54px] h-[54px] rounded-md bg-card-2 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-ink truncate">{n.title}</div>
        <div className="text-[11px] text-ink-dim mt-0.5">
          {n.category} <span className={`inline-block px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-[.3px] ml-1 ${statusCls}`}>{n.status}</span>
        </div>
        <div className="flex gap-2.5 text-[11px] text-ink-dim mt-1 flex-wrap">
          <span>Vol <b className="text-white">{fmtNum(n.search_volume)}</b></span>
          <span className={gCls}>{gTxt}</span>
          <span>Avg {fmtMoney(n.avg_price)}</span>
        </div>
      </div>
    </div>
  );
}

function NicheDetail({ niche, asins, onAsinClick }:{niche:Niche; asins:Asin[]; onAsinClick:(a:Asin)=>void}) {
  const g = niche.growth_pct;
  const gCls = g == null ? "" : g >= 0 ? "text-pos" : "text-neg";
  const gTxt = g == null ? "—" : `${g >= 0 ? "+" : ""}${g.toFixed(2)}%`;
  return (
    <div>
      <div className="p-[22px] bg-gradient-to-br from-[rgba(96,165,250,.08)] to-[rgba(167,139,250,.04)] border-b border-line flex gap-[18px] items-start">
        {niche.image && <img src={niche.image} alt="" className="w-[120px] h-[120px] object-contain rounded-lg bg-white p-1.5 border border-line flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] font-bold mb-2 text-white break-words">{niche.title}</h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[11px] px-2 py-0.5 rounded bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white font-semibold">{niche.category}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-ink-dim border border-line font-semibold">{niche.status}</span>
            {niche.updated_at && <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-ink-dim border border-line font-semibold">Updated: {niche.updated_at}</span>}
          </div>
          <div className="text-[12px] text-ink-dim italic">Top search terms: {niche.top_search_term}</div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-2.5 p-[18px_22px] border-b border-line">
        <Metric l="Search Volume 360d" v={fmtNum(niche.search_volume)} />
        <Metric l="Growth %" v={gTxt} cls={gCls} />
        <Metric l="Avg Price" v={fmtMoney(niche.avg_price)} />
        <Metric l="Price Range" v={`${fmtMoney(niche.min_price)} – ${fmtMoney(niche.max_price)}`} small />
        <Metric l="Units Sold (range)" v={`${fmtNum(niche.min_units_360)} – ${fmtNum(niche.max_units_360)}`} small />
        <Metric l="Product Count" v={fmtNum(niche.product_count)} />
        <Metric l="Brand Count" v={fmtNum(niche.brand_count)} />
        <Metric l="New Launches (360d)" v={fmtNum(niche.new_launch)} />
        <Metric l="Successful Launches" v={fmtNum(niche.successful_launch)} />
        <Metric l="Return Rate" v={fmtPct(niche.return_rate)} />
        <Metric l="Conversion 7d" v={fmtPct(niche.conv_rate_7)} />
        <Metric l="Niche ID" v={niche.niche_id} mono />
      </div>

      <div className="p-[18px_22px]">
        <h3 className="title-bar text-[13px] font-bold uppercase tracking-[.6px] text-ink mb-3">
          Top ASINs ({asins.length}) — Click for details
        </h3>
        {asins.length === 0 ? (
          <div className="text-ink-dim text-sm p-3">No ASIN data for this niche.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {asins.map((a, i) => (
              <div key={a.asin + i} onClick={() => onAsinClick(a)}
                   className="border border-line rounded-lg overflow-hidden bg-card-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(96,165,250,.18)]">
                <div className="bg-white h-[140px] flex items-center justify-center p-2.5">
                  {a.image ? <img src={a.image} alt="" loading="lazy" className="max-w-full max-h-full object-contain" onError={(e)=>(e.currentTarget.style.display="none")} /> : <div className="text-muted">No image</div>}
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] text-ink-dim font-mono">{a.asin}</div>
                  <div className="text-[12px] font-semibold leading-snug my-1 line-clamp-2 text-ink">{a.title}</div>
                  <div className="text-[11px] text-accent font-bold">{a.brand || "—"}</div>
                  <div className="flex justify-between text-[11px] mt-1.5 text-ink-dim">
                    <span className="text-white font-bold text-[14px]">{fmtMoney(a.price)}</span>
                    <span className="text-warn">{fmtStars(a.rating)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1.5 text-ink-dim">
                    <span>{fmtNum(a.reviews)} reviews</span>
                    <span>{fmtNum(a.clicks)} clicks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ l, v, cls = "", mono = false, small = false }:{l:string; v:React.ReactNode; cls?:string; mono?:boolean; small?:boolean}) {
  return (
    <div className="bg-card-2 p-[11px_13px] rounded-lg border border-line transition-all hover:-translate-y-0.5 hover:border-accent">
      <div className="text-[10px] text-ink-dim uppercase tracking-[.4px] font-semibold">{l}</div>
      <div className={`font-bold mt-1 text-white break-words ${cls} ${mono ? "font-mono text-[10px]" : ""} ${small ? "text-[13px]" : "text-[17px]"}`}>{v}</div>
    </div>
  );
}

function AsinModal({ asin: a, onClose }:{asin:Asin; onClose:()=>void}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const url = `https://www.amazon.com/dp/${a.asin}`;
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-5 z-50">
      <div onClick={e => e.stopPropagation()} className="bg-card border border-line rounded-xl max-w-[680px] w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-[0_20px_60px_rgba(0,0,0,.6)]">
        <button onClick={onClose} className="absolute top-3 right-3.5 text-2xl text-ink-dim hover:text-white">×</button>
        {a.image && <img src={a.image} className="w-full max-h-[280px] object-contain bg-white rounded-lg p-3 mb-3.5" alt="" />}
        <h3 className="text-lg font-semibold mb-2 text-white">{a.title}</h3>
        <div className="font-mono text-ink-dim text-xs mb-2.5">ASIN: {a.asin}</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-2.5">
          <Metric l="Brand" v={a.brand || "—"} small />
          <Metric l="Category" v={a.category || "—"} small />
          <Metric l="Avg Price 360d" v={fmtMoney(a.price)} />
          <Metric l="Customer Rating" v={fmtStars(a.rating)} small />
          <Metric l="Total Reviews" v={fmtNum(a.reviews)} />
          <Metric l="Best Seller Rank" v={fmtNum(a.bsr)} />
          <Metric l="Clicks (360d)" v={fmtNum(a.clicks)} />
          <Metric l="Click Share 360d" v={fmtPct(a.click_share)} />
          <Metric l="Launch Date" v={a.launch || "—"} small />
          <Metric l="Status" v={a.status || "—"} small />
        </div>
        <div className="mt-4 text-right">
          <a target="_blank" rel="noopener" href={url}
             className="inline-block px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-gradient-to-br from-[#3b82f6] to-[#6366f1] shadow-[0_2px_10px_rgba(59,130,246,.35)]">
            Open on Amazon →
          </a>
        </div>
      </div>
    </div>
  );
}

