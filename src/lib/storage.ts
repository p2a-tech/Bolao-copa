import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Storage abstraction com 3 backends, escolhidos na ordem:
 *  1. Vercel Blob (se BLOB_READ_WRITE_TOKEN existir)
 *  2. Netlify Blobs (se rodando no Netlify — env NETLIFY ou NETLIFY_BLOBS_CONTEXT)
 *  3. Filesystem local (fallback dev — public/uploads/<folder>/<uuid>.<ext>)
 *
 * Em ambas as plataformas serverless (Vercel/Netlify), o filesystem não
 * persiste entre invocações, então precisamos de storage externo.
 */

const HAS_VERCEL_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const IS_NETLIFY =
  Boolean(process.env.NETLIFY) || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);

type Folder = "sponsors" | "users";

async function saveToVercelBlob(
  buffer: Buffer,
  filename: string,
  folder: Folder
): Promise<string> {
  const { put } = await import("@vercel/blob");
  const key = `uploads/${folder}/${filename}`;
  const result = await put(key, buffer, {
    access: "public",
    addRandomSuffix: false,
  });
  return result.url;
}

async function saveToNetlifyBlobs(
  buffer: Buffer,
  filename: string,
  folder: Folder
): Promise<string> {
  // SDK do Netlify Blobs aceita ArrayBuffer/Uint8Array. Convertemos o
  // Buffer (Node) para uma ArrayBuffer "pura" pra evitar erro de tipagem.
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: `uploads-${folder}` });
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  await store.set(filename, ab);
  // Netlify Blobs não expõe URLs públicas diretas — servimos via proxy:
  // GET /api/blob/<folder>/<filename>
  return `/api/blob/${folder}/${filename}`;
}

async function saveToLocal(
  buffer: Buffer,
  filename: string,
  folder: Folder
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function saveImage(
  buffer: Buffer,
  ext: string,
  folder: Folder
): Promise<string> {
  const filename = `${crypto.randomUUID()}${ext}`;

  if (HAS_VERCEL_BLOB) {
    return saveToVercelBlob(buffer, filename, folder);
  }
  if (IS_NETLIFY) {
    return saveToNetlifyBlobs(buffer, filename, folder);
  }
  return saveToLocal(buffer, filename, folder);
}

export const STORAGE_BACKEND = HAS_VERCEL_BLOB
  ? "vercel-blob"
  : IS_NETLIFY
    ? "netlify-blobs"
    : "local-fs";
