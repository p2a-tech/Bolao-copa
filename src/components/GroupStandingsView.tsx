"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flag } from "./Flag";
import type { GroupStandings, GroupFixture, StandingRow } from "@/lib/standings";
import { STATUS_LABEL } from "@/lib/livescore";

type StandingsPayload = {
  groups: GroupStandings[];
  hasLive: boolean;
  provider: "demo" | "api-football";
  updatedAt: string;
};

const POLL_MS = 20_000;

function fixtureStatusLabel(f: GroupFixture): string {
  if (f.status === "live" && f.minute != null) return `${f.minute}'`;
  if (f.status === "halftime") return "INT";
  if (f.status === "finished") return "FIM";
  return new Date(f.kickoffISO).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GroupTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <th className="w-8 py-2 pr-1">#</th>
            <th className="py-2">Seleção</th>
            <th className="w-9 py-2 text-center">PJ</th>
            <th className="w-9 py-2 text-center">V</th>
            <th className="w-9 py-2 text-center">E</th>
            <th className="w-9 py-2 text-center">D</th>
            <th className="w-9 py-2 text-center">GP</th>
            <th className="w-9 py-2 text-center">GC</th>
            <th className="w-9 py-2 text-center">SG</th>
            <th className="w-10 py-2 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const qualifies = i < 2;
            return (
              <tr
                key={row.teamId}
                className={`border-b border-slate-800 last:border-0 ${
                  qualifies ? "bg-emerald-500/12" : ""
                } ${row.isLive ? "ring-1 ring-inset ring-red-500/40" : ""}`}
              >
                <td className="py-2.5 pr-1 font-bold text-slate-400">
                  {i + 1}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Flag code={row.code} name={row.name} width={28} />
                    <span className="font-semibold text-slate-100">
                      {row.name}
                    </span>
                    {row.isLive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-900" />
                        Live
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-center tabular-nums text-slate-300">
                  {row.played}
                </td>
                <td className="py-2.5 text-center tabular-nums">{row.won}</td>
                <td className="py-2.5 text-center tabular-nums">
                  {row.drawn}
                </td>
                <td className="py-2.5 text-center tabular-nums">{row.lost}</td>
                <td className="py-2.5 text-center tabular-nums">{row.gf}</td>
                <td className="py-2.5 text-center tabular-nums">{row.ga}</td>
                <td
                  className={`py-2.5 text-center tabular-nums font-medium ${
                    row.gd > 0
                      ? "text-emerald-400"
                      : row.gd < 0
                        ? "text-red-400"
                        : "text-slate-400"
                  }`}
                >
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="py-2.5 text-center text-base font-extrabold tabular-nums text-brand">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupFixtures({
  fixtures,
  tenantSlug,
}: {
  fixtures: GroupFixture[];
  tenantSlug: string;
}) {
  const liveOrRecent = fixtures.filter(
    (f) =>
      f.status === "live" ||
      f.status === "halftime" ||
      f.status === "finished" ||
      f.countsForTable
  );
  const show = liveOrRecent.slice(-6).reverse();
  if (show.length === 0) {
    return (
      <p className="text-center text-xs text-slate-400">
        Nenhum jogo deste grupo em andamento.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {show.map((f) => {
        const isLive = f.status === "live" || f.status === "halftime";
        return (
          <li key={f.matchId}>
            <Link
              href={`/${tenantSlug}/jogo/${f.matchId}`}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-slate-800 ${
                isLive ? "bg-red-500/12 ring-1 ring-red-500/20" : "bg-white/5"
              }`}
            >
              <span className="w-12 shrink-0 text-center text-[11px] font-bold text-slate-400">
                {fixtureStatusLabel(f)}
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 truncate text-right font-medium">
                <span className="truncate">{f.home.name}</span>
                <Flag code={f.home.code} width={22} />
              </span>
              <span className="shrink-0 px-1 font-extrabold tabular-nums">
                {f.homeScore ?? "–"} × {f.awayScore ?? "–"}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium">
                <Flag code={f.away.code} width={22} />
                <span className="truncate">{f.away.name}</span>
              </span>
              {isLive && (
                <span className="shrink-0 text-[10px] font-bold uppercase text-red-400">
                  {STATUS_LABEL[f.status]}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupStandingsView({ tenantSlug }: { tenantSlug: string }) {
  const [data, setData] = useState<StandingsPayload | null>(null);
  const [active, setActive] = useState("A");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/standings", { cache: "no-store" });
      if (!res.ok) {
        setError("Não foi possível carregar a tabela.");
        return;
      }
      const json = (await res.json()) as StandingsPayload;
      setData(json);
      setError(null);
    } catch {
      setError("Falha na conexão. Tentando de novo…");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const group = data?.groups.find((g) => g.letter === active);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {data?.hasLive && (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
              Jogos ao vivo — tabela atualizando
            </span>
          )}
        </div>
        {data?.updatedAt && (
          <p className="text-xs text-slate-400">
            Atualizado às{" "}
            {new Date(data.updatedAt).toLocaleTimeString("pt-BR")}
            {data.provider === "demo" ? " · modo demonstração" : ""}
          </p>
        )}
      </div>

      <div className="-mx-1 mb-5 flex gap-1 overflow-x-auto pb-1">
        {(data?.groups ?? []).map((g) => (
          <button
            key={g.letter}
            type="button"
            onClick={() => setActive(g.letter)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${
              active === g.letter
                ? "bg-brand text-white shadow-sm"
                : "bg-slate-900 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800"
            }`}
          >
            {g.letter}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="card p-8 text-center text-slate-400">Carregando…</div>
      )}

      {error && (
        <div className="card mb-4 border-amber-500/30 bg-amber-500/12 p-4 text-sm text-amber-300">
          {error}
        </div>
      )}

      {group && (
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-800 bg-white/5 px-4 py-3">
              <h2 className="font-bold text-slate-100">{group.label}</h2>
              <p className="text-xs text-slate-400">
                Os dois primeiros avançam · fundo verde = zona de classificação
              </p>
            </div>
            <div className="p-3">
              <GroupTable rows={group.rows} />
            </div>
          </section>

          <section className="card p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Jogos do grupo
            </h3>
            <GroupFixtures fixtures={group.fixtures} tenantSlug={tenantSlug} />
          </section>
        </div>
      )}
    </div>
  );
}
