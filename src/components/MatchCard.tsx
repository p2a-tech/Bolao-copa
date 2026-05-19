"use client";

import { useState } from "react";
import { Countdown } from "./Countdown";
import { SponsorBanner } from "./SponsorBanner";
import { flagEmoji } from "@/lib/flags";

export type MatchCardData = {
  id: string;
  stage: string;
  venue: string;
  kickoffISO: string;
  home: { name: string; code: string };
  away: { name: string; code: string };
  finished: boolean;
  realHome: number | null;
  realAway: number | null;
  predHome: number | null;
  predAway: number | null;
  points: number | null;
  sponsor: { name: string; logoUrl: string; linkUrl?: string | null } | null;
};

const LOCK_MINUTES = 30;

function kickoffLabel(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({ data }: { data: MatchCardData }) {
  const kickoff = new Date(data.kickoffISO).getTime();
  const lockAt = kickoff - LOCK_MINUTES * 60 * 1000;
  const locked = data.finished || Date.now() >= lockAt;

  const [home, setHome] = useState<number>(data.predHome ?? 0);
  const [away, setAway] = useState<number>(data.predAway ?? 0);
  const [saved, setSaved] = useState<boolean>(
    data.predHome !== null && data.predAway !== null
  );
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  function clamp(n: number) {
    return Math.max(0, Math.min(99, n));
  }

  async function save() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: data.id,
          homeScore: home,
          awayScore: away,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error || "Erro ao salvar palpite.");
        return;
      }
      setStatus("ok");
      setSaved(true);
      setMessage("Palpite salvo!");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setMessage("Falha de conexão.");
    }
  }

  const Stepper = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (n: number) => void;
    label: string;
  }) => (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          disabled={locked}
          onClick={() => onChange(clamp(value - 1))}
          className="h-9 w-9 rounded-full bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
        >
          –
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={`Placar ${label}`}
          value={value}
          disabled={locked}
          onChange={(e) => onChange(clamp(parseInt(e.target.value || "0", 10)))}
          className="h-12 w-14 rounded-lg border border-slate-300 text-center text-2xl font-bold text-slate-900 disabled:bg-slate-100"
        />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={locked}
          onClick={() => onChange(clamp(value + 1))}
          className="h-9 w-9 rounded-full bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
        <span>{data.stage}</span>
        <span>{kickoffLabel(data.kickoffISO)}</span>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center text-center">
            <span className="text-4xl leading-none">
              {flagEmoji(data.home.code)}
            </span>
            <span className="mt-1 text-sm font-semibold">
              {data.home.name}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {data.finished ? (
              <div className="text-center">
                <div className="text-2xl font-extrabold text-slate-900">
                  {data.realHome} <span className="text-slate-400">x</span>{" "}
                  {data.realAway}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  resultado
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Stepper value={home} onChange={setHome} label="mandante" />
                <span className="text-xl font-bold text-slate-400">x</span>
                <Stepper value={away} onChange={setAway} label="visitante" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-4xl leading-none">
              {flagEmoji(data.away.code)}
            </span>
            <span className="mt-1 text-sm font-semibold">
              {data.away.name}
            </span>
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-slate-400">
          📍 {data.venue}
        </div>

        <div className="mt-3">
          <Countdown
            kickoffISO={data.kickoffISO}
            lockMinutes={LOCK_MINUTES}
          />
        </div>

        {data.finished && data.points !== null && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold ${
              data.points === 3
                ? "bg-emerald-100 text-emerald-700"
                : data.points === 1
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {data.predHome !== null
              ? `Seu palpite: ${data.predHome} x ${data.predAway} · ${data.points} ponto(s)`
              : "Você não palpitou neste jogo"}
          </div>
        )}

        {!data.finished && !locked && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span
              className={`text-sm ${
                status === "error"
                  ? "text-red-600"
                  : status === "ok"
                    ? "text-emerald-600"
                    : "text-slate-400"
              }`}
            >
              {message || (saved ? "Palpite registrado" : "Faça seu palpite")}
            </span>
            <button
              onClick={save}
              disabled={status === "saving"}
              className="btn-primary"
            >
              {status === "saving"
                ? "Salvando..."
                : saved
                  ? "Atualizar"
                  : "Salvar palpite"}
            </button>
          </div>
        )}
      </div>

      {data.sponsor && (
        <div className="border-t border-slate-100 px-4 py-3">
          <SponsorBanner
            sponsor={data.sponsor}
            label="Patrocinador do jogo"
            className="h-16"
          />
        </div>
      )}
    </div>
  );
}
