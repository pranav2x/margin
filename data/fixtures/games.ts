import type { Game } from '../../types';
import { teams } from './teams';

export const games: Game[] = [
  {
    id: 'g1',
    sport: 'NBA',
    startTime: '2026-05-18T19:30:00-04:00',
    status: 'live',
    period: 'Q3',
    clock: '4:22',
    home: { team: teams.LAL, score: 78 },
    away: { team: teams.NYK, score: 74 },
  },
  {
    id: 'g2',
    sport: 'NBA',
    startTime: '2026-05-18T20:00:00-04:00',
    status: 'live',
    period: 'Q2',
    clock: '1:08',
    home: { team: teams.BOS, score: 58 },
    away: { team: teams.MIA, score: 52 },
  },
  {
    id: 'g3',
    sport: 'WNBA',
    startTime: '2026-05-18T19:00:00-04:00',
    status: 'live',
    period: 'Q4',
    clock: '3:11',
    home: { team: teams.IND, score: 89 },
    away: { team: teams.LVA, score: 84 },
  },
  {
    id: 'g4',
    sport: 'NBA',
    startTime: '2026-05-18T22:00:00-04:00',
    status: 'live',
    period: 'Q1',
    clock: '6:44',
    home: { team: teams.GSW, score: 22 },
    away: { team: teams.DEN, score: 28 },
  },
  {
    id: 'g5',
    sport: 'SOCCER',
    startTime: '2026-05-18T15:00:00-04:00',
    status: 'final',
    home: { team: teams.RMA, score: 3 },
    away: { team: teams.BAR, score: 2 },
  },
  {
    id: 'g6',
    sport: 'NBA',
    startTime: '2026-05-19T20:00:00-04:00',
    status: 'scheduled',
    home: { team: teams.DAL, score: 0 },
    away: { team: teams.DEN, score: 0 },
  },
  {
    id: 'g7',
    sport: 'NBA',
    startTime: '2026-05-19T20:30:00-04:00',
    status: 'scheduled',
    home: { team: teams.PHI, score: 0 },
    away: { team: teams.BOS, score: 0 },
  },
  {
    id: 'g8',
    sport: 'NBA',
    startTime: '2026-05-19T22:00:00-04:00',
    status: 'scheduled',
    home: { team: teams.LAL, score: 0 },
    away: { team: teams.GSW, score: 0 },
  },
  {
    id: 'g9',
    sport: 'WNBA',
    startTime: '2026-05-19T19:00:00-04:00',
    status: 'scheduled',
    home: { team: teams.LVA, score: 0 },
    away: { team: teams.IND, score: 0 },
  },
];

export function gameById(id: string): Game | undefined {
  return games.find(g => g.id === id);
}
