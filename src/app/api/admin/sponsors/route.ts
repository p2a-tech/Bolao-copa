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

  // Fix BUG #6: regra "1 Master por tenant" agora roda numa transação
  // Serializable, eliminando a race condition entre o findFirst e o
  // create. Duas requisições simultâneas → uma vence, outra falha com 409.
  try {
    const sponsor = await prisma.$transaction(
      async (tx) => {
        if (placement === "global") {
          const existing = await tx.sponsor.findFirst({
            where: { tenantId: session.tenantId!, placement: "global" },
            select: { id: true, name: true },
          });
          if (existing) {
            throw Object.assign(new Error("MASTER_ALREADY_EXISTS"), {
              existing,
            });
          }
        }
        return tx.sponsor.create({
          data: {
            tenantId: session.tenantId!,
            name,
            logoUrl,
            linkUrl: linkUrl || null,
            placement,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );
    return NextResponse.json({ ok: true, sponsor });
  } catch (err) {
    const e = err as { message?: string; existing?: { name: string } };
    if (e.message === "MASTER_ALREADY_EXISTS" && e.existing) {
      return NextResponse.json(
        {
          error: `Não é possível cadastrar outro patrocinador Master porque já existe um cadastrado (${e.existing.name}). Se quiser adicionar outro, exclua o existente.`,
          code: "MASTER_ALREADY_EXISTS",
          existing: e.existing,
        },
        { status: 409 }
      );
    }
    throw err;
  }
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

  const current = await prisma.sponsor.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!current) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

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
