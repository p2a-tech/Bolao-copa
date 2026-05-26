import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";

/**
 * Fix BUG #2: escrever o Set-Cookie diretamente no NextResponse com
 * TODOS os atributos originais (httpOnly, secure, sameSite, path) pra
 * garantir que o browser sobrescreva o cookie original em qualquer
 * combinação de runtime/edge.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
