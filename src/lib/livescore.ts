/**
 * Live match provider.
 *
 * Two implementations selected by the LIVE_PROVIDER env var:
 *  - "demo" (default): a deterministic, offline simulation. The Cup hasn't
 *    started yet, so this keeps the live screen demonstrable — every match
 *    shows a believable, evolving game (looping virtual clock).
 *  - "api-football": real data from https://www.api-football.com. Requires
 *    API_FOOTBALL_KEY and Match.externalId (the provider's fixture id). Falls
 *    back to the demo simulation when not configured/mapped or on error.
 */

export type LiveStatus = "scheduled" | "live" | "halftime" | "finished";
export type LiveEventType = "goal" | "yellow" | "red" | "sub";
export type Side = "home" | "away";

export interface LiveEvent {
  minute: number;
  team: Side;
  type: LiveEventType;
  player: string;
}

export interface SideStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellow: number;
  red: number;
}

export interface LiveMatch {
  status: LiveStatus;
  minute: number | null;
  home: number;
  away: number;
  events: LiveEvent[];
  stats: { home: SideStats; away: SideStats } | null;
  provider: "demo" | "api-football";
}

export interface LiveMatchInput {
  id: string;
  kickoff: Date;
  externalId: string | null;
}

export const STATUS_LABEL: Record<LiveStatus, string> = {
  scheduled: "A começar",
  live: "Ao vivo",
  halftime: "Intervalo",
  finished: "Encerrado",
};

// ---------- deterministic RNG ----------

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- demo simulation ----------

// Virtual minutes per loop (90' play + breaks + reset). One virtual minute
// elapses every 10 real seconds, so a full demo match runs in ~15 min.
const CYCLE = 110;

function demoClock(seed: number): { status: LiveStatus; minute: number | null } {
  const span = CYCLE * 10;
  const offset = seed % span;
  const raw = Math.floor(((Math.floor(Date.now() / 1000) + offset) % span) / 10);
  if (raw === 0) return { status: "scheduled", minute: null };
  if (raw <= 45) return { status: "live", minute: raw };
  if (raw <= 55) return { status: "halftime", minute: 45 };
  if (raw <= 100) return { status: "live", minute: raw - 10 };
  return { status: "finished", minute: 90 };
}

function buildScript(seed: number): LiveEvent[] {
  const rnd = mulberry32(seed);
  const events: LiveEvent[] = [];
  const add = (type: LiveEventType, team: Side) => {
    events.push({
      minute: 1 + Math.floor(rnd() * 90),
      team,
      type,
      player: `Camisa ${1 + Math.floor(rnd() * 22)}`,
    });
  };
  const homeGoals = Math.floor(rnd() * 4);
  const awayGoals = Math.floor(rnd() * 4);
  const yellows = 2 + Math.floor(rnd() * 5);
  const reds = rnd() < 0.22 ? 1 : 0;
  const subs = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < homeGoals; i++) add("goal", "home");
  for (let i = 0; i < awayGoals; i++) add("goal", "away");
  for (let i = 0; i < yellows; i++) add("yellow", rnd() < 0.5 ? "home" : "away");
  for (let i = 0; i < reds; i++) add("red", rnd() < 0.5 ? "home" : "away");
  for (let i = 0; i < subs; i++) add("sub", rnd() < 0.5 ? "home" : "away");
  return events.sort((a, b) => a.minute - b.minute);
}

function demoStats(
  seed: number,
  minute: number,
  events: LiveEvent[]
): { home: SideStats; away: SideStats } {
  const rnd = mulberry32(seed ^ 0x51ed2701);
  const homePoss = Math.round(42 + rnd() * 16);
  const grow = (rate: number, jitter: number) =>
    Math.max(0, Math.round(minute * rate + rnd() * jitter));
  const count = (team: Side, type: LiveEventType) =>
    events.filter((e) => e.team === team && e.type === type).length;

  const home: SideStats = {
    possession: homePoss,
    shots: grow(0.18, 3),
    shotsOnTarget: 0,
    corners: grow(0.1, 2),
    fouls: grow(0.16, 3),
    yellow: count("home", "yellow"),
    red: count("home", "red"),
  };
  const away: SideStats = {
    possession: 100 - homePoss,
    shots: grow(0.16, 3),
    shotsOnTarget: 0,
    corners: grow(0.09, 2),
    fouls: grow(0.17, 3),
    yellow: count("away", "yellow"),
    red: count("away", "red"),
  };
  home.shotsOnTarget = Math.round(home.shots * 0.4);
  away.shotsOnTarget = Math.round(away.shots * 0.4);
  return { home, away };
}

function demoLive(seed: number): LiveMatch {
  const { status, minute } = demoClock(seed);
  const script = buildScript(seed);
  const clock =
    status === "scheduled" ? 0 : status === "finished" ? 90 : minute ?? 0;
  const events = status === "scheduled" ? [] : script.filter((e) => e.minute <= clock);
  const home = events.filter((e) => e.team === "home" && e.type === "goal").length;
  const away = events.filter((e) => e.team === "away" && e.type === "goal").length;
  const stats = status === "scheduled" ? null : demoStats(seed, clock, events);
  return { status, minute, home, away, events, stats, provider: "demo" };
}

// ---------- API-Football ----------

const API_BASE = "https://v3.football.api-sports.io";

function mapStatus(short: string | undefined): LiveStatus {
  switch (short) {
    case "1H":
    case "2H":
    case "ET":
    case "BT":
    case "P":
    case "LIVE":
      return "live";
    case "HT":
      return "halftime";
    case "FT":
    case "AET":
    case "PEN":
    case "PST":
    case "CANC":
    case "ABD":
    case "AWD":
    case "WO":
      return "finished";
    default:
      return "scheduled";
  }
}

function mapEventType(e: any): LiveEventType | null {
  const type = String(e?.type ?? "").toLowerCase();
  const detail = String(e?.detail ?? "").toLowerCase();
  if (type === "goal") return "goal";
  if (type === "subst") return "sub";
  if (type === "card") {
    if (detail.includes("red")) return "red";
    if (detail.includes("yellow")) return "yellow";
  }
  return null;
}

function statValue(arr: any[], type: string): number {
  const raw = arr?.find((s) => s?.type === type)?.value;
  if (raw == null) return 0;
  const n = parseInt(String(raw).replace("%", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapStats(
  response: any[],
  homeId: number
): { home: SideStats; away: SideStats } | null {
  if (!Array.isArray(response) || response.length < 2) return null;
  const pick = (entry: any): SideStats => {
    const s = entry?.statistics ?? [];
    return {
      possession: statValue(s, "Ball Possession"),
      shots: statValue(s, "Total Shots"),
      shotsOnTarget: statValue(s, "Shots on Goal"),
      corners: statValue(s, "Corner Kicks"),
      fouls: statValue(s, "Fouls"),
      yellow: statValue(s, "Yellow Cards"),
      red: statValue(s, "Red Cards"),
    };
  };
  const h = response.find((r) => r?.team?.id === homeId) ?? response[0];
  const a = response.find((r) => r?.team?.id !== homeId) ?? response[1];
  return { home: pick(h), away: pick(a) };
}

async function apiFootballLive(input: LiveMatchInput): Promise<LiveMatch> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key || !input.externalId) return demoLive(hashSeed(input.id));

  const opt: RequestInit & { next: { revalidate: number } } = {
    headers: { "x-apisports-key": key },
    next: { revalidate: 20 },
  };
  const id = encodeURIComponent(input.externalId);
  const [fxRes, evRes, stRes] = await Promise.all([
    fetch(`${API_BASE}/fixtures?id=${id}`, opt),
    fetch(`${API_BASE}/fixtures/events?fixture=${id}`, opt),
    fetch(`${API_BASE}/fixtures/statistics?fixture=${id}`, opt),
  ]);

  const fx = (await fxRes.json())?.response?.[0];
  if (!fx) return demoLive(hashSeed(input.id));

  const homeId = fx?.teams?.home?.id;
  const status = mapStatus(fx?.fixture?.status?.short);
  const minute = fx?.fixture?.status?.elapsed ?? null;

  const evJson = (await evRes.json())?.response ?? [];
  const events: LiveEvent[] = evJson
    .map((e: any) => ({
      minute: e?.time?.elapsed ?? 0,
      team: e?.team?.id === homeId ? "home" : "away",
      type: mapEventType(e),
      player: e?.player?.name ?? "—",
    }))
    .filter((e: any): e is LiveEvent => e.type !== null)
    .sort((a: LiveEvent, b: LiveEvent) => a.minute - b.minute);

  const stJson = (await stRes.json())?.response ?? [];
  const stats = status === "scheduled" ? null : mapStats(stJson, homeId);

  return {
    status,
    minute,
    home: fx?.goals?.home ?? 0,
    away: fx?.goals?.away ?? 0,
    events,
    stats,
    provider: "api-football",
  };
}

// ---------- entry point ----------

export async function getLiveMatch(input: LiveMatchInput): Promise<LiveMatch> {
  const provider = (process.env.LIVE_PROVIDER || "demo").toLowerCase();
  if (provider === "api-football") {
    try {
      return await apiFootballLive(input);
    } catch {
      return demoLive(hashSeed(input.id));
    }
  }
  return demoLive(hashSeed(input.id));
}
