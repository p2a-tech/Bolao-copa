import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  matchId: z.string().min(1),
  sponsorId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { matchId, sponsorId } = parsed.data;
  await prisma.match.update({
    where: { id: matchId },
    data: { sponsorId: sponsorId || null },
  });

  return NextResponse.json({ ok: true });
}
