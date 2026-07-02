import fs from "node:fs/promises";
import path from "node:path";
import InsightsClient, { Insights } from "@/components/InsightsClient";

export const revalidate = 0;

async function loadInsights(): Promise<Insights> {
  const candidates = [
    path.join(process.cwd(), "insights_data.json"),
    path.join(process.cwd(), "..", "insights_data.json"),
  ];
  for (const f of candidates) {
    try {
      return JSON.parse(await fs.readFile(f, "utf-8")) as Insights;
    } catch {}
  }
  throw new Error("insights_data.json not found. Run: python scripts/build_insights.py");
}

export default async function InsightsPage() {
  const data = await loadInsights();
  return <InsightsClient data={data} />;
}
