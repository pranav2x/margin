import { type RefObject } from 'react';
import { type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

/**
 * Centralised share helper. Every "Share X" path in the app should call this
 * so the export format (PNG, 9:16 friendly when the captured view is a
 * ShareableCanvas) and the share-sheet call site are uniform.
 *
 * The helper is safe to call from anywhere: it never throws (capture failures
 * on simulator or with no share targets just resolve silently). Returns true
 * on a successful share invocation, false otherwise — useful for callers that
 * want to fire side-effects (advance streak, log analytics) only on success.
 */
export async function shareSnapshot(
  ref: RefObject<View | null>,
  dialogTitle: string,
): Promise<boolean> {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = ref.current;
    if (!target) return false;
    const uri = await captureRef(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle });
    return true;
  } catch {
    return false;
  }
}
