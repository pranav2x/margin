import type { Team } from '../../types';

export const teams: Record<string, Team> = {
  LAL: { id: 'LAL', city: 'Los Angeles', name: 'Lakers', abbreviation: 'LAL', sport: 'NBA', record: '34–18' },
  DEN: { id: 'DEN', city: 'Denver', name: 'Nuggets', abbreviation: 'DEN', sport: 'NBA', record: '32–20' },
  BOS: { id: 'BOS', city: 'Boston', name: 'Celtics', abbreviation: 'BOS', sport: 'NBA', record: '38–14' },
  NYK: { id: 'NYK', city: 'New York', name: 'Knicks', abbreviation: 'NYK', sport: 'NBA', record: '31–21' },
  DAL: { id: 'DAL', city: 'Dallas', name: 'Mavericks', abbreviation: 'DAL', sport: 'NBA', record: '29–23' },
  GSW: { id: 'GSW', city: 'Golden State', name: 'Warriors', abbreviation: 'GSW', sport: 'NBA', record: '27–25' },
  PHI: { id: 'PHI', city: 'Philadelphia', name: '76ers', abbreviation: 'PHI', sport: 'NBA', record: '28–24' },
  MIA: { id: 'MIA', city: 'Miami', name: 'Heat', abbreviation: 'MIA', sport: 'NBA', record: '26–26' },
  IND: { id: 'IND', city: 'Indiana', name: 'Fever', abbreviation: 'IND', sport: 'WNBA', record: '18–4' },
  LVA: { id: 'LVA', city: 'Las Vegas', name: 'Aces', abbreviation: 'LVA', sport: 'WNBA', record: '17–5' },
  KAN: { id: 'KAN', city: 'Kansas City', name: 'Chiefs', abbreviation: 'KC', sport: 'NFL', record: '11–4' },
  PHL: { id: 'PHL', city: 'Philadelphia', name: 'Eagles', abbreviation: 'PHI', sport: 'NFL', record: '12–3' },
  RMA: { id: 'RMA', city: 'Madrid', name: 'Real Madrid', abbreviation: 'RMA', sport: 'SOCCER', record: '21W · 5D · 2L' },
  BAR: { id: 'BAR', city: 'Barcelona', name: 'Barcelona', abbreviation: 'BAR', sport: 'SOCCER', record: '19W · 6D · 3L' },
};
