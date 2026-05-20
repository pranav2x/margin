import type { PlayByPlay } from '../../types';

export const playByPlay: Record<string, PlayByPlay[]> = {
  g1: [
    { id: 'p1', gameId: 'g1', clock: '4:22', period: 'Q3', team: 'LAL', description: 'LeBron James turnaround jumper from 14 ft', scoring: true, score: { home: 78, away: 74 } },
    { id: 'p2', gameId: 'g1', clock: '4:38', period: 'Q3', team: 'NYK', description: 'Brunson misses pull-up 3-pointer; Anunoby rebound' },
    { id: 'p3', gameId: 'g1', clock: '5:02', period: 'Q3', team: 'NYK', description: 'OG Anunoby 3-pointer from 26 ft, assist Brunson', scoring: true, score: { home: 76, away: 74 } },
    { id: 'p4', gameId: 'g1', clock: '5:24', period: 'Q3', team: 'LAL', description: 'Davis tip-in', scoring: true, score: { home: 76, away: 71 } },
    { id: 'p5', gameId: 'g1', clock: '5:48', period: 'Q3', team: 'LAL', description: 'Reaves driving layup; foul on Hart', scoring: true, score: { home: 74, away: 71 } },
    { id: 'p6', gameId: 'g1', clock: '6:11', period: 'Q3', team: 'NYK', description: 'Towns pick-and-pop 3 from 24 ft', scoring: true, score: { home: 72, away: 71 } },
    { id: 'p7', gameId: 'g1', clock: '6:42', period: 'Q3', team: 'LAL', description: 'James assist · Russell 3-pointer from 25 ft', scoring: true, score: { home: 72, away: 68 } },
    { id: 'p8', gameId: 'g1', clock: '7:08', period: 'Q3', team: 'NYK', description: 'Bridges drives, kicks; Brunson misses 3' },
    { id: 'p9', gameId: 'g1', clock: '7:30', period: 'Q3', team: 'LAL', description: 'Timeout · Lakers' },
    { id: 'p10', gameId: 'g1', clock: '7:42', period: 'Q3', team: 'NYK', description: 'Robinson putback dunk', scoring: true, score: { home: 69, away: 68 } },
  ],
};
