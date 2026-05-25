import { PrismaClient } from "@prisma/client";

const FIRST_NAMES = [
  "Ana", "Bruno", "Camila", "Daniel", "Eduarda", "Felipe", "Gabriela",
  "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nícolas",
  "Olivia", "Paulo", "Quésia", "Rafael", "Sofia", "Thiago", "Ursula",
  "Vinícius", "Wesley", "Yasmin", "Zé", "Alice", "Beatriz", "Caio",
  "Débora", "Enzo", "Fernanda", "Guilherme", "Helena", "Igor", "Júlia",
  "Kauã", "Larissa", "Marcos", "Natália", "Otávio", "Patrícia", "Renan",
  "Sabrina", "Tatiana", "Ulisses", "Vitória", "William", "Xavier",
  "Yuri", "Zilda",
];

const LAST_NAMES = [
  "Silva", "Souza", "Santos", "Oliveira", "Pereira", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho",
  "Gomes", "Martins", "Rocha", "Ribeiro", "Alves", "Monteiro", "Mendes",
  "Barbosa", "Cardoso", "Reis", "Teixeira", "Moreira", "Cavalcanti",
  "Dias", "Castro", "Campos", "Freitas", "Pinto", "Correia", "Vieira",
  "Andrade", "Machado", "Nunes", "Moura", "Cunha", "Brito", "Tavares",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFullName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
}

/** Gera um CPF válido (com dígitos verificadores) — 11 dígitos. */
export function generateCPF(): string {
  const n: number[] = [];
  for (let i = 0; i < 9; i++) n.push(Math.floor(Math.random() * 10));
  const calcCheck = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += n[i] * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  n.push(calcCheck(9));
  n.push(calcCheck(10));
  if (new Set(n).size === 1) return generateCPF();
  return n.join("");
}

function generatePhone(): string {
  const ddd = 10 + Math.floor(Math.random() * 90);
  const body = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
  return `${ddd}9${body}`;
}

function distributeAcrossMonths(total: number, monthsBack: number): Date[] {
  const now = new Date();
  const weights = Array.from({ length: monthsBack }, (_, i) => i + 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) =>
    Math.max(1, Math.round((w / sum) * total))
  );
  let diff = total - counts.reduce((a, b) => a + b, 0);
  for (let i = counts.length - 1; diff !== 0 && i >= 0; i--) {
    const step = diff > 0 ? 1 : -1;
    counts[i] += step;
    diff -= step;
  }
  const dates: Date[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const monthOffset = -(monthsBack - 1 - i);
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + monthOffset + 1,
      0, 23, 59, 59
    );
    const cap = i === monthsBack - 1 ? now.getTime() : end.getTime();
    const range = cap - start.getTime();
    for (let j = 0; j < counts[i]; j++) {
      dates.push(new Date(start.getTime() + Math.random() * range));
    }
  }
  return dates;
}

export async function seedTenantUsers(
  prisma: PrismaClient,
  tenantId: string,
  slug: string,
  count: number,
  passwordHash: string,
  usedEmails: Set<string>,
  usedCpfs: Set<string>
): Promise<number> {
  const createdAtList = distributeAcrossMonths(count, 6);
  const rows: Array<{
    tenantId: string;
    fullName: string;
    phone: string;
    email: string;
    cpf: string;
    birthDate: Date;
    passwordHash: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < count; i++) {
    const fullName = randomFullName();
    let email = "";
    do {
      const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
      email = `${base}.${i + 1}.${Math.floor(Math.random() * 10_000)}@${slug}.test`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    let cpf = "";
    do { cpf = generateCPF(); } while (usedCpfs.has(cpf));
    usedCpfs.add(cpf);

    const year = 1965 + Math.floor(Math.random() * 45);
    const month = Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);

    rows.push({
      tenantId,
      fullName,
      phone: generatePhone(),
      email,
      cpf,
      birthDate: new Date(year, month, day),
      passwordHash,
      createdAt: createdAtList[i],
    });
  }

  const CHUNK = 250;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.user.createMany({
      data: rows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  return rows.length;
}
