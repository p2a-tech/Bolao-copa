import { PrismaClient } from "@prisma/client";
import { scorePrediction } from "../src/lib/scoring";

/**
 * Cria 10 palpites de exemplo para um usuário, cobrindo todos os
 * status possíveis exibidos na tela "Meus palpites":
 *
 *   - 2× placar exato      (jogo finalizado, palpite igual ao resultado)
 *   - 2× acertou vencedor  (jogo finalizado, mesmo lado vencedor mas placar diferente)
 *   - 2× errou             (jogo finalizado, palpite errado)
 *   - 2× aguardando resultado (kickoff no passado, finished=false)
 *   - 2× pendente (open)   (kickoff no futuro, finished=false)
 *
 * Para criar os status "finalizados", os jogos selecionados são marcados como
 * `finished=true` com placares definidos. Para "aguardando resultado", o
 * kickoff é deslocado para o passado mas finished permanece false.
 */
export async function seedDemoPredictions(
  prisma: PrismaClient,
  userEmail: string,
  tenantId: string
): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user || user.tenantId !== tenantId) {
    console.warn(
      `seedDemoPredictions: usuário ${userEmail} não encontrado neste tenant.`
    );
    return 0;
  }

  // Pega os 10 primeiros jogos por kickoff (já criados no seed principal).
  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    take: 10,
  });
  if (matches.length < 10) return 0;

  const now = new Date();
  const dayAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Define cada um dos 10 cenários. real = resultado oficial; pred = o que
  // Maria chutou.
  type Scenario = {
    index: number;
    finished: boolean;
    /** kickoff to set (null = manter o original). */
    kickoff: Date | null;
    real?: { home: number; away: number };
    pred: { home: number; away: number };
  };

  const scenarios: Scenario[] = [
    // 2× PLACAR EXATO (finished + pred == real)
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
    // 2× ACERTOU VENCEDOR (finished + mesmo sign mas placar diferente)
    {
      index: 2,
      finished: true,
      kickoff: dayAgo(6),
      real: { home: 3, away: 1 },
      pred: { home: 2, away: 0 }, // ambos: mandante vence
    },
    {
      index: 3,
      finished: true,
      kickoff: dayAgo(5),
      real: { home: 1, away: 2 },
      pred: { home: 0, away: 3 }, // ambos: visitante vence
    },
    // 2× ERROU (finished + sign diferente)
    {
      index: 4,
      finished: true,
      kickoff: dayAgo(4),
      real: { home: 0, away: 2 },
      pred: { home: 2, away: 0 }, // chutou mandante, deu visitante
    },
    {
      index: 5,
      finished: true,
      kickoff: dayAgo(3),
      real: { home: 1, away: 1 },
      pred: { home: 2, away: 0 }, // chutou mandante, deu empate
    },
    // 2× AGUARDANDO RESULTADO (locked: kickoff no passado, finished=false)
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
    // 2× PENDENTE (open: kickoff no futuro, sem mexer)
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

    // Atualiza o jogo conforme o cenário.
    await prisma.match.update({
      where: { id: match.id },
      data: {
        finished: s.finished,
        homeScore: s.real?.home ?? null,
        awayScore: s.real?.away ?? null,
        ...(s.kickoff ? { kickoff: s.kickoff } : {}),
      },
    });

    // Calcula pontos do palpite quando finalizado.
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
