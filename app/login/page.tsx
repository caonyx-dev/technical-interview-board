import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-xl">
        <h1 className="text-xl font-semibold mb-1">Caonyx Interview</h1>
        <p className="text-sm text-zinc-400 mb-6">Interviewer sign-in</p>
        <LoginForm />
      </div>
    </main>
  );
}
