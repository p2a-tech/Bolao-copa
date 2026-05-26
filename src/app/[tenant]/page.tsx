import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { SponsorBanner } from "@/components/SponsorBanner";

export default async function TenantHome({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (session && session.tenantSlug === tenant.slug) {
    redirect(`/${tenant.slug}/palpites`);
  }

  const masterSponsor = await prisma.sponsor.findFirst({
    where: { tenantId: tenant.id, placement: "global" },
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <SponsorBanner
            sponsor={masterSponsor}
            label="Patrocinador Master"
            className="h-24"
          />
        </div>

        <div className="grid items-center gap-10 py-10 md:grid-cols-2">
          {/* Coluna esquerda: título + CTAs */}
          <div>
            {tenant.logoUrl && (
              <div className="mb-6 md:hidden">
                {/* Mobile: imagem aparece em cima do texto */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="mx-auto h-64 w-auto rounded-2xl object-cover ring-2 ring-emerald-500/40"
                />
              </div>
            )}

            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              {tenant.landingTitle ?? tenant.name}
            </h1>
            <p className="mt-4 text-lg text-white/80">
              {tenant.landingSubtitle ??
                "Dê seus palpites em todos os jogos, acompanhe o ranking ao vivo e dispute com os amigos."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${tenant.slug}/register`}
                className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-900/50 transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                Criar minha conta
              </Link>
              <Link
                href={`/${tenant.slug}/login`}
                className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Coluna direita: foto do dono (se tiver logoUrl) ou regras */}
          <div className="grid gap-4">
            {tenant.logoUrl ? (
              <div className="hidden md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-full rounded-2xl object-cover shadow-2xl ring-2 ring-emerald-500/40"
                />
              </div>
            ) : (
              <>
                <Rule
                  icon="🎯"
                  title="Placar exato = 3 pontos"
                  desc="Acertou o resultado certinho? Pontuação máxima."
                />
                <Rule
                  icon="✅"
                  title="Vencedor ou empate = 1 ponto"
                  desc="Acertou quem ganhou (ou o empate) sem o placar exato."
                />
                <Rule
                  icon="🔒"
                  title="Trava 30 min antes do jogo"
                  desc="Um contador avisa quanto tempo falta para fechar os palpites."
                />
                <Rule
                  icon="🏅"
                  title="Ranking ao vivo"
                  desc="Veja sua posição atualizada a cada resultado."
                />
              </>
            )}
          </div>
        </div>

        {/* Quando há imagem hero, mostra as regras embaixo */}
        {tenant.logoUrl && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Rule
              icon="🎯"
              title="Placar exato = 3 pontos"
              desc="Acertou o resultado certinho? Pontuação máxima."
            />
            <Rule
              icon="✅"
              title="Vencedor ou empate = 1 ponto"
              desc="Acertou quem ganhou (ou o empate) sem o placar exato."
            />
            <Rule
              icon="🔒"
              title="Trava 30 min antes do jogo"
              desc="Um contador avisa quanto tempo falta para fechar os palpites."
            />
            <Rule
              icon="🏅"
              title="Ranking ao vivo"
              desc="Veja sua posição atualizada a cada resultado."
            />
          </div>
        )}
      </div>
    </main>
  );
}

function Rule({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-zinc-900 p-4 ring-1 ring-white/10">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-white/70">{desc}</p>
      </div>
    </div>
  );
}
