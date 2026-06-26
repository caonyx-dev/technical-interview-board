import { notFound } from "next/navigation";
import SessionRoom from "@/components/SessionRoom";
import { getInterviewerFromCookies } from "@/lib/auth";
import { sessionStore } from "@/lib/sessionStore";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionStore.get(id);
  if (!session) notFound();

  const isInterviewer = await getInterviewerFromCookies();
  const role = isInterviewer ? "interviewer" : "interviewee";

  return <SessionRoom sessionId={id} role={role} />;
}
