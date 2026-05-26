import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

// Vercel: Garantir runtime Node.js (Buffer, fs, etc).
export const runtime = "nodejs";

// Vercel free/hobby tier tem limite de body ~4.5MB. Mantemos 4MB de margem.
const MAX_SIZE = 4 * 1024 * 1024;

const MAGIC: Array<{ mime: string; ext: string; test: (buf: Buffer) => boolean }> = [
  {
    mime: "image/png",
    ext: ".png",
    test: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: "image/jpeg",
    ext: ".jpg",
    test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    ext: ".webp",
    test: (b) =>
      b.length >= 12 &&
      b.slice(0, 4).toString() === "RIFF" &&
      b.slice(8, 12).toString() === "WEBP",
  },
  {
    mime: "image/gif",
    ext: ".gif",
    test: (b) =>
      b.length >= 6 &&
      (b.slice(0, 6).toString() === "GIF87a" || b.slice(0, 6).toString() === "GIF89a"),
  },
];

// Rate limit em memória — em serverless cada instância tem o seu Map, então
// o limite é "best effort". Em produção real seria Redis/Upstash.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 8;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RATE_MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

/**
 * Upload público de foto (usado no cadastro). Rota pública por design
 * (usuário ainda não tem sessão), com proteções:
 *  - Magic bytes (não confia no Content-Type do client)
 *  - Rate-limit por IP (best-effort em serverless)
 *  - Limite de 4MB (segurança extra pra Vercel hobby tier)
 *  - Storage abstraído (Vercel Blob em prod, fs local em dev)
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 4 MB." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = MAGIC.find((m) => m.test(buffer));
  if (!detected) {
    return NextResponse.json(
      { error: "O arquivo não parece ser uma imagem válida (PNG, JPG, WebP ou GIF)." },
      { status: 415 }
    );
  }

  const url = await saveImage(buffer, detected.ext, "users");
  return NextResponse.json({ ok: true, url });
}
