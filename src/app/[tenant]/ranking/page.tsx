import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { Nav } from "@/components/Nav";
import { SponsorBanner } from "@/components/SponsorBanner";
import { UserAvatar } from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session || session.tenantSlug !== tenant.slug) {
    redirect(`/${tenant.slug}/login?next=/${tenant.slug}/ranking`);
  }

  const [users, predictions, masterSponsor] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, fullName: true, photoUrl: true },
    }),
    prisma.prediction.findMany({
      where: { user: { tenantId: tenant.id } },
      select: { userId: true, points: true },
    }),
    prisma.sponsor.findFirst({
      where: { tenantId: tenant.id, placement: "global" },
    }),
  ]);

  const stats = new Map<
    string,
    { points: number; exact: number; outcome: number; bets: number }
  >();
  for (const u of users)
    stats.set(u.id, { points: 0, exact: 0, outcome: 0, bets: 0 });

  for (const p of predictions) {
    const s = stats.get(p.userId);
    if (!s) continue;
    s.bets += 1;
    s.points += p.points;
    if (p.points === 3) s.exact += 1;
    else if (p.points === 1) s.outcome += 1;
  }

  const rows = users
    .map((u) => ({ ...u, ...stats.get(u.id)! }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.exact - a.exact ||
        a.fullName.localeCompare(b.fullName)
    );

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;

  return (
    <>
      <Nav active="/ranking" tenantSlug={tenant.slug} tenantName={tenant.name} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <SponsorBanner
            sponsor={masterSponsor}
            label="Patrocinador Master"
            className="h-20"
          />
        </div>

        <h1 className="mb-4 text-2xl font-extrabold">🏅 Ranking geral</h1>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Participante</th>
                <th className="px-3 py-3 text-center">Exatos</th>
                <th className="px-3 py-3 text-center">Acertos</th>
                <th className="px-4 py-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMe = r.id === session.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-800 ${
                      isMe ? "bg-brand/5 font-semibold" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-base">{medal(i)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          photoUrl={r.photoUrl}
                          name={r.fullName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{r.fullName}</span>
                            {isMe && (
                              <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                                VOCÊ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-emerald-400">
                      {r.exact}
                    </td>
                    <td className="px-3 py-3 text-center text-amber-400">
                      {r.outcome}
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-extrabold text-brand">
                      {r.points}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Ainda não há participantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Placar exato vale 3 pontos · vencedor ou empate vale 1 ponto
        </p>
      </main>
    </>
  );
}
