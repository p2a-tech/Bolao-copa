import { PrismaClient } from "@prisma/client";
import { scorePrediction } from "../src/lib/scoring";

/**
 * Cria 10 palpites de exemplo para um usuário, cobrindo todos os status
 * possíveis exibidos na tela "Meus palpites".
 */
export async function seedDemoPredictions(
  prisma: PrismaClient,
  userEmail: string,
  tenantId: string
): Promise<number> {
  // Após BUG #11: email não é mais @unique global, usar findFirst com tenant.
  const user = await prisma.user.findFirst({
    where: { email: userEmail, tenantId },
  });
  if (!user) {
    console.warn(
      `seedDemoPredictions: usuário ${userEmail} não encontrado neste tenant.`
    );
    return 0;
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    take: 10,
  });
  if (matches.length < 10) return 0;

  const now = new Date();
  const dayAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  type Scenario = {
    index: number;
    finished: boolean;
    kickoff: Date | null;
    real?: { home: number; away: number };
    pred: { home: number; away: number };
  };

  const scenarios: Scenario[] = [
    {
      index: 0,
      finished: true,
      kickoff: dayAgo(8),
      real: { home: 2, away: 1 },
      pred: { home: 2, away: 1 },
    },
    {
      index: 1,
      finished: true,
      kickoff: dayAgo(7),
      real: { home: 0, away: 0 },
      pred: { home: 0, away: 0 },
    },
    {
      index: 2,
      finished: true,
      kickoff: dayAgo(6),
      real: { home: 3, away: 1 },
      pred: { home: 2, away: 0 },
    },
    {
      index: 3,
      finished: true,
      kickoff: dayAgo(5),
      real: { home: 1, away: 2 },
      pred: { home: 0, away: 3 },
    },
    {
      index: 4,
      finished: true,
      kickoff: dayAgo(4),
      real: { home: 0, away: 2 },
      pred: { home: 2, away: 0 },
    },
    {
      index: 5,
      finished: true,
      kickoff: dayAgo(3),
      real: { home: 1, away: 1 },
      pred: { home: 2, away: 0 },
    },
    {
      index: 6,
      finished: false,
      kickoff: dayAgo(2),
      pred: { home: 1, away: 0 },
    },
    {
      index: 7,
      finished: false,
      kickoff: dayAgo(1),
      pred: { home: 2, away: 2 },
    },
    {
      index: 8,
      finished: false,
      kickoff: null,
      pred: { home: 3, away: 1 },
    },
    {
      index: 9,
      finished: false,
      kickoff: null,
      pred: { home: 1, away: 0 },
    },
  ];

  for (const s of scenarios) {
    const match = matches[s.index];
    if (!match) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        finished: s.finished,
        homeScore: s.real?.home ?? null,
        awayScore: s.real?.away ?? null,
        ...(s.kickoff ? { kickoff: s.kickoff } : {}),
      },
    });

    const points =
      s.finished && s.real
        ? scorePrediction(s.pred.home, s.pred.away, s.real.home, s.real.away)
        : 0;

    await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId: user.id, matchId: match.id },
      },
      update: {
        homeScore: s.pred.home,
        awayScore: s.pred.away,
        points,
      },
      create: {
        userId: user.id,
        matchId: match.id,
        homeScore: s.pred.home,
        awayScore: s.pred.away,
        points,
      },
    });
  }

  return scenarios.length;
}
