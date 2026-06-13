import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { Nav } from "@/components/Nav";
import { Flag } from "@/components/Flag";
import { EditableScore } from "@/components/EditableScore";
import { isLocked } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Status = "exact" | "outcome" | "miss" | "locked" | "open";

function statusOf(args: {
  finished: boolean;
  kickoff: Date;
  points: number;
}): Status {
  if (args.finished) {
    if (args.points >= 3) return "exact";
    if (args.points === 1) return "outcome";
    return "miss";
  }
  return isLocked(args.kickoff) ? "locked" : "open";
}

const STATUS_STYLES: Record<
  Status,
  { label: string; chip: string; dot: string }
> = {
  exact: {
    label: "Placar exato",
    chip: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    dot: "bg-emerald-400",
  },
  outcome: {
    label: "Acertou o vencedor",
    chip: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    dot: "bg-amber-400",
  },
  miss: {
    label: "Errou",
    chip: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    dot: "bg-red-400",
  },
  locked: {
    label: "Aguardando resultado",
    chip: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
    dot: "bg-slate-400",
  },
  open: {
    label: "Pendente (pode editar)",
    chip: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
    dot: "bg-blue-400",
  },
};

function formatKickoff(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function MeusPalpitesPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session || session.tenantSlug !== tenant.slug) {
    redirect(`/${tenant.slug}/login?next=/${tenant.slug}/meus-palpites`);
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.id },
    orderBy: { match: { kickoff: "asc" } },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
    },
  });

  const rows = predictions.map((p) => {
    const status = statusOf({
      finished: p.match.finished,
      kickoff: p.match.kickoff,
      points: p.points,
    });
    return {
      id: p.id,
      matchId: p.matchId,
      stage: p.match.stage,
      kickoff: p.match.kickoff,
      home: p.match.homeTeam,
      away: p.match.awayTeam,
      predHome: p.homeScore,
      predAway: p.awayScore,
      realHome: p.match.homeScore,
      realAway: p.match.awayScore,
      finished: p.match.finished,
      points: p.points,
      status,
    };
  });

  const totalPalpites = rows.length;
  const totalPoints = rows.reduce((acc, r) => acc + r.points, 0);
  const placaresExatos = rows.filter((r) => r.status === "exact").length;
  const vencedores = rows.filter((r) => r.status === "outcome").length;
  const errados = rows.filter((r) => r.status === "miss").length;
  const pendentes = rows.filter(
    (r) => r.status === "open" || r.status === "locked"
  ).length;

  return (
    <>
      <Nav
        active="/meus-palpites"
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
      />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Meus palpites</h1>
            <p className="text-sm text-slate-400">
              Histórico completo dos palpites de {session.name.split(" ")[0]}.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-brand tabular-nums">
              {totalPoints}
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              pontos no total
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatBox label="Palpites" value={totalPalpites} tone="default" />
          <StatBox label="Placar exato" value={placaresExatos} tone="emerald" />
          <StatBox label="Vencedor" value={vencedores} tone="amber" />
          <StatBox label="Errados" value={errados} tone="red" />
          <StatBox label="Pendentes" value={pendentes} tone="blue" />
        </div>

        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-300">
              Você ainda não deu nenhum palpite.
            </p>
            <a
              href={`/${tenant.slug}/palpites`}
              className="btn-primary mt-4 inline-flex"
            >
              Ir para palpites
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const style = STATUS_STYLES[r.status];
              return (
                <li key={r.id} className="card p-4">
                  {/* Topo: status + jogo (data/fase) */}
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        {r.stage.replace("Fase de Grupos - ", "")}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatKickoff(r.kickoff)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  {/* Times */}
                  <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Flag code={r.home.code} name={r.home.name} width={32} />
                      <span className="font-semibold text-slate-100">
                        {r.home.name}
                      </span>
                    </div>
                    <span className="text-slate-500">×</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">
                        {r.away.name}
                      </span>
                      <Flag code={r.away.code} name={r.away.name} width={32} />
                    </div>
                  </div>

                  {/* Placar — editor inline para "open", read-only para os outros */}
                  {r.status === "open" ? (
                    <div className="mt-4 flex justify-center">
                      <EditableScore
                        matchId={r.matchId}
                        initialHome={r.predHome}
                        initialAway={r.predAway}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start justify-center gap-8">
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          Seu palpite
                        </div>
                        <div className="text-2xl font-extrabold tabular-nums text-slate-100">
                          {r.predHome}{" "}
                          <span className="text-slate-500">×</span>{" "}
                          {r.predAway}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          Resultado
                        </div>
                        <div className="text-2xl font-extrabold tabular-nums text-slate-300">
                          {r.realHome !== null && r.realAway !== null
                            ? `${r.realHome} × ${r.realAway}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pontos */}
                  <div className="mt-3 border-t border-white/5 pt-3 text-center text-xs text-slate-400">
                    <span className="font-bold text-brand">{r.points}</span>{" "}
                    ponto(s)
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "emerald" | "amber" | "red" | "blue";
}) {
  const colors: Record<typeof tone, string> = {
    default: "text-slate-100",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  return (
    <div className="card p-3 text-center">
      <div className={`text-xl font-extrabold tabular-nums ${colors[tone]}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
