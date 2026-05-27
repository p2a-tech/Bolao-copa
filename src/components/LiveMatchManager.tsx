"use client";

import { useEffect, useState, useTransition } from "react";

type LiveFixture = {
  fixtureId: string;
  league: string;
  country: string;
  round: string;
  status: string;
  elapsed: number | null;
  home: string;
  away: string;
  goalsHome: number | null;
  goalsAway: number | null;
};

type AddedMatch = {
  id: string;
  externalId: string | null;
  stage: string;
  venue: string;
  kickoff: string;
  home: string;
  away: string;
};

type Payload = { live: LiveFixture[]; added: AddedMatch[] };

const PRIORITY_LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "UEFA Champions League",
  "UEFA Europa League",
  "UEFA Europa Conference League",
  "Conmebol Libertadores",
  "Copa Sudamericana",
  "Serie A",
  "Brasileiro",
  "Brasileirão",
  "Copa do Brasil",
  "World Cup",
];

function leagueScore(name: string): number {
  const idx = PRIORITY_LEAGUES.findIndex((p) =>
    name.toLowerCase().includes(p.toLowerCase())
  );
  return idx >= 0 ? idx : 999;
}

export function LiveMatchManager() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/live-match", {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000); // refresh a cada 30s
    return () => clearInterval(t);
  }, []);

  async function addFixture(fixtureId: string) {
    if (!fixtureId.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/superadmin/live-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixtureId: fixtureId.trim() }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
        setManualId("");
        await refresh();
      } catch (e: any) {
        alert("Erro ao adicionar: " + (e?.message ?? "desconhecido"));
      }
    });
  }

  async function removeMatch(id: string) {
    if (!confirm("Remover este jogo do bolão?")) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/superadmin/live-match?id=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
        await refresh();
      } catch (e: any) {
        alert("Erro ao remover: " + (e?.message ?? "desconhecido"));
      }
    });
  }

  const liveAdded = new Set(
    data?.added?.map((m) => m.externalId).filter(Boolean) as string[]
  );

  const liveSorted = (data?.live ?? [])
    .filter((f) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        f.home.toLowerCase().includes(q) ||
        f.away.toLowerCase().includes(q) ||
        f.league.toLowerCase().includes(q) ||
        f.country.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => leagueScore(a.league) - leagueScore(b.league));

  return (
    <div className="space-y-8">
      {/* Adicionar por ID manual */}
      <section className="rounded-xl bg-slate-900 p-4 ring-1 ring-white/10">
        <h2 className="mb-2 text-base font-bold text-slate-100">
          Adicionar por fixture ID
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Cole o <code className="rounded bg-slate-800 px-1">fixture id</code>{" "}
          da API-Football (qualquer jogo, mesmo agendado pra mais tarde).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.replace(/\D/g, ""))}
            placeholder="ex.: 1526155"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
          <button
            disabled={!manualId || pending}
            onClick={() => addFixture(manualId)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </section>

      {/* Jogos já adicionados */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-100">
          Jogos ao vivo adicionados ({data?.added?.length ?? 0})
        </h2>
        {data?.added?.length ? (
          <ul className="space-y-2">
            {data.added.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-900 p-3 ring-1 ring-white/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">
                    {m.home} × {m.away}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {m.stage.replace(/^AO VIVO AGORA -\s*/, "")} · {m.venue}
                  </div>
                </div>
                <a
                  href={`/demo/jogo/${m.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/25"
                >
                  Ver →
                </a>
                <button
                  disabled={pending}
                  onClick={() => removeMatch(m.id)}
                  className="rounded-lg bg-red-600/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/25 disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhum jogo ao vivo adicionado.</p>
        )}
      </section>

      {/* Lista de jogos ao vivo agora na API */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-100">
            Acontecendo agora na API ({liveSorted.length})
          </h2>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar liga, país ou time…"
            className="w-56 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
          />
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "..." : "Atualizar"}
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300 ring-1 ring-red-700/40">
            {error}
          </p>
        )}

        {loading && !data ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : liveSorted.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum jogo ao vivo no momento (ou o filtro não encontrou nada).
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {liveSorted.map((f) => {
              const already = liveAdded.has(f.fixtureId);
              return (
                <li
                  key={f.fixtureId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 ring-1 ring-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-slate-400">
                      {f.league} · {f.country}
                    </div>
                    <div className="flex items-center gap-2 truncate text-sm font-semibold text-slate-100">
                      <span className="truncate">{f.home}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums">
                        {f.goalsHome ?? "-"} × {f.goalsAway ?? "-"}
                      </span>
                      <span className="truncate">{f.away}</span>
                    </div>
                    <div className="text-xs text-emerald-400">
                      {f.status} · {f.elapsed ?? "-"}'
                    </div>
                  </div>
                  <button
                    disabled={pending || already}
                    onClick={() => addFixture(f.fixtureId)}
                    className={
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 " +
                      (already
                        ? "bg-slate-800 text-slate-500"
                        : "bg-emerald-600 text-white hover:bg-emerald-500")
                    }
                  >
                    {already ? "Já no bolão" : "Adicionar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
