import { create } from 'zustand';

/**
 * Shared trigger for the "Log stat" action in the BottomTabBar create sheet.
 *
 * The You tab owns the StatEntrySheet ref (it's the screen that already
 * mounts the sheet). The BottomTabBar lives at the navigator level and can't
 * reach that ref directly — so we use this micro-store as a pub/sub:
 *
 *   • Screens hosting a StatEntrySheet call `setStatEntryHandler(fn)`
 *     on mount (with `fn = () => sheetRef.current?.present()`).
 *   • The create-button sheet calls `openStatEntry()` to invoke it.
 *
 * No other consumers should touch this — it's a chrome plumbing detail.
 */

type Handler = () => void;

interface CreateSheetState {
  statEntryHandler: Handler | null;
  setStatEntryHandler: (fn: Handler | null) => void;
  openStatEntry: () => void;
}

export const useCreateSheetStore = create<CreateSheetState>((set, get) => ({
  statEntryHandler: null,
  setStatEntryHandler: (fn) => set({ statEntryHandler: fn }),
  openStatEntry: () => {
    const handler = get().statEntryHandler;
    if (handler) handler();
  },
}));
