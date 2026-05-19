import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { AdminMatchRow } from "@/components/AdminMatchRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = (await getSession())!;

  const [matches, sponsors, userCount] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.sponsor.findMany({ orderBy: { name: "asc" } }),
    prisma.user.count(),
  ]);

  return (
    <>
      <Nav active="/admin" />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold">Painel do administrador</h1>
          <p className="text-sm text-slate-500">
            {matches.length} jogos · {userCount} participantes. Lance os
            resultados para atualizar o ranking automaticamente.
          </p>
        </div>

        <div className="space-y-3">
          {matches.map((m) => (
            <AdminMatchRow
              key={m.id}
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
                sponsorId: m.sponsorId,
              }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
