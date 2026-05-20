import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLiveMatch } from "@/lib/livescore";
import {
  GROUP_LETTERS,
  buildGroupStandings,
  type GroupMatchInput,
} from "@/lib/standings";

export const dynamic = "force-dynamic";

const LIVE_CONCURRENCY = 8;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: { stage: { startsWith: "Fase de Grupos" } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  const inputs: GroupMatchInput[] = matches.map((m) => ({
    id: m.id,
    kickoff: m.kickoff,
    finished: m.finished,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
  }));

  const now = Date.now();
  const needsLive = matches.filter(
    (m) =>
      !m.finished ||
      m.homeScore == null ||
      m.kickoff.getTime() <= now + 3 * 60 * 60 * 1000
  );

  const liveEntries = await mapPool(needsLive, LIVE_CONCURRENCY, async (m) => {
    const live = await getLiveMatch({
      id: m.id,
      kickoff: m.kickoff,
      externalId: m.externalId,
    });
    return [m.id, live] as const;
  });

  const liveByMatchId = new Map(liveEntries);

  const groups = GROUP_LETTERS.map((letter) =>
    buildGroupStandings(letter, inputs, liveByMatchId)
  );

  const hasLive = groups.some((g) =>
    g.fixtures.some((f) => f.status === "live" || f.status === "halftime")
  );

  const provider = liveEntries.some(([, l]) => l.provider === "api-football")
    ? "api-football"
    : "demo";

  return NextResponse.json(
    {
      groups,
      hasLive,
      provider,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
