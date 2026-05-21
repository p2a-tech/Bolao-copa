"use client";

import { useEffect, useState } from "react";

function diffParts(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

/**
 * Shows a live alert + countdown to the moment predictions lock
 * (LOCK_MINUTES before kickoff). Renders a locked state afterwards.
 */
export function Countdown({
  kickoffISO,
  lockMinutes = 30,
}: {
  kickoffISO: string;
  lockMinutes?: number;
}) {
  const kickoff = new Date(kickoffISO).getTime();
  const lockAt = kickoff - lockMinutes * 60 * 1000;

  // Start null so server HTML and the first client render match (no time
  // value yet). The real countdown only renders after mount on the client.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return (
      <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-sm font-medium text-slate-400">
        ⏱️ Calculando…
      </div>
    );
  }

  if (now >= kickoff) {
    return (
      <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-sm font-medium text-slate-400">
        Jogo em andamento ou encerrado
      </div>
    );
  }

  if (now >= lockAt) {
    return (
      <div className="rounded-lg bg-red-500/12 px-3 py-2 text-center text-sm font-semibold text-red-400 ring-1 ring-red-500/30">
        🔒 Palpites encerrados para este jogo
      </div>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(lockAt - now);
  const urgent = lockAt - now < 60 * 60 * 1000; // last hour

  return (
    <div
      className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ring-1 ${
        urgent
          ? "bg-amber-500/12 text-amber-300 ring-amber-300 animate-pulse"
          : "bg-emerald-500/12 text-emerald-300 ring-emerald-200"
      }`}
    >
      ⏱️ Fecha em{" "}
      <span className="tabular-nums">
        {days > 0 && `${days}d `}
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
