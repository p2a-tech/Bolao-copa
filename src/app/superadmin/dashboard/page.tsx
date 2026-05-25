import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import { SuperAdminNav } from "@/components/SuperAdminNav";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/superadmin/login");

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { users: true, sponsors: true } },
    },
  });

  const rows = tenants.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    primaryColor: t.primaryColor,
    active: t.active,
    users: t._count.users,
    sponsors: t._count.sponsors,
  }));

  const totalUsers = rows.reduce((acc, r) => acc + r.users, 0);
  const totalSponsors = rows.reduce((acc, r) => acc + r.sponsors, 0);
  const activeAccounts = rows.filter((r) => r.active).length;

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
            Dashboard por cliente
          </h1>
          <p className="text-sm text-slate-400">
            Visão geral de quantos usuários e patrocinadores cada cliente
            (conta conectada) possui hoje.
          </p>
        </div>

        {/* KPIs gerais */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Contas ativas"
            value={`${activeAccounts}`}
            hint={`${rows.length} no total`}
          />
          <KpiCard
            label="Usuários cadastrados"
            value={totalUsers.toLocaleString("pt-BR")}
            hint="somando todos os clientes"
          />
          <KpiCard
            label="Patrocinadores"
            value={totalSponsors.toLocaleString("pt-BR")}
            hint="somando todos os clientes"
          />
        </div>

        {/* Tabela por conta */}
        <section className="mt-6 rounded-xl bg-slate-900 ring-1 ring-white/10">
          <div className="flex items-baseline justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-100">
              Clientes cadastrados
            </h2>
            <span className="text-xs text-slate-400">
              {rows.length} conta(s)
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">
              Nenhuma conta cadastrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Usuários
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Patrocinadores
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-8 w-8 shrink-0 rounded ring-1 ring-black/10"
                            style={{ background: r.primaryColor }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100">
                                {r.name}
                              </span>
                              {!r.active && (
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-300">
                                  suspenso
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/${r.slug}`}
                              target="_blank"
                              className="text-xs text-brand hover:underline"
                            >
                              /{r.slug}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-200">
                        {r.users.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-200">
                        {r.sponsors.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-slate-950/40 text-sm font-bold">
                    <td className="px-5 py-3 text-slate-300">Total</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-100">
                      {totalUsers.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-100">
                      {totalSponsors.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-5 ring-1 ring-white/10">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-100">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
