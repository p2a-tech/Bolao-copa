import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { getLiveMatch } from "@/lib/livescore";
import { heroImageUrl, heroPlayerName } from "@/lib/heroImage";
import { MatchLiveView } from "@/components/MatchLiveView";

export const dynamic = "force-dynamic";

export default async function MatchLivePage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session || session.tenantSlug !== tenant.slug) {
    redirect(`/${tenant.slug}/login?next=/${tenant.slug}/jogo/${params.id}`);
  }

  const [match, masterSponsor, matchSponsor] = await Promise.all([
    prisma.match.findUnique({
      where: { id: params.id },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.sponsor.findFirst({
      where: { tenantId: tenant.id, placement: "global" },
    }),
    prisma.matchSponsor.findUnique({
      where: { matchId_tenantId: { matchId: params.id, tenantId: tenant.id } },
      include: { sponsor: true },
    }),
  ]);

  if (!match) notFound();

  const [prediction, live] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.id, matchId: match.id } },
    }),
    getLiveMatch({
      id: match.id,
      kickoff: match.kickoff,
      externalId: match.externalId,
    }),
  ]);

  return (
    <MatchLiveView
      matchId={match.id}
      tenantSlug={tenant.slug}
      stage={match.stage}
      venue={match.venue}
      kickoffISO={match.kickoff.toISOString()}
      home={{
        name: match.homeTeam.name,
        code: match.homeTeam.code,
        heroPlayer: heroPlayerName(
          match.homeTeam.code,
          match.homeTeam.name
        ),
      }}
      away={{
        name: match.awayTeam.name,
        code: match.awayTeam.code,
        heroPlayer: heroPlayerName(
          match.awayTeam.code,
          match.awayTeam.name
        ),
      }}
      homeImage={heroImageUrl(match.homeTeam.code)}
      awayImage={heroImageUrl(match.awayTeam.code)}
      prediction={
        prediction
          ? { home: prediction.homeScore, away: prediction.awayScore }
          : null
      }
      sponsorMatch={
        matchSponsor?.sponsor
          ? {
              name: matchSponsor.sponsor.name,
              logoUrl: matchSponsor.sponsor.logoUrl,
              linkUrl: matchSponsor.sponsor.linkUrl,
            }
          : null
      }
      sponsorMaster={
        masterSponsor
          ? {
              name: masterSponsor.name,
              logoUrl: masterSponsor.logoUrl,
              linkUrl: masterSponsor.linkUrl,
            }
          : null
      }
      initial={live}
    />
  );
}
