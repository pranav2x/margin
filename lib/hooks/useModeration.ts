import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Neutral report categories — no value judgement of the person, just the issue.
export const REPORT_REASONS = [
  'harassment',
  'hate_or_abuse',
  'impersonation',
  'inappropriate',
  'fake_stats',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment',
  hate_or_abuse: 'Hate or abuse',
  impersonation: 'Impersonation',
  inappropriate: 'Inappropriate content',
  fake_stats: 'Fake stats',
  spam: 'Spam',
  other: 'Something else',
};

export function useReportProfile() {
  return useMutation({
    mutationFn: async ({ targetProfileId, reason }: { targetProfileId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_profile_id: targetProfileId,
        reason,
      });
      if (error) throw error;
    },
  });
}

export function useBlockProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetProfileId }: { targetProfileId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');
      const { error } = await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: targetProfileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Block-aware RLS hides the user server-side; refresh anything that lists
      // or reads profiles/stats so they drop out of the viewer's views.
      qc.invalidateQueries({ queryKey: ['public-profile'] });
      qc.invalidateQueries({ queryKey: ['public-stats'] });
      qc.invalidateQueries({ queryKey: ['opponent-search'] });
      qc.invalidateQueries({ queryKey: ['school-opponents'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
