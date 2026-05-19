export type ID = string;
export type ISODate = string;

export type Sport = 'NBA' | 'WNBA' | 'NFL' | 'MLB' | 'NHL' | 'SOCCER' | 'CFB' | 'F1';

export interface Team {
  id: ID;
  city: string;
  name: string;
  abbreviation: string;
  sport: Sport;
  record?: string;
}

export interface SeasonStats {
  ppg?: number;
  rpg?: number;
  apg?: number;
  spg?: number;
  bpg?: number;
  fg?: number;
  threes?: number;
  ft?: number;
  [k: string]: number | undefined;
}

export interface Athlete {
  id: ID;
  firstName: string;
  lastName: string;
  team: Team;
  sport: Sport;
  position: string;
  jersey: number;
  avatar: string;
  stats: SeasonStats;
  bio?: string;
  recent?: RecentGame[];
}

export interface RecentGame {
  date: ISODate;
  opponent: string;
  result: 'W' | 'L';
  margin: number;
  line: string;
}

export interface Game {
  id: ID;
  sport: Sport;
  startTime: ISODate;
  status: 'scheduled' | 'live' | 'final';
  period?: string;
  clock?: string;
  home: { team: Team; score: number };
  away: { team: Team; score: number };
}

export type StoryBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; by: string }
  | { type: 'stat'; value: string; label: string }
  | { type: 'heading'; text: string };

export interface Story {
  id: ID;
  headline: string;
  italicizeTokens?: string[];
  deck: string;
  body: StoryBlock[];
  heroImage: string;
  byline: string;
  publishedAt: ISODate;
  readMinutes: number;
  tags: Sport[];
  athleteId?: ID;
}

export interface User {
  id: ID;
  handle: string;
  displayName: string;
  avatar: string;
  followingAthletes: ID[];
  followingSports: Sport[];
}

export interface Take {
  id: ID;
  author: User;
  body: string;
  createdAt: ISODate;
  counts: { respond: number; cosign: number; dispute: number };
  myReaction?: 'respond' | 'cosign' | 'dispute';
  topic?: Sport;
}

export interface Call {
  id: ID;
  user: ID;
  game: ID;
  selection: ID;
  filedAt: ISODate;
  result?: 'win' | 'loss';
  editorialNote?: string;
}

export interface Clip {
  id: ID;
  videoUrl: string;
  poster: string;
  eyebrow: string;
  athleteName: string;
  context: string;
  saves: number;
  shares: number;
  comments: number;
}

export interface PlayByPlay {
  id: ID;
  gameId: ID;
  clock: string;
  period: string;
  team: string;
  description: string;
  scoring?: boolean;
  score?: { home: number; away: number };
}

export interface FollowedAthleteRow {
  athlete: Athlete;
  context: string;
  timeAgo: string;
}
