import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Storage abstraction:
 *  - Em produção (Vercel): usa @vercel/blob (env BLOB_READ_WRITE_TOKEN).
 *  - Em dev/local: salva em public/uploads/<folder>/<uuid>.<ext>.
 *
 * Motivo: Vercel é serverless e o filesystem não persiste entre invocações.
 * Em produção, qualquer arquivo gravado em /var/task seria perdido em cold
 * starts. Por isso usamos @vercel/blob (storage object externo).
 */

const HAS_VERCEL_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveImage(
  buffer: Buffer,
  ext: string,
  folder: "sponsors" | "users"
): Promise<string> {
  const filename = `${crypto.randomUUID()}${ext}`;

  if (HAS_VERCEL_BLOB) {
    // Vercel Blob — retorna URL pública absoluta
    const { put } = await import("@vercel/blob");
    const key = `uploads/${folder}/${filename}`;
    const result = await put(key, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return result.url;
  }

  // Dev local — salva no public/uploads
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export const STORAGE_BACKEND = HAS_VERCEL_BLOB ? "vercel-blob" : "local-fs";
