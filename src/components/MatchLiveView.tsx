"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag } from "./Flag";
import { SponsorBanner } from "./SponsorBanner";
import { scorePrediction } from "@/lib/scoring";
import type { LiveMatch, LiveEvent, Side } from "@/lib/livescore";
import { STATUS_LABEL } from "@/lib/livescore";

type TeamInfo = { name: string; code: string; heroPlayer?: string };
type SponsorInfo = { name: string; logoUrl: string; linkUrl?: string | null };

export type MatchLiveProps = {
  matchId: string;
  tenantSlug: string;
  stage: string;
  venue: string;
  kickoffISO: string;
  home: TeamInfo;
  away: TeamInfo;
  prediction: { home: number; away: number } | null;
  sponsorMatch: SponsorInfo | null;
  sponsorMaster: SponsorInfo | null;
  homeImage: string | null;
  awayImage: string | null;
  initial: LiveMatch;
};

const POLL_MS = 20000;

/**
 * Fixo na viewport, alinhado à faixa do placar (não no fim da página scrollável).
 */
const HERO_IMG =
  "pointer-events-none fixed bottom-0 z-0 hidden h-[94vh] max-h-[900px] w-[40vw] max-w-[42%] min-w-[280px] select-none object-contain drop-shadow-[0_10px_36px_rgba(0,0,0,0.55)] lg:block";

const EVENT_ICON: Record<LiveEvent["type"], string> = {
  goal: "⚽",
  yellow: "🟨",
  red: "🟥",
  sub: "🔁",
};

const EVENT_LABEL: Record<LiveEvent["type"], string> = {
  goal: "Gol",
  yellow: "Cartão amarelo",
  red: "Cartão vermelho",
  sub: "Substituição",
};

function kickoffLabel(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatBar({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  const total = home + away;
  const homePct = total === 0 ? 50 : Math.round((home / total) * 100);
  const homeLead = home > away;
  const awayLead = away > home;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={homeLead ? "font-bold text-white" : "text-slate-300"}>
          {home}
          {suffix}
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className={awayLead ? "font-bold text-white" : "text-slate-300"}>
          {away}
          {suffix}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className="bg-brand transition-all duration-500"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-gold transition-all duration-500"
          style={{ width: `${100 - homePct}%` }}
        />
      </div>
    </div>
  );
}

export function MatchLiveView({
  matchId,
  tenantSlug,
  stage,
  venue,
  kickoffISO,
  home,
  away,
  prediction,
  sponsorMatch,
  sponsorMaster,
  homeImage,
  awayImage,
  initial,
}: MatchLiveProps) {
  const [live, setLive] = useState<LiveMatch>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/live`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as LiveMatch;
      setLive(data);
      setUpdatedAt(new Date());
    } catch {
      /* keep last good state */
    }
  }, [matchId]);

  useEffect(() => {
    setUpdatedAt(new Date());
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

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const isLiveNow = live.status === "live" || live.status === "halftime";

  const minuteLabel =
    live.status === "live"
      ? `${live.minute ?? 0}'`
      : live.status === "halftime"
        ? "INT"
        : live.status === "finished"
          ? "FIM"
          : kickoffLabel(kickoffISO);

  const pts =
    prediction != null
      ? scorePrediction(
          prediction.home,
          prediction.away,
          live.home,
          live.away
        )
      : null;

  const stats = live.stats;
  const goals = live.events.filter((e) => e.type === "goal");

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-[#121926] text-white"
    >
      {(homeImage || awayImage) && (
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden max-lg:hidden"
          aria-hidden
        >
          {homeImage && (
            <img
              src={homeImage}
              alt=""
              className={`${HERO_IMG} left-0 object-[left_bottom]`}
            />
          )}
          {awayImage && (
            <img
              src={awayImage}
              alt=""
              className={`${HERO_IMG} right-0 -scale-x-100 object-[left_bottom]`}
            />
          )}
          <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_40%_55%_at_50%_28%,rgba(18,25,38,0.65),transparent_75%)]" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-5 pb-8">
        {/* top bar */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={`/${tenantSlug}/palpites`}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/20"
          >
            ← Voltar
          </Link>
          <div className="text-center text-xs text-slate-400">
            <div className="font-semibold text-slate-300">{stage}</div>
            <div>📍 {venue}</div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/20"
          >
            {isFullscreen ? "Sair" : "⛶ Tela cheia"}
          </button>
        </div>

        {/* status */}
        <div className="mb-4 flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              isLiveNow
                ? "bg-red-600 text-white"
                : live.status === "finished"
                  ? "bg-slate-700 text-slate-200"
                  : "bg-slate-700 text-slate-300"
            }`}
          >
            {isLiveNow && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            )}
            {STATUS_LABEL[live.status]}
          </span>
        </div>

        {/* scoreboard */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <Flag code={home.code} name={home.name} width={72} />
              <span className="text-base font-semibold">{home.name}</span>
              {home.heroPlayer && (
                <span className="text-xs text-slate-400">{home.heroPlayer}</span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="text-5xl font-extrabold tabular-nums">
                {live.home}
                <span className="px-2 text-slate-500">x</span>
                {live.away}
              </div>
              <div
                className={`mt-1 text-sm font-bold ${
                  isLiveNow ? "text-red-400" : "text-slate-400"
                }`}
              >
                {minuteLabel}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Flag code={away.code} name={away.name} width={72} />
              <span className="text-base font-semibold">{away.name}</span>
              {away.heroPlayer && (
                <span className="text-xs text-slate-400">{away.heroPlayer}</span>
              )}
            </div>
          </div>

          {/* user prediction / live points */}
          <div className="mt-5 border-t border-white/10 pt-4 text-center">
            {prediction == null ? (
              <p className="text-sm text-slate-400">
                Você não palpitou neste jogo.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
                <span className="text-slate-300">
                  Seu palpite:{" "}
                  <strong className="text-white">
                    {prediction.home} x {prediction.away}
                  </strong>
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pts === 3
                      ? "bg-emerald-500/20 text-emerald-300"
                      : pts === 1
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-600/40 text-slate-300"
                  }`}
                >
                  {live.status === "finished"
                    ? `${pts} ponto(s)`
                    : `valendo ${pts} ponto(s) ao vivo`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <SponsorBanner
            sponsor={sponsorMatch}
            label="Patrocinador do jogo"
            className="h-20"
          />
        </div>

        {/* statistics */}
        <div className="mt-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm">
          <h2 className="mb-4 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
            Estatísticas
          </h2>
          {stats ? (
            <div className="space-y-4">
              <StatBar
                label="Posse de bola"
                home={stats.home.possession}
                away={stats.away.possession}
                suffix="%"
              />
              <StatBar
                label="Finalizações"
                home={stats.home.shots}
                away={stats.away.shots}
              />
              <StatBar
                label="No alvo"
                home={stats.home.shotsOnTarget}
                away={stats.away.shotsOnTarget}
              />
              <StatBar
                label="Escanteios"
                home={stats.home.corners}
                away={stats.away.corners}
              />
              <StatBar
                label="Faltas"
                home={stats.home.fouls}
                away={stats.away.fouls}
              />
              <StatBar
                label="Amarelos"
                home={stats.home.yellow}
                away={stats.away.yellow}
              />
              <StatBar
                label="Vermelhos"
                home={stats.home.red}
                away={stats.away.red}
              />
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400">
              {live.status === "scheduled"
                ? "As estatísticas aparecem quando o jogo começa."
                : live.provider === "demo"
                  ? "Modo demonstração — sem estatísticas reais."
                  : "Estatísticas indisponíveis para esta partida."}
            </p>
          )}
        </div>

        {/* timeline */}
        <div className="mt-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm">
          <h2 className="mb-4 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
            Lances do jogo
          </h2>
          {live.events.length === 0 ? (
            <p className="text-center text-sm text-slate-400">
              {live.status === "scheduled"
                ? "O jogo ainda não começou."
                : "Sem lances registrados até agora."}
            </p>
          ) : (
            <ul className="space-y-2">
              {[...live.events]
                .sort((a, b) => b.minute - a.minute)
                .map((e, i) => (
                  <li
                    key={`${e.minute}-${e.type}-${i}`}
                    className={`flex items-center gap-3 text-sm ${
                      e.team === "away" ? "flex-row-reverse text-right" : ""
                    }`}
                  >
                    <span className="w-10 shrink-0 text-center font-bold text-slate-400">
                      {e.minute}'
                    </span>
                    <span className="text-lg" title={EVENT_LABEL[e.type]}>
                      {EVENT_ICON[e.type]}
                    </span>
                    <span className="text-slate-200">
                      {EVENT_LABEL[e.type]} ·{" "}
                      <span className="text-slate-400">
                        {(e.team === "home" ? home : away).name}
                      </span>{" "}
                      <span className="text-slate-500">({e.player})</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* master sponsor */}
        <div className="mt-5">
          <SponsorBanner
            sponsor={sponsorMaster}
            label="Patrocinador Master"
            className="h-20"
          />
        </div>


        <p className="mt-5 text-center text-[11px] text-slate-500">
          Atualiza automaticamente a cada 20s ·{" "}
          {live.provider === "demo"
            ? "modo demonstração (dados simulados)"
            : "dados ao vivo"}
          {updatedAt ? ` · ${updatedAt.toLocaleTimeString("pt-BR")}` : ""}
        </p>
      </div>
    </div>
  );
}
