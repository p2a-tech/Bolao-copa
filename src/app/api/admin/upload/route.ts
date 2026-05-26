import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif",
};

/**
 * Upload de imagem (logo de patrocinador, etc).
 * Requer admin do tenant. Salva em `public/uploads/sponsors/` e retorna a
 * URL pública (ex.: `/uploads/sponsors/<uuid>.png`).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin || !session.tenantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use PNG, JPG, WebP, SVG ou GIF." },
      { status: 415 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 5 MB." },
      { status: 413 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext =
    EXT_BY_MIME[file.type] || path.extname(file.name).toLowerCase() || ".png";
  const filename = `${crypto.randomUUID()}${ext}`;

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "sponsors"
  );
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/sponsors/${filename}`;
  return NextResponse.json({ ok: true, url });
}
