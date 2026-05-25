import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { predictionSchema } from "@/lib/validation";
import { isLocked } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = predictionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Palpite inválido" },
      { status: 400 }
    );
  }

  const { matchId, homeScore, awayScore } = parsed.data;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json(
      { error: "Jogo não encontrado" },
      { status: 404 }
    );
  }

  if (match.finished || isLocked(match.kickoff)) {
    return NextResponse.json(
      {
        error:
          "Os palpites para este jogo estão bloqueados (faltam menos de 30 minutos para o início).",
      },
      { status: 423 }
    );
  }

  // Não permite reenvio do mesmo placar para o mesmo jogo. O usuário pode
  // editar para outro placar; só não pode "salvar" exatamente o que já está.
  const existing = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.id, matchId } },
  });
  if (
    existing &&
    existing.homeScore === homeScore &&
    existing.awayScore === awayScore
  ) {
    return NextResponse.json(
      {
        error: `Você já deu este palpite (${homeScore} x ${awayScore}) para este jogo.`,
        code: "DUPLICATE_PREDICTION",
        prediction: existing,
      },
      { status: 409 }
    );
  }

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchId: { userId: session.id, matchId },
    },
    update: { homeScore, awayScore },
    create: {
      userId: session.id,
      matchId,
      homeScore,
      awayScore,
    },
  });

  return NextResponse.json({ ok: true, prediction });
}
