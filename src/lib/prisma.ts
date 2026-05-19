import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Vercel's serverless filesystem is read-only except for /tmp (which is
 * ephemeral, per-instance). For this UI demo we ship a pre-seeded SQLite
 * file in the repo and copy it into /tmp on cold start so the app can
 * read AND write during a session. Data resets when the instance recycles.
 */
function resolveDatabaseUrl(): string | undefined {
  if (!process.env.VERCEL) return undefined; // local/dev: use schema default
  const tmpDb = "/tmp/dev.db";
  if (!fs.existsSync(tmpDb)) {
    const seeded = path.join(process.cwd(), "prisma", "dev.db");
    try {
      fs.copyFileSync(seeded, tmpDb);
    } catch {
      // If the seeded DB isn't bundled, Prisma will create an empty file.
    }
  }
  return `file:${tmpDb}`;
}

const url = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
