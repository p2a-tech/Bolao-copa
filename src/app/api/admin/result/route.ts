import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { scorePrediction } from "@/lib/scoring";
import { z } from "zod";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

/**
 * Fix BUGS #5 e #7 (alta severidade):
 *
 * Jogos (Match) são GLOBAIS (compartilhados entre todos os tenants).
 * Antes, qualquer admin de qualquer tenant podia chamar essa rota e
 * alterar o resultado de qualquer jogo, recalculando pontos pra todos
 * os tenants — sabotagem cross-tenant.
 *
 * Agora a rota é restrita ao SUPERADMIN. Também envelopa o update do
 * Match + recálculo das predictions na MESMA transação atômica, pra
 * impedir estados inconsistentes se algo falhar no meio.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json(
      {
        error:
          "Acesso negado. Apenas o super admin pode lançar resultados (jogos são globais).",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  // Verifica existência antes de modificar (evita "update silencioso").
  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) {
    return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
  }

  // Atomicidade: update do jogo + recálculo de TODAS as predictions
  // numa única transação. Se algum update de prediction falhar, tudo
  // volta atrás.
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { id: true, homeScore: true, awayScore: true },
  });

  const result = await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: { homeScore, awayScore, finished: true },
    }),
    ...predictions.map((p) =>
      prisma.prediction.update({
        where: { id: p.id },
        data: {
          points: scorePrediction(p.homeScore, p.awayScore, homeScore, awayScore),
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true, match: result[0] });
}
