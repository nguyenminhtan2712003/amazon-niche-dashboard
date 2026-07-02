import { fetchSnapshot } from "@/lib/api";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 300; // cache 5 min

export default async function Page() {
  const data = await fetchSnapshot();
  return <DashboardClient data={data} />;
}
