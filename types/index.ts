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
