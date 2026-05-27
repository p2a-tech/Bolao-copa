import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = "https://v3.football.api-sports.io";

async function main() {
  console.log("=== Diagnostico da integracao API-Football ===");
  console.log("");
  console.log("ENV:");
  console.log("  LIVE_PROVIDER     =", process.env.LIVE_PROVIDER || "(nao setado, usando 'demo')");
  console.log("  API_FOOTBALL_KEY  =", API_KEY ? `${API_KEY.slice(0, 10)}... (${API_KEY.length} chars)` : "(vazio)");
  console.log("  DATABASE_URL host =", (process.env.DATABASE_URL || "").replace(/:[^@]+@/, ":***@").slice(0, 80));
  console.log("");

  if (!API_KEY) {
    console.error("X Sem API_FOOTBALL_KEY — set no .env e rode novamente.");
    process.exit(1);
  }

  // 1. Confere conta + cota
  const statusRes = await fetch(`${API_BASE}/status`, { headers: { "x-apisports-key": API_KEY } });
  const statusJson = await statusRes.json();
  if (statusJson?.response?.account) {
    const a = statusJson.response.account;
    const s = statusJson.response.subscription;
    const r = statusJson.response.requests;
    console.log("Conta API-Football:");
    console.log(`  ${a.firstname} ${a.lastname} <${a.email}>`);
    console.log(`  Plano: ${s.plan} (ativo: ${s.active}, expira: ${s.end})`);
    console.log(`  Uso hoje: ${r.current} / ${r.limit_day}`);
    console.log("");
  } else {
    console.error("X /status falhou:", JSON.stringify(statusJson).slice(0, 300));
    process.exit(1);
  }

  // 2. Banco — quantos matches estao mapeados
  const total = await prisma.match.count();
  const mapped = await prisma.match.count({ where: { externalId: { not: null } } });
  const finished = await prisma.match.count({ where: { finished: true } });
  console.log("Banco:");
  console.log(`  Matches total       : ${total}`);
  console.log(`  Com externalId      : ${mapped}/${total}`);
  console.log(`  Finalizados (score) : ${finished}/${total}`);
  console.log("");

  // 3. Proximos 5 jogos
  const upcoming = await prisma.match.findMany({
    where: { finished: false, kickoff: { gte: new Date() } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
    take: 5,
  });
  console.log("Proximos 5 jogos no banco:");
  for (const m of upcoming) {
    const tag = m.externalId ? `[fx ${m.externalId}]` : "[SEM map]";
    console.log(`  ${m.kickoff.toISOString()}  ${m.homeTeam.name} x ${m.awayTeam.name}  ${tag}`);
  }
  console.log("");
  console.log("Proximos passos:");
  console.log("  1) npm run live:map      -> mapeia times -> fixture ids da API");
  console.log("  2) npm run live:sync     -> puxa placares dos jogos finalizados e recalcula pontos");
  console.log("  3) LIVE_PROVIDER=api-football no .env (ja deve estar) -> tela ao vivo usa dados reais");
}

main()
  .catch((e) => {
    console.error("X Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
