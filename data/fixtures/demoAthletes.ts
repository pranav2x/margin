/**
 * Seed athletes — fills the golden Boards screen with believable real-feeling
 * data so the layout reads as a populated leaderboard, not an empty state.
 *
 * Used ONLY by `app/golden/*` reference screens (and any future demo / app-
 * store screenshot flows). Production leaderboards still pull from Supabase.
 */

import type { VerifiedTier } from '../../components/primitives/VerifiedBadge';

export type Sport = 'football' | 'basketball' | 'baseball' | 'track';

export interface DemoAthlete {
  rank: number;
  handle: string;
  fullName: string;
  school: string;
  city: string;
  state: string;
  sport: Sport;
  position: string;
  /** Display value, already formatted with units. */
  value: string;
  /** Numeric for sort / delta math. */
  rawValue: number;
  /** Positive = climbed since last week. */
  weeklyDelta: number;
  tier: VerifiedTier;
  avatarUrl?: string;
  /** Local-storage marker for the demo "current user" row highlight. */
  isCurrentUser?: boolean;
}

// 40-yard dash — football, lower is better.
export const DEMO_FORTY_BOARD: DemoAthlete[] = [
  { rank: 1,  handle: 'jaxon.reid',     fullName: 'Jaxon Reid',     school: 'Hightower HS',    city: 'Houston',      state: 'TX', sport: 'football', position: 'WR', value: '4.41s', rawValue: 4.41, weeklyDelta: 0,  tier: 'event' },
  { rank: 2,  handle: 'd.morales',      fullName: 'Diego Morales',  school: 'St. Augustine',   city: 'San Diego',    state: 'CA', sport: 'football', position: 'CB', value: '4.44s', rawValue: 4.44, weeklyDelta: 2,  tier: 'event' },
  { rank: 3,  handle: 'tre.washington', fullName: 'Tre Washington', school: 'IMG Academy',     city: 'Bradenton',    state: 'FL', sport: 'football', position: 'RB', value: '4.46s', rawValue: 4.46, weeklyDelta: -1, tier: 'event' },
  { rank: 4,  handle: 'malik.j',        fullName: 'Malik Johnson',  school: 'Mater Dei',       city: 'Santa Ana',    state: 'CA', sport: 'football', position: 'WR', value: '4.48s', rawValue: 4.48, weeklyDelta: 1,  tier: 'video' },
  { rank: 5,  handle: 'ant.ortiz',      fullName: 'Antonio Ortiz',  school: 'Bishop Gorman',   city: 'Las Vegas',    state: 'NV', sport: 'football', position: 'S',  value: '4.49s', rawValue: 4.49, weeklyDelta: 0,  tier: 'video' },
  { rank: 6,  handle: 'k.brooks',       fullName: 'Kayden Brooks',  school: 'DeMatha',         city: 'Hyattsville',  state: 'MD', sport: 'football', position: 'WR', value: '4.51s', rawValue: 4.51, weeklyDelta: 3,  tier: 'video' },
  { rank: 7,  handle: 'j.okafor',       fullName: 'Junior Okafor',  school: 'St. Frances',     city: 'Baltimore',    state: 'MD', sport: 'football', position: 'RB', value: '4.52s', rawValue: 4.52, weeklyDelta: -2, tier: 'video' },
  { rank: 8,  handle: 'kade.miller',    fullName: 'Kade Miller',    school: 'Allen HS',        city: 'Allen',        state: 'TX', sport: 'football', position: 'CB', value: '4.53s', rawValue: 4.53, weeklyDelta: 0,  tier: 'video' },
  { rank: 9,  handle: 'lj.dawson',      fullName: 'LJ Dawson',      school: 'Centennial',      city: 'Corona',       state: 'CA', sport: 'football', position: 'WR', value: '4.55s', rawValue: 4.55, weeklyDelta: 4,  tier: 'unverified' },
  { rank: 10, handle: 'you',            fullName: 'You',            school: 'Lake Travis HS',  city: 'Austin',       state: 'TX', sport: 'football', position: 'WR', value: '4.56s', rawValue: 4.56, weeklyDelta: 5,  tier: 'video', isCurrentUser: true },
  { rank: 11, handle: 's.carter',       fullName: 'Silas Carter',   school: 'Buford HS',       city: 'Buford',       state: 'GA', sport: 'football', position: 'S',  value: '4.57s', rawValue: 4.57, weeklyDelta: -1, tier: 'video' },
  { rank: 12, handle: 'rico.h',         fullName: 'Rico Hernandez', school: 'Westlake',        city: 'Austin',       state: 'TX', sport: 'football', position: 'WR', value: '4.58s', rawValue: 4.58, weeklyDelta: 0,  tier: 'unverified' },
  { rank: 13, handle: 'tj.allen',       fullName: 'TJ Allen',       school: 'Duncanville',     city: 'Duncanville',  state: 'TX', sport: 'football', position: 'CB', value: '4.59s', rawValue: 4.59, weeklyDelta: 1,  tier: 'video' },
  { rank: 14, handle: 'noah.k',         fullName: 'Noah Kim',       school: 'Servite',         city: 'Anaheim',      state: 'CA', sport: 'football', position: 'WR', value: '4.61s', rawValue: 4.61, weeklyDelta: -3, tier: 'unverified' },
  { rank: 15, handle: 'cam.r',          fullName: 'Cameron Reyes',  school: 'St. Thomas',      city: 'Houston',      state: 'TX', sport: 'football', position: 'RB', value: '4.62s', rawValue: 4.62, weeklyDelta: 2,  tier: 'video' },
  { rank: 16, handle: 'd.harris',       fullName: 'Devin Harris',   school: 'North Shore',     city: 'Houston',      state: 'TX', sport: 'football', position: 'WR', value: '4.63s', rawValue: 4.63, weeklyDelta: 0,  tier: 'video' },
  { rank: 17, handle: 'eli.t',          fullName: 'Eli Thompson',   school: 'Liberty',         city: 'Henderson',    state: 'NV', sport: 'football', position: 'LB', value: '4.65s', rawValue: 4.65, weeklyDelta: 1,  tier: 'unverified' },
  { rank: 18, handle: 'r.gonzalez',     fullName: 'Rene Gonzalez',  school: 'Mission Viejo',   city: 'Mission Viejo',state: 'CA', sport: 'football', position: 'WR', value: '4.66s', rawValue: 4.66, weeklyDelta: -2, tier: 'video' },
  { rank: 19, handle: 'm.foster',       fullName: 'Marcus Foster',  school: 'Lake Travis HS',  city: 'Austin',       state: 'TX', sport: 'football', position: 'S',  value: '4.68s', rawValue: 4.68, weeklyDelta: 0,  tier: 'unverified' },
  { rank: 20, handle: 'q.bennett',      fullName: 'Quinn Bennett',  school: 'Cathedral',       city: 'Indianapolis', state: 'IN', sport: 'football', position: 'WR', value: '4.70s', rawValue: 4.70, weeklyDelta: 3,  tier: 'unverified' },
  { rank: 21, handle: 'b.nguyen',       fullName: 'Brandon Nguyen', school: 'Centennial',      city: 'Corona',       state: 'CA', sport: 'football', position: 'RB', value: '4.71s', rawValue: 4.71, weeklyDelta: -1, tier: 'video' },
  { rank: 22, handle: 'a.singh',        fullName: 'Aarav Singh',    school: 'Plano West',      city: 'Plano',        state: 'TX', sport: 'football', position: 'CB', value: '4.73s', rawValue: 4.73, weeklyDelta: 0,  tier: 'unverified' },
  { rank: 23, handle: 'k.barnes',       fullName: 'Khalil Barnes',  school: 'Lakota West',     city: 'Liberty Twp',  state: 'OH', sport: 'football', position: 'WR', value: '4.74s', rawValue: 4.74, weeklyDelta: 2,  tier: 'unverified' },
  { rank: 24, handle: 'j.park',         fullName: 'Joshua Park',    school: 'Bellaire',        city: 'Bellaire',     state: 'TX', sport: 'football', position: 'S',  value: '4.76s', rawValue: 4.76, weeklyDelta: -3, tier: 'unverified' },
  { rank: 25, handle: 'd.scott',        fullName: 'Devon Scott',    school: 'St. John Bosco',  city: 'Bellflower',   state: 'CA', sport: 'football', position: 'WR', value: '4.78s', rawValue: 4.78, weeklyDelta: 0,  tier: 'unverified' },
];

/** The "you" record — convenience for the You / profile screen header. */
export const DEMO_CURRENT_USER = DEMO_FORTY_BOARD.find((a) => a.isCurrentUser)!;

/** The single nemesis matchup for Battle of the Week. */
export const DEMO_RIVAL = DEMO_FORTY_BOARD.find((a) => a.handle === 'jaxon.reid')!;

export interface DemoMetric {
  key: string;
  label: string;
  /** The unit suffix shown in row trailing values, e.g. "s", "lb", "in". */
  unit: string;
}

export const DEMO_METRICS: ReadonlyArray<DemoMetric> = [
  { key: 'forty', label: '40-yd Dash', unit: 's' },
  { key: 'bench', label: 'Bench',      unit: 'lb' },
  { key: 'vert',  label: 'Vertical',   unit: 'in' },
  { key: 'mile',  label: 'Mile',       unit: '' },
] as const;

export interface DemoStatLine {
  date: string;
  metric: string;
  value: string;
  tier: VerifiedTier;
  delta?: number;
}

/** Recent stats logged by the current user — shown on the You screen. */
export const DEMO_USER_STATS: ReadonlyArray<DemoStatLine> = [
  { date: 'Today',       metric: '40-yd Dash', value: '4.56s', tier: 'video',      delta: -0.04 },
  { date: 'Yesterday',   metric: 'Bench',      value: '245 lb',tier: 'video',      delta: +10   },
  { date: '3d ago',      metric: 'Vertical',   value: '34 in', tier: 'unverified', delta: +1    },
  { date: '5d ago',      metric: '40-yd Dash', value: '4.60s', tier: 'video' },
  { date: 'Last week',   metric: 'Bench',      value: '235 lb',tier: 'video' },
];
