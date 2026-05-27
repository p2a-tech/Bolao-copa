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
 * Os imports dinâmicos são opcionais — se a lib não estiver instalada,
 * o backend cai pro local sem quebrar (útil pra dev sem rodar npm install).
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
  // @vercel/blob é peer dep opcional — se faltar, deixa o erro borbulhar
  // (sinal claro pro operador que precisa instalar/configurar).
  const mod = await import("@vercel/blob");
  const key = `uploads/${folder}/${filename}`;
  const result = await mod.put(key, buffer, {
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
  const mod = await import("@netlify/blobs");
  const store = mod.getStore({ name: `uploads-${folder}` });
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  await store.set(filename, ab);
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

  // Tenta Vercel Blob → se a lib não estiver instalada, cai pro local.
  if (HAS_VERCEL_BLOB) {
    try {
      return await saveToVercelBlob(buffer, filename, folder);
    } catch (err) {
      console.warn(
        "[storage] Vercel Blob indisponível, usando filesystem local:",
        (err as Error).message
      );
      return saveToLocal(buffer, filename, folder);
    }
  }

  // Tenta Netlify Blobs → se a lib não estiver instalada, cai pro local.
  if (IS_NETLIFY) {
    try {
      return await saveToNetlifyBlobs(buffer, filename, folder);
    } catch (err) {
      console.warn(
        "[storage] Netlify Blobs indisponível, usando filesystem local:",
        (err as Error).message
      );
      return saveToLocal(buffer, filename, folder);
    }
  }

  return saveToLocal(buffer, filename, folder);
}

export const STORAGE_BACKEND = HAS_VERCEL_BLOB
  ? "vercel-blob"
  : IS_NETLIFY
    ? "netlify-blobs"
    : "local-fs";
