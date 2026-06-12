import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scorePrediction } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron de sincronização de resultados (API-Football → banco).
 *
 * Roda em intervalo fixo (ver `crons` no vercel.json) e faz o que o script
 * manual `scripts/sync-wc2026-results.mjs` fazia só sob demanda: puxa o placar
 * final dos jogos que já aconteceram e RECALCULA os pontos de todos os palpites
 * — é isso que mantém o ranking atualizado sozinho.
 *
 * Proteção: o Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`
 * automaticamente quando a env CRON_SECRET está configurada. Se ela existir,
 * exigimos esse header (impede que qualquer um dispare a rota publicamente).
 */

const API_BASE = "https://v3.football.api-sports.io";
// Status "finalizado" segundo a API-Football.
const FINISHED = new Set(["FT", "AET", "PEN"]);

async function fetchFixture(extId: string, key: string) {
  const res = await fetch(`${API_BASE}/fixtures?id=${encodeURIComponent(extId)}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football retornou ${res.status}`);
  const data = await res.json();
  return data?.response?.[0] ?? null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Sem secret configurado: não bloqueia (útil em dev/local). Em produção,
  // configure CRON_SECRET para travar a rota.
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  // Só jogos que (a) têm fixture mapeado, (b) ainda não foram finalizados no
  // nosso banco e (c) o horário já passou. Isso mantém o número de chamadas à
  // API baixo: assim que um jogo é pontuado ele vira finished=true e sai da
  // lista nas próximas execuções.
  const now = new Date();
  const matches = await prisma.match.findMany({
    where: {
      externalId: { not: null },
      finished: false,
      kickoff: { lte: now },
    },
    include: { predictions: { select: { id: true, homeScore: true, awayScore: true } } },
    orderBy: { kickoff: "asc" },
  });

  let updatedMatches = 0;
  let updatedPredictions = 0;
  let stillRunning = 0;
  const errors: string[] = [];

  for (const m of matches) {
    let fx: any;
    try {
      fx = await fetchFixture(m.externalId!, key);
    } catch (e: any) {
      errors.push(`${m.id}: ${e?.message ?? "erro de fetch"}`);
      continue;
    }
    if (!fx) {
      errors.push(`${m.id}: fixture ${m.externalId} não retornou`);
      continue;
    }

    const short: string | undefined = fx?.fixture?.status?.short;
    const hScore = fx?.goals?.home;
    const aScore = fx?.goals?.away;

    if (!FINISHED.has(short ?? "")) {
      stillRunning++;
      continue;
    }
    if (hScore == null || aScore == null) {
      errors.push(`${m.id}: finalizado sem placar`);
      continue;
    }

    // Atualiza o jogo + recalcula os pontos de TODOS os palpites numa
    // transação atômica (mesma garantia da rota /api/admin/result).
    await prisma.$transaction([
      prisma.match.update({
        where: { id: m.id },
        data: { homeScore: hScore, awayScore: aScore, finished: true },
      }),
      ...m.predictions.map((p) =>
        prisma.prediction.update({
          where: { id: p.id },
          data: { points: scorePrediction(p.homeScore, p.awayScore, hScore, aScore) },
        })
      ),
    ]);

    updatedMatches++;
    updatedPredictions += m.predictions.length;
  }

  return NextResponse.json(
    {
      ok: true,
      checked: matches.length,
      updatedMatches,
      updatedPredictions,
      stillRunning,
      errors,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
