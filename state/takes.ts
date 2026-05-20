import { create } from 'zustand';
import type { Take } from '../types';
import { takes as seedTakes } from '../data/fixtures/takes';

interface TakesState {
  takes: Take[];
  postTake: (body: string) => void;
  react: (id: string, reaction: 'respond' | 'cosign' | 'dispute') => void;
}

let counter = 1000;

export const useTakesStore = create<TakesState>((set) => ({
  takes: seedTakes,
  postTake: (body) =>
    set((s) => ({
      takes: [
        {
          id: `local-${++counter}`,
          author: {
            id: 'you',
            handle: 'you',
            displayName: 'You',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
            followingAthletes: [],
            followingSports: [],
          },
          body,
          createdAt: new Date().toISOString(),
          counts: { respond: 0, cosign: 0, dispute: 0 },
        },
        ...s.takes,
      ],
    })),
  react: (id, reaction) =>
    set((s) => ({
      takes: s.takes.map((t) => {
        if (t.id !== id) return t;
        const prev = t.myReaction;
        const counts = { ...t.counts };
        if (prev === reaction) {
          counts[reaction] = Math.max(0, counts[reaction] - 1);
          return { ...t, counts, myReaction: undefined };
        }
        if (prev) counts[prev] = Math.max(0, counts[prev] - 1);
        counts[reaction] = counts[reaction] + 1;
        return { ...t, counts, myReaction: reaction };
      }),
    })),
}));
