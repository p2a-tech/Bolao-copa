import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getSession } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB (margem pro Vercel hobby)
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
 * Upload de imagem (logo de patrocinador). Requer admin do tenant.
 * Usa storage abstraído (Vercel Blob em prod, fs local em dev).
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
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use PNG, JPG, WebP, SVG ou GIF." },
      { status: 415 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 4 MB." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext =
    EXT_BY_MIME[file.type] || path.extname(file.name).toLowerCase() || ".png";

  const url = await saveImage(buffer, ext, "sponsors");
  return NextResponse.json({ ok: true, url });
}
