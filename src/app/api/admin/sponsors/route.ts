import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sponsorSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin || !session.tenantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { name, logoUrl, linkUrl, placement } = parsed.data;

  // Regra: só pode existir UM patrocinador Master (placement="global") por tenant.
  if (placement === "global") {
    const existingMaster = await prisma.sponsor.findFirst({
      where: { tenantId: session.tenantId, placement: "global" },
      select: { id: true, name: true },
    });
    if (existingMaster) {
      return NextResponse.json(
        {
          error: `Não é possível cadastrar outro patrocinador Master porque já existe um cadastrado (${existingMaster.name}). Se quiser adicionar outro, exclua o existente.`,
          code: "MASTER_ALREADY_EXISTS",
          existing: existingMaster,
        },
        { status: 409 }
      );
    }
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      tenantId: session.tenantId,
      name,
      logoUrl,
      linkUrl: linkUrl || null,
      placement,
    },
  });

  return NextResponse.json({ ok: true, sponsor });
}

const patchSchema = sponsorSchema.partial().extend({
  id: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin || !session.tenantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { id, name, logoUrl, linkUrl, placement } = parsed.data;

  // Same-tenant guard
  const current = await prisma.sponsor.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!current) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  // Regra do Master único — exclui o próprio registro da verificação.
  if (placement === "global" && current.placement !== "global") {
    const existingMaster = await prisma.sponsor.findFirst({
      where: {
        tenantId: session.tenantId,
        placement: "global",
        NOT: { id: current.id },
      },
      select: { id: true, name: true },
    });
    if (existingMaster) {
      return NextResponse.json(
        {
          error: `Não é possível alterar para Master porque já existe um cadastrado (${existingMaster.name}). Exclua o existente primeiro.`,
          code: "MASTER_ALREADY_EXISTS",
          existing: existingMaster,
        },
        { status: 409 }
      );
    }
  }

  const sponsor = await prisma.sponsor.update({
    where: { id: current.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
      ...(placement !== undefined ? { placement } : {}),
    },
  });

  return NextResponse.json({ ok: true, sponsor });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin || !session.tenantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const sp = await prisma.sponsor.findFirst({
    where: { id: parsed.data.id, tenantId: session.tenantId },
  });
  if (!sp) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  await prisma.sponsor.delete({ where: { id: sp.id } });
  return NextResponse.json({ ok: true });
}
