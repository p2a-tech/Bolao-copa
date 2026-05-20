import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
  tenantSlug: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { email, password, tenantSlug } = parsed.data;

  // Tenant login (most common) vs super-admin login (no slug).
  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant || !tenant.active) {
      return NextResponse.json(
        { error: "Bolão não encontrado." },
        { status: 404 }
      );
    }
    const user = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }
    const token = await createSession({
      id: user.id,
      name: user.fullName,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: false,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      isAdmin: user.isAdmin,
      tenantSlug: tenant.slug,
    });
  }

  // Super-admin (SaaS owner)
  const user = await prisma.user.findFirst({
    where: { email, isSuperAdmin: true },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  }
  const token = await createSession({
    id: user.id,
    name: user.fullName,
    email: user.email,
    isAdmin: false,
    isSuperAdmin: true,
    tenantId: null,
    tenantSlug: null,
  });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, isSuperAdmin: true });
}
