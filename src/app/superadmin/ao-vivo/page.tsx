import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { LiveMatchManager } from "@/components/LiveMatchManager";

export const dynamic = "force-dynamic";

export default async function SuperAdminLivePage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/superadmin/login");

  return (
    <main className="min-h-screen bg-white/5">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <span className="font-extrabold tracking-tight text-slate-100">
              Painel do operador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <SuperAdminNav />
        <h1 className="mb-2 text-2xl font-extrabold text-slate-100">
          Jogos ao vivo
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          Adicione qualquer fixture da API-Football pra acompanhar em tempo
          real no app. Útil pra demonstrar a tela ao vivo antes da Copa
          começar, ou pra eventos paralelos. O placar e os eventos são puxados
          automaticamente da API-Football.
        </p>
        <LiveMatchManager />
      </div>
    </main>
  );
}
