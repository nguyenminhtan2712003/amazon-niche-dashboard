import { NextResponse } from "next/server";
import { fetchSnapshot } from "@/lib/api";

export const revalidate = 300; // 5 min ISR cache; override per-call via headers

export async function GET() {
  try {
    const data = await fetchSnapshot();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
