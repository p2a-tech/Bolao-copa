import type { LiveMatch, LiveStatus } from "@/lib/livescore";

export type StandingRow = {
  teamId: string;
  name: string;
  code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  /** Team is playing a match right now (live or interval). */
  isLive: boolean;
};

export type GroupFixture = {
  matchId: string;
  kickoffISO: string;
  home: { id: string; name: string; code: string };
  away: { id: string; name: string; code: string };
  homeScore: number | null;
  awayScore: number | null;
  status: LiveStatus | "scheduled";
  minute: number | null;
  countsForTable: boolean;
};

export type GroupStandings = {
  letter: string;
  label: string;
  rows: StandingRow[];
  fixtures: GroupFixture[];
};

export type GroupMatchInput = {
  id: string;
  kickoff: Date;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; code: string; group: string };
  awayTeam: { id: string; name: string; code: string; group: string };
};

function emptyRow(team: { id: string; name: string; code: string }): StandingRow {
  return {
    teamId: team.id,
    name: team.name,
    code: team.code,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    isLive: false,
  };
}

function compareRows(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    b.won - a.won ||
    a.name.localeCompare(b.name, "pt-BR")
  );
}

export function parseGroupLetter(teamGroup: string): string {
  const m = teamGroup.match(/Grupo\s+([A-L])/i);
  return m ? m[1].toUpperCase() : teamGroup.slice(-1).toUpperCase();
}

export function resolveMatchScore(
  match: GroupMatchInput,
  live: LiveMatch | null
): {
  home: number;
  away: number;
  status: LiveStatus | "scheduled";
  minute: number | null;
  countsForTable: boolean;
} {
  if (
    match.finished &&
    match.homeScore != null &&
    match.awayScore != null
  ) {
    return {
      home: match.homeScore,
      away: match.awayScore,
      status: "finished",
      minute: 90,
      countsForTable: true,
    };
  }

  if (live) {
    const counts =
      live.status === "finished" ||
      live.status === "live" ||
      live.status === "halftime";
    return {
      home: live.home,
      away: live.away,
      status: live.status,
      minute: live.minute,
      countsForTable: counts,
    };
  }

  return {
    home: match.homeScore ?? 0,
    away: match.awayScore ?? 0,
    status: "scheduled",
    minute: null,
    countsForTable: false,
  };
}

export function buildGroupStandings(
  groupLetter: string,
  matches: GroupMatchInput[],
  liveByMatchId: Map<string, LiveMatch>
): GroupStandings {
  const groupMatches = matches.filter(
    (m) =>
      parseGroupLetter(m.homeTeam.group) === groupLetter &&
      parseGroupLetter(m.awayTeam.group) === groupLetter
  );

  const teams = new Map<string, StandingRow>();
  for (const m of groupMatches) {
    if (!teams.has(m.homeTeam.id)) teams.set(m.homeTeam.id, emptyRow(m.homeTeam));
    if (!teams.has(m.awayTeam.id)) teams.set(m.awayTeam.id, emptyRow(m.awayTeam));
  }

  const fixtures: GroupFixture[] = groupMatches
    .map((m) => {
      const live = liveByMatchId.get(m.id) ?? null;
      const resolved = resolveMatchScore(m, live);
      return {
        matchId: m.id,
        kickoffISO: m.kickoff.toISOString(),
        home: {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          code: m.homeTeam.code,
        },
        away: {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          code: m.awayTeam.code,
        },
        homeScore: resolved.countsForTable ? resolved.home : null,
        awayScore: resolved.countsForTable ? resolved.away : null,
        status: resolved.status,
        minute: resolved.minute,
        countsForTable: resolved.countsForTable,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
    );

  for (const m of groupMatches) {
    const live = liveByMatchId.get(m.id) ?? null;
    const { home, away, countsForTable, status } = resolveMatchScore(m, live);
    if (!countsForTable) continue;

    const homeRow = teams.get(m.homeTeam.id)!;
    const awayRow = teams.get(m.awayTeam.id)!;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.gf += home;
    homeRow.ga += away;
    awayRow.gf += away;
    awayRow.ga += home;

    if (status === "live" || status === "halftime") {
      homeRow.isLive = true;
      awayRow.isLive = true;
    }

    if (home > away) {
      homeRow.won += 1;
      homeRow.points += 3;
      awayRow.lost += 1;
    } else if (home < away) {
      awayRow.won += 1;
      awayRow.points += 3;
      homeRow.lost += 1;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  const rows = [...teams.values()].map((r) => ({
    ...r,
    gd: r.gf - r.ga,
  }));
  rows.sort(compareRows);

  return {
    letter: groupLetter,
    label: `Grupo ${groupLetter}`,
    rows,
    fixtures,
  };
}

export const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
