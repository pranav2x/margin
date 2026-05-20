/**
 * balldontlie.io thin client. No key required for v1's tier.
 * Swap into hooks under lib/hooks/ to replace fixtures.
 */

const BASE = 'https://api.balldontlie.io/v1';

export interface BdlPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: { id: number; abbreviation: string; full_name: string };
}

export interface BdlGame {
  id: number;
  date: string;
  home_team: { abbreviation: string; full_name: string };
  home_team_score: number;
  visitor_team: { abbreviation: string; full_name: string };
  visitor_team_score: number;
  status: string;
  period: number;
  time?: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`balldontlie ${res.status}`);
  return res.json() as Promise<T>;
}

export const balldontlie = {
  games: (params: { dates?: string[]; per_page?: number } = {}) => {
    const q = new URLSearchParams();
    (params.dates ?? []).forEach((d) => q.append('dates[]', d));
    if (params.per_page) q.set('per_page', String(params.per_page));
    return get<{ data: BdlGame[] }>(`/games?${q.toString()}`);
  },
  players: (search?: string) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    return get<{ data: BdlPlayer[] }>(`/players?${q.toString()}`);
  },
};
