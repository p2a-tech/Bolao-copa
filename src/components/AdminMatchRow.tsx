"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { flagEmoji } from "@/lib/flags";

type Sponsor = { id: string; name: string };

export function AdminMatchRow({
  match,
  sponsors,
}: {
  match: {
    id: string;
    stage: string;
    kickoffISO: string;
    home: { name: string; code: string };
    away: { name: string; code: string };
    homeScore: number | null;
    awayScore: number | null;
    finished: boolean;
    sponsorId: string | null;
  };
  sponsors: Sponsor[];
}) {
  const router = useRouter();
  const [home, setHome] = useState<number>(match.homeScore ?? 0);
  const [away, setAway] = useState<number>(match.awayScore ?? 0);
  const [sponsorId, setSponsorId] = useState<string>(match.sponsorId ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveResult() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Resultado salvo e ranking atualizado." : "Erro.");
    if (res.ok) router.refresh();
  }

  async function saveSponsor(value: string) {
    setSponsorId(value);
    await fetch("/api/admin/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, sponsorId: value || null }),
    });
    router.refresh();
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>{match.stage}</span>
        <span>
          {new Date(match.kickoffISO).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {match.finished && (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
              encerrado
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[170px] items-center gap-2 font-semibold">
          <span className="text-2xl">{flagEmoji(match.home.code)}</span>
          {match.home.name}
        </div>
        <input
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(parseInt(e.target.value || "0", 10))}
          className="h-10 w-14 rounded-lg border border-slate-300 text-center font-bold"
        />
        <span className="font-bold text-slate-400">x</span>
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(parseInt(e.target.value || "0", 10))}
          className="h-10 w-14 rounded-lg border border-slate-300 text-center font-bold"
        />
        <div className="flex min-w-[170px] items-center gap-2 font-semibold">
          <span className="text-2xl">{flagEmoji(match.away.code)}</span>
          {match.away.name}
        </div>

        <button onClick={saveResult} disabled={busy} className="btn-primary">
          {busy ? "Salvando..." : "Salvar resultado"}
        </button>

        <select
          value={sponsorId}
          onChange={(e) => saveSponsor(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">Sem patrocinador</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
