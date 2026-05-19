import { create } from 'zustand';
import type { ID } from '../types';

export interface FiledCall {
  gameId: ID;
  selection: ID;
  filedAt: string;
  result?: 'win' | 'loss';
  confidence?: number;
}

interface CallsState {
  filed: Record<ID, FiledCall>;
  // season record across all settled calls (wins/losses are game outcomes, not gambling)
  record: { wins: number; losses: number };
  fileCall: (gameId: ID, selection: ID, confidence?: number) => void;
  unfileCall: (gameId: ID) => void;
  setCallConfidence: (gameId: ID, confidence: number) => void;
  settleAllRandom: () => void;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  filed: {},
  record: { wins: 47, losses: 22 },
  fileCall: (gameId, selection, confidence) =>
    set((s) => ({
      filed: {
        ...s.filed,
        [gameId]: {
          gameId,
          selection,
          filedAt: new Date().toISOString(),
          ...(confidence !== undefined ? { confidence } : {}),
        },
      },
    })),
  unfileCall: (gameId) =>
    set((s) => {
      const { [gameId]: _omit, ...rest } = s.filed;
      void _omit;
      return { filed: rest };
    }),
  setCallConfidence: (gameId, confidence) =>
    set((s) => {
      const existing = s.filed[gameId];
      if (!existing) return s;
      return {
        filed: {
          ...s.filed,
          [gameId]: { ...existing, confidence },
        },
      };
    }),
  settleAllRandom: () => {
    const s = get();
    const next: Record<ID, FiledCall> = {};
    let wins = s.record.wins;
    let losses = s.record.losses;
    for (const k of Object.keys(s.filed)) {
      const call = s.filed[k];
      if (call.result) {
        next[k] = call;
        continue;
      }
      const win = Math.random() > 0.4;
      next[k] = { ...call, result: win ? 'win' : 'loss' };
      if (win) wins++;
      else losses++;
    }
    set({ filed: next, record: { wins, losses } });
  },
}));
