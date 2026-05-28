import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useCallsStore, type FiledCall } from '../../state/calls';
import type { ID } from '../../types';

interface DbCall {
  id: string;
  game_id: string;
  selection: string;
  confidence: number | null;
  result: 'pending' | 'win' | 'loss';
  filed_at: string;
}

const CALLS_KEY = ['calls'] as const;

function dbToLocal(row: DbCall): FiledCall {
  return {
    gameId: row.game_id,
    selection: row.selection,
    filedAt: row.filed_at,
    result: row.result === 'pending' ? undefined : row.result,
    confidence: row.confidence ?? undefined,
  };
}

export function useCalls() {
  return useQuery({
    queryKey: CALLS_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { filed: {} as Record<ID, FiledCall>, record: { wins: 0, losses: 0 } };

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const filed: Record<ID, FiledCall> = {};
      let wins = 0;
      let losses = 0;

      for (const row of data ?? []) {
        filed[row.game_id] = dbToLocal(row);
        if (row.result === 'win') wins++;
        else if (row.result === 'loss') losses++;
      }

      // Rehydrate Zustand store
      useCallsStore.setState({ filed, record: { wins, losses } });

      return { filed, record: { wins, losses } };
    },
  });
}

export function useFileCall() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, selection, confidence }: { gameId: ID; selection: ID; confidence?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('calls')
        .upsert({
          user_id: user.id,
          game_id: gameId,
          selection,
          confidence: confidence ?? null,
          filed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,game_id' });

      if (error) throw error;
    },
    onMutate: ({ gameId, selection, confidence }) => {
      // Optimistic update
      useCallsStore.getState().fileCall(gameId, selection, confidence);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CALLS_KEY });
    },
  });
}

export function useSetConfidence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, confidence }: { gameId: ID; confidence: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('calls')
        .update({ confidence })
        .eq('user_id', user.id)
        .eq('game_id', gameId);

      if (error) throw error;
    },
    onMutate: ({ gameId, confidence }) => {
      useCallsStore.getState().setCallConfidence(gameId, confidence);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CALLS_KEY });
    },
  });
}

export function useSettleCalls() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (settlements: { gameId: ID; result: 'win' | 'loss' }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const { gameId, result } of settlements) {
        await supabase
          .from('calls')
          .update({ result })
          .eq('user_id', user.id)
          .eq('game_id', gameId);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CALLS_KEY });
    },
  });
}
