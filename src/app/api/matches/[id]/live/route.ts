import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLiveMatch } from "@/lib/livescore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    select: { id: true, kickoff: true, externalId: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  const live = await getLiveMatch(match);

  return NextResponse.json(live, {
    headers: { "Cache-Control": "no-store" },
  });
}
