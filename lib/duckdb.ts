/**
 * DuckDB read-only connection singleton.
 * Opens niche.duckdb (built by scripts/build_duckdb.py).
 */
import path from "node:path";
import fs from "node:fs";

let _db: any = null;
let _conn: any = null;

const DB_PATH = process.env.DUCKDB_PATH
  || path.join(process.cwd(), "niche.duckdb");

async function init() {
  if (_conn) return _conn;
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`niche.duckdb not found at ${DB_PATH}. Run scripts/build_duckdb.py first.`);
  }
  const duckdb = (await import("duckdb")).default;
  _db = new duckdb.Database(DB_PATH, { access_mode: "READ_ONLY" });
  _conn = _db.connect();
  return _conn;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const conn = await init();
  return new Promise<T[]>((resolve, reject) => {
    conn.all(sql, ...params, (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      const norm = rows.map(r => {
        const out: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          out[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return out;
      });
      resolve(norm as T[]);
    });
  });
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
