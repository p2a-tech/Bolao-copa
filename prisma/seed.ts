import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 48 selections (FIFA World Cup 2026 format: 12 groups of 4).
// [name, ISO alpha-2 code]
const TEAMS: [string, string][] = [
  // A
  ["México", "MX"], ["Croácia", "HR"], ["Camarões", "CM"], ["Uzbequistão", "UZ"],
  // B
  ["Canadá", "CA"], ["Marrocos", "MA"], ["Japão", "JP"], ["Turquia", "TR"],
  // C
  ["Estados Unidos", "US"], ["Holanda", "NL"], ["Senegal", "SN"], ["Catar", "QA"],
  // D
  ["Argentina", "AR"], ["Coreia do Sul", "KR"], ["Tunísia", "TN"], ["Nova Zelândia", "NZ"],
  // E
  ["França", "FR"], ["Dinamarca", "DK"], ["Nigéria", "NG"], ["Arábia Saudita", "SA"],
  // F
  ["Brasil", "BR"], ["Suíça", "CH"], ["Equador", "EC"], ["Irã", "IR"],
  // G
  ["Inglaterra", "GB"], ["Sérvia", "RS"], ["Gana", "GH"], ["Panamá", "PA"],
  // H
  ["Espanha", "ES"], ["Uruguai", "UY"], ["Egito", "EG"], ["Jordânia", "JO"],
  // I
  ["Portugal", "PT"], ["Polônia", "PL"], ["Costa do Marfim", "CI"], ["Peru", "PE"],
  // J
  ["Alemanha", "DE"], ["Áustria", "AT"], ["Argélia", "DZ"], ["Costa Rica", "CR"],
  // K
  ["Bélgica", "BE"], ["Suécia", "SE"], ["Austrália", "AU"], ["Chile", "CL"],
  // L
  ["Itália", "IT"], ["Colômbia", "CO"], ["Ucrânia", "UA"], ["Paraguai", "PY"],
];

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

const VENUES = [
  "MetLife Stadium - Nova York",
  "SoFi Stadium - Los Angeles",
  "AT&T Stadium - Dallas",
  "Estádio Azteca - Cidade do México",
  "BC Place - Vancouver",
  "Hard Rock Stadium - Miami",
  "Mercedes-Benz Stadium - Atlanta",
  "Lumen Field - Seattle",
  "Arrowhead Stadium - Kansas City",
  "Estádio BBVA - Monterrey",
  "Levi's Stadium - São Francisco",
  "Gillette Stadium - Boston",
];

// Round-robin pairings for a 4-team group (indexes within the group).
const PAIRINGS: [number, number][] = [
  [0, 1], [2, 3], // round 1
  [0, 2], [3, 1], // round 2
  [3, 0], [1, 2], // round 3
];

async function main() {
  console.log("Limpando dados anteriores...");
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando seleções...");
  const teamIds: string[] = [];
  for (let i = 0; i < TEAMS.length; i++) {
    const [name, code] = TEAMS[i];
    const group = `Grupo ${GROUP_LETTERS[Math.floor(i / 4)]}`;
    const team = await prisma.team.create({
      data: { name, code, group },
    });
    teamIds.push(team.id);
  }

  console.log("Criando patrocinadores...");
  const masterSponsor = await prisma.sponsor.create({
    data: {
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
  // World Cup 2026 kicks off on June 11, 2026.
  let cursor = new Date("2026-06-11T16:00:00.000Z");
  let venueIdx = 0;
  let matchCount = 0;

  for (let g = 0; g < 12; g++) {
    const groupTeams = teamIds.slice(g * 4, g * 4 + 4);
    for (let p = 0; p < PAIRINGS.length; p++) {
      const [a, b] = PAIRINGS[p];
      const sponsor =
        matchCount % 3 === 0
          ? matchSponsors[matchCount % matchSponsors.length]
          : null;

      await prisma.match.create({
        data: {
          stage: `Fase de Grupos - Grupo ${GROUP_LETTERS[g]}`,
          venue: VENUES[venueIdx % VENUES.length],
          kickoff: new Date(cursor),
          homeTeamId: groupTeams[a],
          awayTeamId: groupTeams[b],
          sponsorId: sponsor?.id ?? null,
        },
      });

      matchCount++;
      venueIdx++;
      // Stagger kickoffs: 4 matches per "slot", advancing the clock.
      cursor = new Date(cursor.getTime() + 3 * 60 * 60 * 1000);
      if (matchCount % 4 === 0) {
        // jump to next day, first match at 16:00 UTC
        const next = new Date(cursor);
        next.setUTCDate(next.getUTCDate() + 1);
        next.setUTCHours(16, 0, 0, 0);
        cursor = next;
      }
    }
  }

  console.log("Criando usuário administrador e exemplos...");
  const adminPass = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      fullName: "Administrador do Bolão",
      phone: "11999999999",
      email: "admin@bolao.com",
      cpf: "39053344705", // valid test CPF
      birthDate: new Date("1990-01-01"),
      passwordHash: adminPass,
      isAdmin: true,
    },
  });

  const demoPass = await bcrypt.hash("demo123", 10);
  await prisma.user.create({
    data: {
      fullName: "Maria Torcedora",
      phone: "11988887777",
      email: "maria@exemplo.com",
      cpf: "11144477735", // valid test CPF
      birthDate: new Date("1995-05-20"),
      passwordHash: demoPass,
    },
  });

  const total = await prisma.match.count();
  console.log(`Pronto! ${TEAMS.length} seleções e ${total} jogos criados.`);
  console.log("Admin: admin@bolao.com / admin123");
  console.log("Demo:  maria@exemplo.com / demo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
