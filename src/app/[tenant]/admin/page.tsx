import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { Nav } from "@/components/Nav";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { SponsorManager } from "@/components/SponsorManager";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  // O superadmin (dono da plataforma) pode acessar o admin de qualquer tenant
  // — é ele quem lança os resultados, que são globais. O admin de tenant só
  // entra no admin do próprio tenant.
  const isTenantAdmin = !!session?.isAdmin && session.tenantSlug === tenant.slug;
  if (!session || (!session.isSuperAdmin && !isTenantAdmin)) {
    redirect(`/${tenant.slug}/login?next=/${tenant.slug}/admin`);
  }

  const [matches, sponsors, matchSponsors, userCount] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.sponsor.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    }),
    prisma.matchSponsor.findMany({ where: { tenantId: tenant.id } }),
    prisma.user.count({ where: { tenantId: tenant.id } }),
  ]);

  const sponsorByMatch = new Map(
    matchSponsors.map((ms) => [ms.matchId, ms.sponsorId])
  );

  return (
    <>
      <Nav active="/admin" tenantSlug={tenant.slug} tenantName={tenant.name} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold">Painel do administrador</h1>
          <p className="text-sm text-slate-400">
            {matches.length} jogos · {userCount} participantes. Lance os
            resultados para atualizar o ranking automaticamente.
          </p>
        </div>

        <SponsorManager
          sponsors={sponsors.map((s) => ({
            id: s.id,
            name: s.name,
            logoUrl: s.logoUrl,
            linkUrl: s.linkUrl,
            placement: s.placement,
          }))}
        />

        <h2 className="mb-3 text-lg font-bold">Jogos e resultados</h2>
        <div className="space-y-3">
          {matches.map((m) => (
            <AdminMatchRow
              key={m.id}
              canEditResult={session.isSuperAdmin}
              sponsors={sponsors.map((s) => ({ id: s.id, name: s.name }))}
              match={{
                id: m.id,
                stage: m.stage,
                kickoffISO: m.kickoff.toISOString(),
                home: { name: m.homeTeam.name, code: m.homeTeam.code },
                away: { name: m.awayTeam.name, code: m.awayTeam.code },
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                finished: m.finished,
                sponsorId: sponsorByMatch.get(m.id) ?? null,
              }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
