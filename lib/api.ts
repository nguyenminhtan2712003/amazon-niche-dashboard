import type { Snapshot } from "./types";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Load dashboard snapshot. Has two modes:
 *
 *  MODE A — Static file (LOCAL DEV, no backend needed):
 *      If FASTAPI_URL is empty/missing, read `dashboard_data.json` directly
 *      from filesystem. By default looks at ../dashboard_data.json relative
 *      to where Next.js runs (i.e. project root / parent folder).
 *      Override with env DATA_FILE_PATH=/absolute/path/to/file.json
 *
 *  MODE B — FastAPI backend (PRODUCTION, e.g. on Vercel):
 *      If FASTAPI_URL is set, fetch /api/snapshot with X-API-Key header.
 *      Uses Next.js ISR (revalidate seconds = SNAPSHOT_REVALIDATE).
 */
export async function fetchSnapshot(): Promise<Snapshot> {
  const url = (process.env.FASTAPI_URL || "").trim();
  const key = process.env.FASTAPI_KEY;
  const revalidate = parseInt(process.env.SNAPSHOT_REVALIDATE ?? "300", 10);

  // ---------- Mode A: static file ----------
  if (!url) {
    const candidates: string[] = [];
    if (process.env.DATA_FILE_PATH) candidates.push(process.env.DATA_FILE_PATH);
    candidates.push(path.join(process.cwd(), "dashboard_data.json"));
    candidates.push(path.join(process.cwd(), "..", "dashboard_data.json"));
    candidates.push(path.join(process.cwd(), "..", "..", "dashboard_data.json"));

    let lastErr: unknown = null;
    for (const file of candidates) {
      try {
        const text = await fs.readFile(file, "utf-8");
        return JSON.parse(text) as Snapshot;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      `Static mode: dashboard_data.json not found. Tried:\n  ` +
      candidates.join("\n  ") +
      `\n\nFix: set FASTAPI_URL in .env.local to use the API, or set ` +
      `DATA_FILE_PATH to the JSON file path. Last error: ${String(lastErr)}`
    );
  }

  // ---------- Mode B: FastAPI ----------
  if (!key) {
    throw new Error("FASTAPI_KEY must be set when FASTAPI_URL is configured.");
  }
  const opts = {
    headers: { "X-API-Key": key },
    next: { revalidate: isFinite(revalidate) ? revalidate : 300 },
  } as RequestInit;
  const r = await fetch(`${url.replace(/\/$/, "")}/api/snapshot`, opts);
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`FastAPI returned ${r.status}: ${body.slice(0, 200)}`);
  }
  return (await r.json()) as Snapshot;
}
