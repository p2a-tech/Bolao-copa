import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy para servir os blobs do Netlify Blobs como URLs públicas.
 *
 * Necessário porque o Netlify Blobs não expõe URL pública direta — o
 * arquivo é lido via SDK e retornado como response com o Content-Type
 * apropriado. O frontend usa /api/blob/<folder>/<filename> como src do
 * <img>.
 *
 * Em Vercel/local, essa rota não é usada (saveImage retorna URLs
 * absolutas/relativas que vão direto pro <img>).
 */
const FOLDERS = new Set(["sponsors", "users"]);
const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { folder: string; filename: string } }
) {
  const { folder, filename } = params;

  if (!FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Folder inválido" }, { status: 400 });
  }
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Filename inválido" }, { status: 400 });
  }

  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: `uploads-${folder}` });
    const buf = await store.get(filename, { type: "arrayBuffer" });
    if (!buf) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
    const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";

    return new NextResponse(buf as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Blob proxy error:", err);
    return NextResponse.json(
      { error: "Erro ao ler blob" },
      { status: 500 }
    );
  }
}
