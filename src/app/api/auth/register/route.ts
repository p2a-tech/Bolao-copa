import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import {
  hashPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

const schema = registerSchema.extend({
  tenantSlug: z.string().min(1, "Bolão inválido"),
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

  const { fullName, phone, email, birthDate, cpf, password, tenantSlug } =
    parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant || !tenant.active) {
    return NextResponse.json(
      { error: "Bolão não encontrado." },
      { status: 404 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { cpf }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail ou CPF." },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName,
      phone,
      email,
      cpf,
      birthDate: new Date(birthDate),
      passwordHash: await hashPassword(password),
    },
  });

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

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
}
