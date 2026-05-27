import { PrismaClient } from "@prisma/client";

// Prisma 5 carrega .env automaticamente ao instanciar PrismaClient.
const prisma = new PrismaClient();
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = "https://v3.football.api-sports.io";

// FIFA World Cup ID na API-Football. Confirmado em /leagues:
//   league=1, season=2026 -> 72 fixtures (fase de grupos)
const WORLD_CUP_LEAGUE_ID = 1;
const SEASON = 2026;

function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const NAME_ALIASES = {
  estadosunidos: ["usa", "unitedstates"],
  rdcongo: ["drcongo", "congodr", "congo"],
  africadosul: ["southafrica"],
  coreiadosul: ["southkorea", "korearepublic"],
  tchequia: ["czechrepublic", "czechia"],
  arabiasaudita: ["saudiarabia"],
  costadomarfim: ["ivorycoast", "cotedivoire"],
  novazelandia: ["newzealand"],
  uzbequistao: ["uzbekistan"],
  ira: ["iran"],
  tunisia: ["tunisia"],
  argelia: ["algeria"],
  iraque: ["iraq"],
  egito: ["egypt"],
  noruega: ["norway"],
  japao: ["japan"],
  marrocos: ["morocco"],
  alemanha: ["germany"],
  holanda: ["netherlands", "holland"],
  suecia: ["sweden"],
  suica: ["switzerland"],
  espanha: ["spain"],
  franca: ["france"],
  belgica: ["belgium"],
  austria: ["austria"],
  croacia: ["croatia"],
  portugal: ["portugal"],
  inglaterra: ["england"],
  escocia: ["scotland"],
  turquia: ["turkey", "turkiye"],
  canada: ["canada"],
  mexico: ["mexico"],
  australia: ["australia"],
  panama: ["panama"],
  haiti: ["haiti"],
  curacao: ["curacao"],
  caboverde: ["capeverdeislands", "capeverde"],
  bosniaeherzegovina: ["bosniaherzegovina", "bosniaandherzegovina"],
  uruguai: ["uruguay"],
  paraguai: ["paraguay"],
  equador: ["ecuador"],
  colombia: ["colombia"],
  senegal: ["senegal"],
  gana: ["ghana"],
  jordania: ["jordan"],
  catar: ["qatar"],
  argentina: ["argentina"],
  brasil: ["brazil"],
};

function teamsMatch(dbName, apiName) {
  const a = normalize(dbName);
  const b = normalize(apiName);
  if (a === b) return true;
  const aliases = NAME_ALIASES[a] ?? [];
  return aliases.includes(b);
}

async function main() {
  if (!API_KEY) {
    console.error("X API_FOOTBALL_KEY nao esta no .env");
    process.exit(1);
  }

  console.log(`Buscando fixtures da API-Football (league=${WORLD_CUP_LEAGUE_ID}, season=${SEASON})...`);
  const url = `${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  const data = await res.json();

  if (!Array.isArray(data?.response)) {
    console.error("X Resposta inesperada da API:", JSON.stringify(data).slice(0, 500));
    process.exit(1);
  }

  const fixtures = data.response;
  console.log(`  ${fixtures.length} fixtures encontradas na API.`);

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });
  console.log(`  ${matches.length} matches no banco.`);

  let mapped = 0;
  let updated = 0;
  let missed = 0;
  const unmatched = [];

  for (const m of matches) {
    const fixture = fixtures.find((f) => {
      const fh = f?.teams?.home?.name ?? "";
      const fa = f?.teams?.away?.name ?? "";
      return teamsMatch(m.homeTeam.name, fh) && teamsMatch(m.awayTeam.name, fa);
    });

    if (!fixture) {
      missed++;
      unmatched.push(`${m.homeTeam.name} x ${m.awayTeam.name}`);
      continue;
    }

    const apiKickoff = new Date(fixture.fixture.date);
    const venueName = fixture.fixture.venue?.name;
    const venueCity = fixture.fixture.venue?.city;
    const apiVenue = venueName ? (venueCity ? `${venueName}, ${venueCity}` : venueName) : m.venue;
    const extId = String(fixture.fixture.id);

    const needsUpdate =
      m.externalId !== extId ||
      m.kickoff.getTime() !== apiKickoff.getTime() ||
      m.venue !== apiVenue;

    if (needsUpdate) {
      await prisma.match.update({
        where: { id: m.id },
        data: { externalId: extId, kickoff: apiKickoff, venue: apiVenue },
      });
      updated++;
    }
    mapped++;
    console.log(`  OK ${m.homeTeam.name} x ${m.awayTeam.name} -> fx ${extId} | ${apiKickoff.toISOString()} @ ${apiVenue}`);
  }

  console.log("");
  console.log(`Resultado: ${mapped} mapeados (${updated} atualizados), ${missed} sem match.`);
  if (unmatched.length) {
    console.log("");
    console.log("Sem correspondencia na API:");
    unmatched.forEach((s) => console.log(`  - ${s}`));
  }
}

main()
  .catch((e) => {
    console.error("X Erro:", e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
