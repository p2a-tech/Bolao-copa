import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import { TenantManager } from "@/components/TenantManager";
import { SuperAdminNav } from "@/components/SuperAdminNav";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/superadmin/login");

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, sponsors: true } },
    },
  });

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

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-100">
            Clientes (bolões)
          </h1>
          <p className="text-sm text-slate-400">
            Cadastre influenciadores/marcas. Cada cliente acessa em{" "}
            <code className="rounded bg-slate-800 px-1">/seu-slug</code> com
            sua própria comunidade, patrocinadores e marca.
          </p>
        </div>

        <TenantManager
          tenants={tenants.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            primaryColor: t.primaryColor,
            logoUrl: t.logoUrl,
            active: t.active,
            users: t._count.users,
            sponsors: t._count.sponsors,
            createdAt: t.createdAt.toISOString(),
          }))}
        />

        <p className="mt-6 text-center text-xs text-slate-400">
          Resultados dos jogos da Copa são globais (compartilhados entre
          clientes); marca, patrocinadores e palpites são isolados por cliente.
        </p>
      </div>
    </main>
  );
}
