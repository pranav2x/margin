import { create } from 'zustand';
import type { Sport, ID } from '../types';

interface UserState {
  handle: string;
  displayName: string;
  avatar: string;
  followingAthletes: ID[];
  followingSports: Sport[];
  editionStreak: number;
  streakFreezesRemaining: number;
  gradYear: number;
  school: string;
  follow: (athleteId: ID) => void;
  unfollow: (athleteId: ID) => void;
  toggleFollow: (athleteId: ID) => void;
  isFollowing: (athleteId: ID) => boolean;
  setSports: (sports: Sport[]) => void;
  setProfile: (p: { handle: string; displayName: string }) => void;
  incrementStreak: () => void;
  useStreakFreeze: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  handle: 'you',
  displayName: 'Your Name',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
  followingAthletes: ['luka', 'caitlin', 'lebron', 'jokic', 'tatum', 'brunson'],
  followingSports: ['NBA', 'WNBA'],
  editionStreak: 7,
  streakFreezesRemaining: 1,
  gradYear: 2027,
  school: 'Lincoln HS',
  follow: (id) =>
    set((s) =>
      s.followingAthletes.includes(id)
        ? s
        : { followingAthletes: [...s.followingAthletes, id] },
    ),
  unfollow: (id) =>
    set((s) => ({ followingAthletes: s.followingAthletes.filter((a) => a !== id) })),
  toggleFollow: (id) => {
    const s = get();
    if (s.followingAthletes.includes(id)) s.unfollow(id);
    else s.follow(id);
  },
  isFollowing: (id) => get().followingAthletes.includes(id),
  setSports: (sports) => set({ followingSports: sports }),
  setProfile: ({ handle, displayName }) => set({ handle, displayName }),
  incrementStreak: () => {
    /* no-op placeholder until streak roll-up is wired */
  },
  useStreakFreeze: () => {
    /* no-op placeholder until freeze logic is wired */
  },
}));
