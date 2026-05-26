import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "bolao_token";

// BUG #1 (alta severidade): em produção, exigir JWT_SECRET via env var.
// Em dev, mantém fallback pra facilitar o setup local.
const RAW_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && !RAW_SECRET) {
  throw new Error(
    "JWT_SECRET é obrigatório em produção. Configure no .env antes de subir."
  );
}
const secret = new TextEncoder().encode(RAW_SECRET || "dev-secret-bolao-copa");

// TTL de sessão. Reduzido de 7d → 1d para mitigar BUG #4 (token stale após
// rebaixamento ou suspensão do tenant).
export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 dia
const SESSION_TTL_JWT = "1d";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  photoUrl: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL_JWT)
    .sign(secret);
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Clear "low-level" — funciona em Server Actions / Server Components.
 * Para Route Handlers, prefira escrever direto no `NextResponse.cookies`
 * (ver /api/auth/logout/route.ts) — corrige BUG #2 (cookie clear
 * inconsistente em Route Handlers).
 */
export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      isAdmin: Boolean(payload.isAdmin),
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      tenantId: (payload.tenantId as string | null) ?? null,
      tenantSlug: (payload.tenantSlug as string | null) ?? null,
      photoUrl: (payload.photoUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
