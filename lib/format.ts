import type { Segment } from "./types";

/**
 * Locale-independent integer formatter (regex-based, no Intl/ICU dependency).
 * Avoids hydration mismatch between server (Vietnamese locale) and browser (en-US).
 */
export const fmtInt = (n: number | null | undefined): string => {
  if (n == null || isNaN(n as number)) return "-";
  const num = Math.trunc(n as number);
  const abs = String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return num < 0 ? "-" + abs : abs;
};

export const fmtNum = (v: number | null | undefined): string => {
  if (v == null || isNaN(v as number)) return "-";
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return fmtInt(n);
};

export const fmtMoney = (v: number | null | undefined): string => {
  if (v == null || isNaN(v as number)) return "-";
  return "$" + Number(v).toFixed(2);
};

export const fmtPct = (v: number | null | undefined, withSign = false): string => {
  if (v == null || isNaN(v as number)) return "-";
  const n = Number(v);
  const sign = withSign && n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};

export const fmtStars = (r: number | null | undefined): string => {
  if (r == null || isNaN(r as number)) return "-";
  const n = Math.round(r as number);
  return "*".repeat(n) + ".".repeat(5 - n) + " " + Number(r).toFixed(1);
};

export const segmentOf = (g: number | null): Segment => {
  if (g == null) return "na";
  if (g >= 5) return "hot";
  if (g >= 1) return "rising";
  if (g > -1) return "stable";
  if (g > -5) return "cool";
  return "dec";
};

export const SEG_COLOR: Record<Segment, string> = {
  hot: "#fb923c",
  rising: "#4ade80",
  stable: "#60a5fa",
  cool: "#94a3b8",
  dec: "#f87171",
  na: "#475569",
};

export const SEG_LABEL: Record<Segment, string> = {
  hot: "Hot",
  rising: "Rising",
  stable: "Stable",
  cool: "Cooling",
  dec: "Declining",
  na: "N/A",
};

export const COMPARE_PALETTE = [
  "#60a5fa",
  "#4ade80",
  "#fb923c",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
];
