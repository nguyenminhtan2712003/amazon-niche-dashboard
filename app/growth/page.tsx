import { fetchSnapshot } from "@/lib/api";
import GrowthClient from "@/components/GrowthClient";

export const revalidate = 300;

export default async function GrowthPage() {
  const data = await fetchSnapshot();
  return <GrowthClient data={data} />;
}
