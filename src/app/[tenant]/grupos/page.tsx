import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { Nav } from "@/components/Nav";
import { SponsorBanner } from "@/components/SponsorBanner";
import { GroupStandingsView } from "@/components/GroupStandingsView";

export const dynamic = "force-dynamic";

export default async function GruposPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session || session.tenantSlug !== tenant.slug) {
    redirect(`/${tenant.slug}/login?next=/${tenant.slug}/grupos`);
  }

  const masterSponsor = await prisma.sponsor.findFirst({
    where: { tenantId: tenant.id, placement: "global" },
  });

  return (
    <>
      <Nav active="/grupos" tenantSlug={tenant.slug} tenantName={tenant.name} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <SponsorBanner
            sponsor={masterSponsor}
            label="Patrocinador Master"
            className="h-20"
          />
        </div>

        <div className="card mb-6 p-5">
          <h1 className="text-xl font-bold text-slate-100">
            Grupos e classificação
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tabela da fase de grupos da Copa 2026. Pontos e saldo de gols
            atualizam automaticamente a cada 20 segundos enquanto houver jogos
            ao vivo.
          </p>
        </div>

        <GroupStandingsView tenantSlug={tenant.slug} />
      </main>
    </>
  );
}
