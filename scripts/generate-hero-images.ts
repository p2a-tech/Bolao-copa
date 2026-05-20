import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  HERO_DIR,
  HERO_IMAGE_SIZE,
  heroImageFile,
  buildHeroPrompt,
  buildHeroPromptArchetype,
  buildHeroPromptFallback,
  isModerationBlocked,
} from "../src/lib/heroImage";
import { cutoutHeroPng } from "../src/lib/chromaKey";

const FORCE = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg
  ? new Set(onlyArg.slice(7).split(",").map((c) => c.trim().toLowerCase()))
  : null;

try {
  (process as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(".env");
} catch {
  /* .env optional */
}

const prisma = new PrismaClient();
const API_KEY = process.env.OPENAI_API_KEY;

async function callImageApi(prompt: string): Promise<
  | { ok: true; bytes: Buffer }
  | { ok: false; status: number; body: string; moderation: boolean }
> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      size: HERO_IMAGE_SIZE,
      quality: "high",
      n: 1,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      body,
      moderation: isModerationBlocked(res.status, body),
    };
  }

  const json = JSON.parse(body) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = json?.data?.[0];
  let bytes: Buffer | null = null;
  if (item?.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  }
  if (!bytes) {
    return { ok: false, status: 0, body: "resposta sem imagem", moderation: false };
  }
  return { ok: true, bytes };
}

async function generate(name: string, code: string): Promise<void> {
  const file = heroImageFile(code);
  if (fs.existsSync(file) && !FORCE) {
    console.log(`• ${code} já existe — reutilizando`);
    return;
  }
  if (FORCE && fs.existsSync(file)) {
    fs.unlinkSync(file);
  }

  const attempts: { label: string; prompt: string }[] = [
    { label: "craque", prompt: buildHeroPrompt(name, code) },
    { label: "craque (desc.)", prompt: buildHeroPromptArchetype(name, code) },
    { label: "uniforme", prompt: buildHeroPromptFallback(name, code) },
  ];

  let result = await callImageApi(attempts[0].prompt);
  for (let i = 1; i < attempts.length && !result.ok && result.moderation; i++) {
    console.warn(`⚠ ${code}: moderação — tentando ${attempts[i].label}`);
    result = await callImageApi(attempts[i].prompt);
  }

  if (!result.ok) {
    const detail =
      result.status > 0
        ? `HTTP ${result.status} ${result.body}`
        : result.body;
    console.error(`✗ ${code} (${name}): ${detail}`);
    return;
  }

  const cutout = await cutoutHeroPng(result.bytes);
  fs.writeFileSync(file, cutout);
  console.log(`✓ ${code} (${name}) — recorte sem fundo`);
}

async function main() {
  if (!API_KEY) {
    console.error(
      "OPENAI_API_KEY não definida. Adicione-a ao .env e rode novamente."
    );
    process.exit(1);
  }
  fs.mkdirSync(HERO_DIR, { recursive: true });
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const scoped = ONLY
    ? teams.filter((t) => ONLY.has(t.code.toLowerCase()))
    : teams;
  const pending = FORCE
    ? scoped
    : scoped.filter((t) => !fs.existsSync(heroImageFile(t.code)));
  const scopeLabel = ONLY
    ? `${scoped.length} seleção(ões): ${[...ONLY].join(", ")}`
    : `${scoped.length} seleções`;
  console.log(
    FORCE
      ? `Regenerando hero images (${scopeLabel}).`
      : `Gerando hero images: ${pending.length} pendentes de ${scopeLabel} (${
          scoped.length - pending.length
        } em cache).`
  );

  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const t = pending[cursor++];
      try {
        await generate(t.name, t.code);
      } catch (e) {
        console.error(`✗ falha em ${t.code}:`, e);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker)
  );
  console.log("Concluído.");
}

main().finally(() => prisma.$disconnect());
