import Dashboard from "@/components/Dashboard";
import { sessionStore } from "@/lib/sessionStore";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessions = await sessionStore.list();
  return <Dashboard initialSessions={sessions} />;
}
