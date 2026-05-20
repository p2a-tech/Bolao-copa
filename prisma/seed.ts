import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// FIFA World Cup 2026 — final draw (Washington D.C., 5 Dec 2025).
// 48 teams, 12 groups of 4. [name (pt-BR), flag-icons code]
// Scotland/England use flag-icons subdivision codes (gb-sct / gb-eng).
const TEAMS: [string, string][] = [
  // A
  ["México", "MX"], ["África do Sul", "ZA"], ["Coreia do Sul", "KR"], ["Tchéquia", "CZ"],
  // B
  ["Canadá", "CA"], ["Bósnia e Herzegovina", "BA"], ["Catar", "QA"], ["Suíça", "CH"],
  // C
  ["Brasil", "BR"], ["Marrocos", "MA"], ["Haiti", "HT"], ["Escócia", "gb-sct"],
  // D
  ["Estados Unidos", "US"], ["Paraguai", "PY"], ["Austrália", "AU"], ["Turquia", "TR"],
  // E
  ["Alemanha", "DE"], ["Curaçao", "CW"], ["Costa do Marfim", "CI"], ["Equador", "EC"],
  // F
  ["Holanda", "NL"], ["Japão", "JP"], ["Suécia", "SE"], ["Tunísia", "TN"],
  // G
  ["Bélgica", "BE"], ["Egito", "EG"], ["Irã", "IR"], ["Nova Zelândia", "NZ"],
  // H
  ["Espanha", "ES"], ["Cabo Verde", "CV"], ["Arábia Saudita", "SA"], ["Uruguai", "UY"],
  // I
  ["França", "FR"], ["Senegal", "SN"], ["Iraque", "IQ"], ["Noruega", "NO"],
  // J
  ["Argentina", "AR"], ["Argélia", "DZ"], ["Áustria", "AT"], ["Jordânia", "JO"],
  // K
  ["Portugal", "PT"], ["RD Congo", "CD"], ["Uzbequistão", "UZ"], ["Colômbia", "CO"],
  // L
  ["Inglaterra", "gb-eng"], ["Croácia", "HR"], ["Gana", "GH"], ["Panamá", "PA"],
];

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

// Real group-stage fixtures: [group, date (YYYY-MM-DD), home, away, venue].
// Kickoff times are approximate (staggered per day) — dates, matchups and
// venues follow the official schedule.
const FIXTURES: [string, string, string, string, string][] = [
  // Grupo A
  ["A", "2026-06-11", "México", "África do Sul", "Cidade do México"],
  ["A", "2026-06-12", "Coreia do Sul", "Tchéquia", "Guadalajara"],
  ["A", "2026-06-18", "Tchéquia", "África do Sul", "Atlanta"],
  ["A", "2026-06-18", "México", "Coreia do Sul", "Guadalajara"],
  ["A", "2026-06-24", "Tchéquia", "México", "Cidade do México"],
  ["A", "2026-06-24", "África do Sul", "Coreia do Sul", "Monterrey"],
  // Grupo B
  ["B", "2026-06-12", "Canadá", "Bósnia e Herzegovina", "Toronto"],
  ["B", "2026-06-12", "Catar", "Suíça", "San Francisco Bay (Santa Clara)"],
  ["B", "2026-06-18", "Suíça", "Bósnia e Herzegovina", "Los Angeles (Inglewood)"],
  ["B", "2026-06-18", "Canadá", "Catar", "Vancouver"],
  ["B", "2026-06-24", "Suíça", "Canadá", "Vancouver"],
  ["B", "2026-06-24", "Bósnia e Herzegovina", "Catar", "Seattle"],
  // Grupo C
  ["C", "2026-06-13", "Brasil", "Marrocos", "Boston (Foxborough)"],
  ["C", "2026-06-13", "Haiti", "Escócia", "Nova Jersey (East Rutherford)"],
  ["C", "2026-06-19", "Brasil", "Haiti", "Filadélfia"],
  ["C", "2026-06-19", "Escócia", "Marrocos", "Boston (Foxborough)"],
  ["C", "2026-06-24", "Escócia", "Brasil", "Miami"],
  ["C", "2026-06-24", "Marrocos", "Haiti", "Atlanta"],
  // Grupo D
  ["D", "2026-06-12", "Estados Unidos", "Paraguai", "Los Angeles (Inglewood)"],
  ["D", "2026-06-12", "Austrália", "Turquia", "Vancouver"],
  ["D", "2026-06-19", "Turquia", "Paraguai", "San Francisco Bay (Santa Clara)"],
  ["D", "2026-06-19", "Estados Unidos", "Austrália", "Seattle"],
  ["D", "2026-06-25", "Turquia", "Estados Unidos", "Los Angeles (Inglewood)"],
  ["D", "2026-06-25", "Paraguai", "Austrália", "San Francisco Bay (Santa Clara)"],
  // Grupo E
  ["E", "2026-06-14", "Alemanha", "Curaçao", "Filadélfia"],
  ["E", "2026-06-14", "Costa do Marfim", "Equador", "Houston"],
  ["E", "2026-06-20", "Alemanha", "Costa do Marfim", "Toronto"],
  ["E", "2026-06-20", "Equador", "Curaçao", "Kansas City"],
  ["E", "2026-06-25", "Equador", "Alemanha", "Filadélfia"],
  ["E", "2026-06-25", "Curaçao", "Costa do Marfim", "Nova Jersey (East Rutherford)"],
  // Grupo F
  ["F", "2026-06-14", "Holanda", "Japão", "Dallas (Arlington)"],
  ["F", "2026-06-14", "Suécia", "Tunísia", "Monterrey"],
  ["F", "2026-06-20", "Holanda", "Suécia", "Houston"],
  ["F", "2026-06-20", "Tunísia", "Japão", "Monterrey"],
  ["F", "2026-06-25", "Tunísia", "Holanda", "Dallas (Arlington)"],
  ["F", "2026-06-25", "Japão", "Suécia", "Kansas City"],
  // Grupo G
  ["G", "2026-06-15", "Bélgica", "Egito", "Los Angeles (Inglewood)"],
  ["G", "2026-06-15", "Irã", "Nova Zelândia", "Seattle"],
  ["G", "2026-06-21", "Bélgica", "Irã", "Los Angeles (Inglewood)"],
  ["G", "2026-06-21", "Nova Zelândia", "Egito", "Vancouver"],
  ["G", "2026-06-26", "Nova Zelândia", "Bélgica", "Seattle"],
  ["G", "2026-06-26", "Egito", "Irã", "Vancouver"],
  // Grupo H
  ["H", "2026-06-15", "Espanha", "Cabo Verde", "Miami"],
  ["H", "2026-06-15", "Arábia Saudita", "Uruguai", "Atlanta"],
  ["H", "2026-06-21", "Espanha", "Arábia Saudita", "Miami"],
  ["H", "2026-06-21", "Uruguai", "Cabo Verde", "Atlanta"],
  ["H", "2026-06-26", "Uruguai", "Espanha", "Houston"],
  ["H", "2026-06-26", "Cabo Verde", "Arábia Saudita", "Guadalajara"],
  // Grupo I
  ["I", "2026-06-16", "França", "Senegal", "Nova Jersey (East Rutherford)"],
  ["I", "2026-06-16", "Iraque", "Noruega", "Boston (Foxborough)"],
  ["I", "2026-06-22", "França", "Iraque", "Nova Jersey (East Rutherford)"],
  ["I", "2026-06-22", "Noruega", "Senegal", "Filadélfia"],
  ["I", "2026-06-26", "Noruega", "França", "Boston (Foxborough)"],
  ["I", "2026-06-26", "Senegal", "Iraque", "Toronto"],
  // Grupo J
  ["J", "2026-06-16", "Argentina", "Argélia", "Kansas City"],
  ["J", "2026-06-16", "Áustria", "Jordânia", "San Francisco Bay (Santa Clara)"],
  ["J", "2026-06-22", "Argentina", "Áustria", "Dallas (Arlington)"],
  ["J", "2026-06-22", "Jordânia", "Argélia", "San Francisco Bay (Santa Clara)"],
  ["J", "2026-06-27", "Jordânia", "Argentina", "Kansas City"],
  ["J", "2026-06-27", "Argélia", "Áustria", "Dallas (Arlington)"],
  // Grupo K
  ["K", "2026-06-17", "Portugal", "RD Congo", "Houston"],
  ["K", "2026-06-17", "Uzbequistão", "Colômbia", "Cidade do México"],
  ["K", "2026-06-23", "Portugal", "Uzbequistão", "Houston"],
  ["K", "2026-06-23", "Colômbia", "RD Congo", "Guadalajara"],
  ["K", "2026-06-27", "Colômbia", "Portugal", "Miami"],
  ["K", "2026-06-27", "RD Congo", "Uzbequistão", "Atlanta"],
  // Grupo L
  ["L", "2026-06-17", "Inglaterra", "Croácia", "Toronto"],
  ["L", "2026-06-17", "Gana", "Panamá", "Dallas (Arlington)"],
  ["L", "2026-06-23", "Inglaterra", "Gana", "Boston (Foxborough)"],
  ["L", "2026-06-23", "Panamá", "Croácia", "Toronto"],
  ["L", "2026-06-27", "Panamá", "Inglaterra", "Nova Jersey (East Rutherford)"],
  ["L", "2026-06-27", "Croácia", "Gana", "Filadélfia"],
];

async function main() {
  console.log("Limpando dados anteriores...");
  await prisma.prediction.deleteMany();
  await prisma.matchSponsor.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("Criando seleções...");
  const teamIdByName = new Map<string, string>();
  for (let i = 0; i < TEAMS.length; i++) {
    const [name, code] = TEAMS[i];
    const group = `Grupo ${GROUP_LETTERS[Math.floor(i / 4)]}`;
    const team = await prisma.team.create({ data: { name, code, group } });
    teamIdByName.set(name, team.id);
  }

  console.log("Criando tenant de demonstração...");
  const demoTenant = await prisma.tenant.create({
    data: {
      slug: "demo",
      name: "Bolão da Copa (Demo)",
      primaryColor: "#00875A",
      landingTitle: "Bolão da Copa do Mundo 2026",
      landingSubtitle:
        "Palpite em todos os jogos, dispute o ranking e concorra a prêmios.",
      welcomeMessage: "Boa sorte e bons palpites!",
    },
  });

  console.log("Criando patrocinadores do tenant demo...");
  await prisma.sponsor.create({
    data: {
      tenantId: demoTenant.id,
      name: "Banco Patrocinador Master",
      logoUrl:
        "https://placehold.co/1200x150/00875A/FFFFFF/png?text=Patrocinador+Master+do+Bolao",
      linkUrl: "https://example.com",
      placement: "global",
    },
  });

  const matchSponsors = await Promise.all(
    [
      ["Refrigerante Copa", "FFC400", "111111"],
      ["Telecom Mundial", "1d4ed8", "FFFFFF"],
      ["Esportes Brasil", "00875A", "FFFFFF"],
      ["Seguros União", "b91c1c", "FFFFFF"],
    ].map(([name, bg, fg]) =>
      prisma.sponsor.create({
        data: {
          tenantId: demoTenant.id,
          name: name as string,
          logoUrl: `https://placehold.co/600x90/${bg}/${fg}/png?text=${encodeURIComponent(
            name as string
          )}`,
          linkUrl: "https://example.com",
          placement: "match",
        },
      })
    )
  );

  console.log("Gerando jogos da fase de grupos...");
  // Stable sort by date so kickoffs are chronological; ties keep declared order.
  const ordered = FIXTURES.map((f, i) => ({ f, i })).sort(
    (a, b) => a.f[1].localeCompare(b.f[1]) || a.i - b.i
  );

  let currentDate = "";
  let slot = 0;
  let matchCount = 0;

  for (const { f } of ordered) {
    const [group, date, homeName, awayName, venue] = f;
    if (date !== currentDate) {
      currentDate = date;
      slot = 0;
    }
    // First match of the day at 13:00 UTC, then +1h per slot. Up to 6
    // matches/day stay within the same calendar date (13:00–18:00 UTC).
    const kickoff = new Date(`${date}T13:00:00.000Z`);
    kickoff.setUTCHours(kickoff.getUTCHours() + slot);
    slot++;

    const match = await prisma.match.create({
      data: {
        stage: `Fase de Grupos - Grupo ${group}`,
        venue,
        kickoff,
        homeTeamId: teamIdByName.get(homeName)!,
        awayTeamId: teamIdByName.get(awayName)!,
      },
    });

    if (matchCount % 3 === 0) {
      const sp = matchSponsors[matchCount % matchSponsors.length];
      await prisma.matchSponsor.create({
        data: { matchId: match.id, tenantId: demoTenant.id, sponsorId: sp.id },
      });
    }
    matchCount++;
  }

  console.log("Criando super-admin (dono do SaaS)...");
  const superPass = await bcrypt.hash("super123", 10);
  await prisma.user.create({
    data: {
      fullName: "Super Admin",
      phone: "11000000000",
      email: "super@bolao.com",
      cpf: "52998224725", // valid test CPF
      birthDate: new Date("1990-01-01"),
      passwordHash: superPass,
      isSuperAdmin: true,
    },
  });

  console.log("Criando admin e usuário demo (tenant demo)...");
  const adminPass = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      tenantId: demoTenant.id,
      fullName: "Administrador do Bolão",
      phone: "11999999999",
      email: "admin@bolao.com",
      cpf: "39053344705",
      birthDate: new Date("1990-01-01"),
      passwordHash: adminPass,
      isAdmin: true,
    },
  });

  const demoPass = await bcrypt.hash("demo123", 10);
  await prisma.user.create({
    data: {
      tenantId: demoTenant.id,
      fullName: "Maria Torcedora",
      phone: "11988887777",
      email: "maria@exemplo.com",
      cpf: "11144477735",
      birthDate: new Date("1995-05-20"),
      passwordHash: demoPass,
    },
  });

  const total = await prisma.match.count();
  console.log(`Pronto! ${TEAMS.length} seleções e ${total} jogos criados.`);
  console.log("Super: super@bolao.com / super123 (cadastra outros clientes em /superadmin)");
  console.log("Tenant 'demo': /demo/login");
  console.log("  Admin:   admin@bolao.com / admin123");
  console.log("  Usuário: maria@exemplo.com / demo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
