import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import {
  hashPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { fullName, phone, email, birthDate, cpf, password } = parsed.data;

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
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
