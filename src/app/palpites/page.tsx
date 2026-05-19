import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { SponsorBanner } from "@/components/SponsorBanner";
import { MatchCard, type MatchCardData } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

function dayKey(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default async function PalpitesPage() {
  const session = (await getSession())!;

  const [matches, predictions, masterSponsor, totalPoints] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true, sponsor: true },
    }),
    prisma.prediction.findMany({ where: { userId: session.id } }),
    prisma.sponsor.findFirst({ where: { placement: "global" } }),
    prisma.prediction.aggregate({
      where: { userId: session.id },
      _sum: { points: true },
    }),
  ]);

  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const cards: MatchCardData[] = matches.map((m) => {
    const pred = predByMatch.get(m.id);
    return {
      id: m.id,
      stage: m.stage,
      venue: m.venue,
      kickoffISO: m.kickoff.toISOString(),
      home: { name: m.homeTeam.name, code: m.homeTeam.code },
      away: { name: m.awayTeam.name, code: m.awayTeam.code },
      finished: m.finished,
      realHome: m.homeScore,
      realAway: m.awayScore,
      predHome: pred?.homeScore ?? null,
      predAway: pred?.awayScore ?? null,
      points: pred?.points ?? null,
      sponsor: m.sponsor
        ? {
            name: m.sponsor.name,
            logoUrl: m.sponsor.logoUrl,
            linkUrl: m.sponsor.linkUrl,
          }
        : null,
    };
  });

  // group by calendar day
  const groups = new Map<string, MatchCardData[]>();
  for (const c of cards) {
    const key = dayKey(new Date(c.kickoffISO));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const made = predictions.length;

  return (
    <>
      <Nav active="/palpites" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <SponsorBanner
            sponsor={masterSponsor}
            label="Patrocinador Master"
            className="h-20"
          />
        </div>

        <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h1 className="text-xl font-bold">
              Olá, {session.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-500">
              {made} de {matches.length} jogos palpitados
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-brand">
              {totalPoints._sum.points ?? 0}
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              pontos
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="card p-3">
            <div className="text-lg font-bold text-emerald-600">3 pts</div>
            <div className="text-xs text-slate-500">placar exato</div>
          </div>
          <div className="card p-3">
            <div className="text-lg font-bold text-amber-600">1 pt</div>
            <div className="text-xs text-slate-500">vencedor/empate</div>
          </div>
          <div className="card p-3">
            <div className="text-lg font-bold text-slate-500">🔒 30min</div>
            <div className="text-xs text-slate-500">antes do jogo</div>
          </div>
        </div>

        <div className="space-y-8">
          {Array.from(groups.entries()).map(([day, dayCards]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                {day}
              </h2>
              <div className="space-y-4">
                {dayCards.map((c) => (
                  <MatchCard key={c.id} data={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
