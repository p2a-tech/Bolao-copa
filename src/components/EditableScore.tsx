"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function clamp(n: number) {
  return Math.max(0, Math.min(99, n));
}

/**
 * Stepper inline para editar o palpite direto no card de "Meus palpites".
 * Só renderiza para palpites com status `open` (jogo ainda não travado).
 * Trata o erro 409 da API quando o mesmo placar é reenviado.
 */
export function EditableScore({
  matchId,
  initialHome,
  initialAway,
}: {
  matchId: string;
  initialHome: number;
  initialAway: number;
}) {
  const router = useRouter();
  const [home, setHome] = useState<number>(initialHome);
  const [away, setAway] = useState<number>(initialAway);
  const [savedHome, setSavedHome] = useState<number>(initialHome);
  const [savedAway, setSavedAway] = useState<number>(initialAway);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const dirty = home !== savedHome || away !== savedAway;

  async function save() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeScore: home,
          awayScore: away,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error || "Erro ao salvar palpite.");
        return;
      }
      setStatus("ok");
      setMessage("Palpite atualizado!");
      setSavedHome(home);
      setSavedAway(away);
      router.refresh();
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 2000);
    } catch {
      setStatus("error");
      setMessage("Falha de conexão.");
    }
  }

  const Btn = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "saving"}
      className="h-8 w-8 shrink-0 rounded-full bg-slate-800 text-base font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        Editar palpite
      </div>

      <div className="flex items-center gap-2">
        <Btn label="−" onClick={() => setHome(clamp(home - 1))} />
        <input
          type="number"
          inputMode="numeric"
          value={home}
          onChange={(e) =>
            setHome(clamp(parseInt(e.target.value || "0", 10)))
          }
          disabled={status === "saving"}
          className="h-10 w-14 rounded-lg border border-slate-700 bg-slate-800 text-center text-xl font-bold text-slate-100"
          aria-label="Placar mandante"
        />
        <Btn label="+" onClick={() => setHome(clamp(home + 1))} />

        <span className="px-1 text-lg font-bold text-slate-500">×</span>

        <Btn label="−" onClick={() => setAway(clamp(away - 1))} />
        <input
          type="number"
          inputMode="numeric"
          value={away}
          onChange={(e) =>
            setAway(clamp(parseInt(e.target.value || "0", 10)))
          }
          disabled={status === "saving"}
          className="h-10 w-14 rounded-lg border border-slate-700 bg-slate-800 text-center text-xl font-bold text-slate-100"
          aria-label="Placar visitante"
        />
        <Btn label="+" onClick={() => setAway(clamp(away + 1))} />
      </div>

      <div className="flex min-h-[24px] flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {status === "saving" ? "Salvando..." : "Salvar"}
        </button>
        {message && (
          <span
            className={`text-xs ${
              status === "error"
                ? "text-red-400"
                : status === "ok"
                  ? "text-emerald-400"
                  : "text-slate-400"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
