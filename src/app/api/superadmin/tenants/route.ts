import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { isValidCPF, onlyDigits } from "@/lib/validation";

const createSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug inválido"),
  name: z.string().trim().min(2),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#00875A"),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  faviconUrl: z.string().trim().url().optional().or(z.literal("")),
  landingTitle: z.string().trim().optional().or(z.literal("")),
  landingSubtitle: z.string().trim().optional().or(z.literal("")),
  welcomeMessage: z.string().trim().optional().or(z.literal("")),
  adminFullName: z.string().trim().min(3),
  adminEmail: z.string().trim().toLowerCase().email(),
  adminPhone: z.string().transform(onlyDigits).refine((v) => v.length >= 10),
  adminCpf: z.string().transform(onlyDigits).refine(isValidCPF, "CPF inválido"),
  adminPassword: z.string().min(6),
});

const patchSchema = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  name: z.string().trim().min(2).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function requireSuper() {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await requireSuper();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.tenant.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um cliente com esse slug." },
      { status: 409 }
    );
  }

  const dupUser = await prisma.user.findFirst({
    where: { OR: [{ email: data.adminEmail }, { cpf: data.adminCpf }] },
  });
  if (dupUser) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail ou CPF." },
      { status: 409 }
    );
  }

  const tenant = await prisma.tenant.create({
    data: {
      slug: data.slug,
      name: data.name,
      primaryColor: data.primaryColor,
      logoUrl: data.logoUrl || null,
      faviconUrl: data.faviconUrl || null,
      landingTitle: data.landingTitle || null,
      landingSubtitle: data.landingSubtitle || null,
      welcomeMessage: data.welcomeMessage || null,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName: data.adminFullName,
      phone: data.adminPhone,
      email: data.adminEmail,
      cpf: data.adminCpf,
      birthDate: new Date("1990-01-01"),
      passwordHash: await hashPassword(data.adminPassword),
      isAdmin: true,
    },
  });

  return NextResponse.json({ ok: true, tenant });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireSuper();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  await prisma.tenant.update({ where: { id }, data: rest });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireSuper();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = z.object({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Cascade delete via Prisma relations (Sponsor.tenant Cascade,
  // MatchSponsor.tenant Cascade). User.tenant SetNull → users become orphan;
  // delete those users too (they have no other tenant).
  await prisma.$transaction([
    prisma.prediction.deleteMany({
      where: { user: { tenantId: parsed.data.id } },
    }),
    prisma.user.deleteMany({ where: { tenantId: parsed.data.id } }),
    prisma.tenant.delete({ where: { id: parsed.data.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
