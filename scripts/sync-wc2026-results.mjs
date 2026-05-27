import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = "https://v3.football.api-sports.io";

// Status "finalizado" segundo a API-Football
const FINISHED = new Set(["FT", "AET", "PEN"]);

/**
 * Calcula os pontos de um palpite:
 *   - placar exato                -> 3 pontos
 *   - acertou resultado (vencedor ou empate) -> 1 ponto
 *   - errou tudo                  -> 0
 */
function calcPoints(predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 3;
  const predResult = Math.sign(predHome - predAway);
  const realResult = Math.sign(realHome - realAway);
  if (predResult === realResult) return 1;
  return 0;
}

async function fetchFixture(extId) {
  const url = `${API_BASE}/fixtures?id=${encodeURIComponent(extId)}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  const data = await res.json();
  return data?.response?.[0] ?? null;
}

async function main() {
  if (!API_KEY) {
    console.error("X API_FOOTBALL_KEY nao esta no .env");
    process.exit(1);
  }

  // Pega todos os matches que tem externalId (foram mapeados via map-api-football-fixtures)
  // e ainda nao estao marcados como finalizados (ou para forcar refresh, remova o filtro finished)
  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    include: { homeTeam: true, awayTeam: true, predictions: true },
    orderBy: { kickoff: "asc" },
  });
  console.log(`Encontrados ${matches.length} matches com externalId.`);

  let checked = 0;
  let updatedMatches = 0;
  let updatedPredictions = 0;
  let stillScheduled = 0;
  let liveCount = 0;

  for (const m of matches) {
    checked++;
    const fx = await fetchFixture(m.externalId);
    if (!fx) {
      console.log(`  ?  ${m.homeTeam.name} x ${m.awayTeam.name}: fixture ${m.externalId} nao retornou da API`);
      continue;
    }

    const short = fx?.fixture?.status?.short;
    const hScore = fx?.goals?.home;
    const aScore = fx?.goals?.away;
    const isFinished = FINISHED.has(short);

    if (!isFinished) {
      if (short === "NS" || short === "TBD") stillScheduled++;
      else liveCount++;
      continue;
    }

    if (hScore == null || aScore == null) {
      console.log(`  !! ${m.homeTeam.name} x ${m.awayTeam.name}: finalizado mas sem placar — pulando`);
      continue;
    }

    const needsUpdate = m.homeScore !== hScore || m.awayScore !== aScore || !m.finished;
    if (!needsUpdate) continue;

    // Update match + recalcula pontos de TODOS os palpites em uma transacao
    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: m.id },
        data: { homeScore: hScore, awayScore: aScore, finished: true },
      });
      for (const p of m.predictions) {
        const pts = calcPoints(p.homeScore, p.awayScore, hScore, aScore);
        if (p.points !== pts) {
          await tx.prediction.update({ where: { id: p.id }, data: { points: pts } });
          updatedPredictions++;
        }
      }
    });

    updatedMatches++;
    console.log(`  OK ${m.homeTeam.name} ${hScore} x ${aScore} ${m.awayTeam.name} (${m.predictions.length} palpites recalculados)`);
  }

  console.log("");
  console.log(`Resumo: ${checked} checados, ${updatedMatches} jogos atualizados, ${updatedPredictions} palpites recalculados.`);
  console.log(`        ${stillScheduled} ainda nao comecaram, ${liveCount} ao vivo/intervalo.`);
}

main()
  .catch((e) => {
    console.error("X Erro:", e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
