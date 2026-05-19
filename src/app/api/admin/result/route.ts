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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
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

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, finished: true },
  });

  // Recompute points for every prediction on this match.
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
  });

  await prisma.$transaction(
    predictions.map((p) =>
      prisma.prediction.update({
        where: { id: p.id },
        data: {
          points: scorePrediction(
            p.homeScore,
            p.awayScore,
            homeScore,
            awayScore
          ),
        },
      })
    )
  );

  return NextResponse.json({ ok: true, match });
}
