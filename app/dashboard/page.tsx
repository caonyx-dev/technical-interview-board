import Dashboard from "@/components/Dashboard";
import { sessionStore } from "@/lib/sessionStore";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const sessions = sessionStore.list();
  return <Dashboard initialSessions={sessions} />;
}
