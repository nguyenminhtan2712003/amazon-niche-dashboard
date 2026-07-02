"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header({
  title,
  subtitle,
  right,
  variant = "blue",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  variant?: "blue" | "green";
}) {
  const cls = variant === "green" ? "gradient-text-green" : "gradient-text";
  return (
    <header className="bg-gradient-to-br from-[#101a35] via-[#131c3a] to-[#0d1726] border border-line rounded-xl shadow-card px-7 py-5 mb-4 flex flex-wrap justify-between items-center gap-3">
      <div>
        <h1 className={`text-[22px] font-bold ${cls}`}>{title}</h1>
        {subtitle && <div className="text-[13px] text-ink-dim mt-1">{subtitle}</div>}
      </div>
      {right}
    </header>
  );
}

export function Nav() {
  const path = usePathname();
  const link = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`px-[18px] py-[10px] rounded-lg text-[13px] font-semibold transition-all border ${
        active
          ? "bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white border-transparent shadow-[0_4px_14px_rgba(59,130,246,.4)]"
          : "bg-card border-line text-ink-dim hover:text-ink hover:bg-card-h"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex gap-2 mb-4">
      {link("/", "📊 Overview & ASINs", path === "/")}
      {link("/growth", "📈 Growth Analysis", path?.startsWith("/growth") ?? false)}
      {link("/insights", "💡 Market Insights", path?.startsWith("/insights") ?? false)}
    </nav>
  );
}

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1500px] mx-auto p-[18px]">{children}</div>;
}

export function Card({
  title,
  desc,
  className = "",
  children,
}: {
  title?: string;
  desc?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-card border border-line rounded-xl shadow-card p-5 ${className}`}>
      {title && (
        <h3 className="title-bar text-[13px] font-bold tracking-[.6px] uppercase text-ink mb-3">{title}</h3>
      )}
      {desc && <div className="text-[12px] text-ink-dim -mt-2 ml-3 mb-3">{desc}</div>}
      {children}
    </div>
  );
}

export function Footer({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-[12px] text-muted py-[18px]">{children}</div>;
}

export function Pill({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "pos" | "neg" }) {
  const map = {
    default: "bg-[rgba(160,170,200,.15)] text-[#cbd5e1] border border-[rgba(160,170,200,.2)]",
    pos: "bg-[rgba(74,222,128,.18)] text-[#86efac] border border-[rgba(74,222,128,.3)]",
    neg: "bg-[rgba(248,113,113,.18)] text-[#fca5a5] border border-[rgba(248,113,113,.3)]",
  } as const;
  return (
    <span className={`inline-block px-[6px] py-[1px] rounded text-[10px] font-bold uppercase tracking-[.3px] ${map[color]}`}>
      {children}
    </span>
  );
}
