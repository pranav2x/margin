/**
 * TheSportsDB thin client. Free key "3" works for v1 testing.
 * Swap into hooks under lib/hooks/ to replace fixtures.
 */

const KEY = '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`thesportsdb ${res.status}`);
  return res.json() as Promise<T>;
}

export const thesportsdb = {
  player: (name: string) => get<{ player: unknown[] }>(`/searchplayers.php?p=${encodeURIComponent(name)}`),
  team: (name: string) => get<{ teams: unknown[] }>(`/searchteams.php?t=${encodeURIComponent(name)}`),
  schedule: (leagueId: string) => get<{ events: unknown[] }>(`/eventsnextleague.php?id=${leagueId}`),
};
