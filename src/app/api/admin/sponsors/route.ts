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

  // Same-tenant guard.
  const sp = await prisma.sponsor.findFirst({
    where: { id: parsed.data.id, tenantId: session.tenantId },
  });
  if (!sp) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  await prisma.sponsor.delete({ where: { id: sp.id } });
  return NextResponse.json({ ok: true });
}
