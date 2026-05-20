import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  matchId: z.string().min(1),
  sponsorId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin || !session.tenantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { matchId, sponsorId } = parsed.data;
  const tenantId = session.tenantId;

  if (sponsorId) {
    // Sponsor must belong to the same tenant.
    const sp = await prisma.sponsor.findFirst({
      where: { id: sponsorId, tenantId },
    });
    if (!sp) {
      return NextResponse.json(
        { error: "Patrocinador inválido." },
        { status: 400 }
      );
    }
    await prisma.matchSponsor.upsert({
      where: { matchId_tenantId: { matchId, tenantId } },
      create: { matchId, tenantId, sponsorId },
      update: { sponsorId },
    });
  } else {
    await prisma.matchSponsor
      .delete({ where: { matchId_tenantId: { matchId, tenantId } } })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
