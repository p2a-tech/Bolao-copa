import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint do super admin pra gerenciar "jogos ao vivo" — fixtures avulsos
 * (fora da Copa) que o operador adiciona pra acompanhar em tempo real.
 *
 * GET    /api/superadmin/live-match            -> lista (lives na API + adicionados)
 * POST   /api/superadmin/live-match            -> cria a partir de fixture id
 * DELETE /api/superadmin/live-match?id=<mid>  -> remove
 *
 * Convenção: matches criados aqui tem stage começando com "AO VIVO AGORA -"
 * pra serem identificáveis e isolados dos 72 da Copa.
 */

const API_BASE = "https://v3.football.api-sports.io";
const LIVE_STAGE_PREFIX = "AO VIVO AGORA -";

async function fetchFromAPI(endpoint: string) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY não configurada no servidor.");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football retornou ${res.status}`);
  return res.json();
}

function slugCode(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function getOrCreateTeam(name: string, league: string): Promise<string> {
  // Tenta achar por nome exato primeiro (pode já existir nos 48 da Copa)
  const existing = await prisma.team.findFirst({ where: { name } });
  if (existing) return existing.id;

  // Cria com code derivado do nome + sufixo aleatório se conflitar
  let code = slugCode(name);
  let attempts = 0;
  while (attempts < 5) {
    try {
      const created = await prisma.team.create({
        data: { name, code, group: league.slice(0, 40) || "Live" },
      });
      return created.id;
    } catch (e: any) {
      if (e?.code === "P2002") {
        attempts++;
        code = `${slugCode(name)}-${randomUUID().slice(0, 4)}`;
      } else {
        throw e;
      }
    }
  }
  throw new Error("Não foi possível criar o time (conflito de code).");
}

export async function GET() {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // Lista dos jogos ao vivo agora na API
    const apiData = await fetchFromAPI("/fixtures?live=all");
    const live = (apiData?.response ?? []).map((fx: any) => ({
      fixtureId: String(fx?.fixture?.id),
      league: fx?.league?.name,
      country: fx?.league?.country,
      round: fx?.league?.round,
      status: fx?.fixture?.status?.short,
      elapsed: fx?.fixture?.status?.elapsed,
      home: fx?.teams?.home?.name,
      away: fx?.teams?.away?.name,
      goalsHome: fx?.goals?.home,
      goalsAway: fx?.goals?.away,
    }));

    // Matches já adicionados pelo operador
    const added = await prisma.match.findMany({
      where: { stage: { startsWith: LIVE_STAGE_PREFIX } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoff: "desc" },
    });

    return NextResponse.json({
      live,
      added: added.map((m) => ({
        id: m.id,
        externalId: m.externalId,
        stage: m.stage,
        venue: m.venue,
        kickoff: m.kickoff,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro ao consultar API-Football" },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  fixtureId: z
    .string()
    .trim()
    .regex(/^\d+$/, "fixtureId deve ser numérico"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { fixtureId } = parsed.data;

  try {
    // Idempotência: se já existe um Match com esse externalId, retorna ele
    const existing = await prisma.match.findFirst({
      where: { externalId: fixtureId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (existing) {
      return NextResponse.json({ matchId: existing.id, reused: true });
    }

    // Busca fixture na API
    const data = await fetchFromAPI(`/fixtures?id=${encodeURIComponent(fixtureId)}`);
    const fx = data?.response?.[0];
    if (!fx) {
      return NextResponse.json(
        { error: `Fixture ${fixtureId} não encontrado na API-Football.` },
        { status: 404 }
      );
    }

    const homeName: string = fx?.teams?.home?.name;
    const awayName: string = fx?.teams?.away?.name;
    const league: string = fx?.league?.name ?? "Live";
    const round: string = fx?.league?.round ?? "";
    const venueName: string | null = fx?.fixture?.venue?.name ?? null;
    const venueCity: string | null = fx?.fixture?.venue?.city ?? null;
    const kickoff: string = fx?.fixture?.date;

    if (!homeName || !awayName || !kickoff) {
      return NextResponse.json(
        { error: "Resposta da API sem dados essenciais." },
        { status: 502 }
      );
    }

    const homeTeamId = await getOrCreateTeam(homeName, league);
    const awayTeamId = await getOrCreateTeam(awayName, league);

    const venue = venueName
      ? venueCity
        ? `${venueName}, ${venueCity}`
        : venueName
      : "Estádio";
    const stage = `${LIVE_STAGE_PREFIX} ${league}${round ? ` (${round})` : ""}`.slice(0, 120);

    const match = await prisma.match.create({
      data: {
        stage,
        venue,
        kickoff: new Date(kickoff),
        homeTeamId,
        awayTeamId,
        externalId: fixtureId,
        finished: false,
      },
    });

    return NextResponse.json({ matchId: match.id, reused: false });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro ao criar match" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  // Só permite remover matches "live-adicionados" (não os da Copa)
  const m = await prisma.match.findUnique({ where: { id } });
  if (!m) {
    return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });
  }
  if (!m.stage.startsWith(LIVE_STAGE_PREFIX)) {
    return NextResponse.json(
      { error: "Match não é live-adicionado (proteção pra não apagar jogos da Copa)" },
      { status: 403 }
    );
  }

  // Remove predictions, matchSponsors e o match em transação
  await prisma.$transaction([
    prisma.prediction.deleteMany({ where: { matchId: id } }),
    prisma.matchSponsor.deleteMany({ where: { matchId: id } }),
    prisma.match.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
