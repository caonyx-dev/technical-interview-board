import { redirect } from "next/navigation";
import { getInterviewerFromCookies } from "@/lib/auth";

export default async function Home() {
  const role = await getInterviewerFromCookies();
  redirect(role ? "/dashboard" : "/login");
}
