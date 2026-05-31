import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Txt } from './Text';
import { useTheme, space, radius } from '../../theme';

/**
 * VerifiedBadge — the 3-tier verification mark used everywhere a stat is
 * shown.
 *
 *   'unverified' — hollow grey outline, no check. Self-reported.
 *   'video'      — ink outline + ink check. Backed by a clip on file.
 *   'event'      — solid ember pill + paper check. Electronically timed.
 *
 * Tier vocabulary is the user-facing source of truth for trust — keep the
 * three modes visually distinct at a glance, never collapse two into one.
 * Renders compact by default; pass `withLabel` for the badge + word form
 * used on profile + ShareCard.
 */

export type VerifiedTier = 'unverified' | 'video' | 'event';

interface Props {
  tier: VerifiedTier;
  withLabel?: boolean;
  inverted?: boolean;
}

const LABELS: Record<VerifiedTier, string> = {
  unverified: 'Unverified',
  video: 'Video-proof',
  event: 'Event-timed',
};

export function VerifiedBadge({ tier, withLabel = false, inverted = false }: Props) {
  const { colors } = useTheme();
  const base = inverted ? colors.paper : colors.ink;

  const visual = (() => {
    if (tier === 'event') {
      return {
        bg: colors.ember,
        border: colors.ember,
        fg: colors.paper,
        showCheck: true,
      };
    }
    if (tier === 'video') {
      return {
        bg: 'transparent' as const,
        border: base,
        fg: base,
        showCheck: true,
      };
    }
    return {
      bg: 'transparent' as const,
      border: colors.ash,
      fg: colors.ash,
      showCheck: false,
    };
  })();

  const dot = (
    <View
      accessible
      accessibilityLabel={LABELS[tier]}
      style={{
        width: 18,
        height: 18,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: visual.border,
        backgroundColor: visual.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {visual.showCheck ? (
        <AppIcon
          name="Check"
          size={12}
          tone={tier === 'event' ? 'paper' : inverted ? 'paper' : 'ink'}
        />
      ) : null}
    </View>
  );

  if (!withLabel) return dot;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      {dot}
      <Txt
        variant="micro"
        style={{ color: tier === 'event' ? colors.ember : visual.fg }}
      >
        {LABELS[tier].toUpperCase()}
      </Txt>
    </View>
  );
}

/**
 * Helper — map the (legacy) `verified: boolean + verification_method: string`
 * stat shape onto a tier. Keeps callers from sprinkling the same conditional
 * everywhere. Recognised methods: `event`, `event_timed`, `electronic` →
 * event tier; anything truthy with a clip ref → video tier; else unverified.
 */
export function tierOf(verified: boolean, method?: string | null): VerifiedTier {
  if (!verified) return 'unverified';
  const m = (method ?? '').toLowerCase();
  if (m === 'event' || m === 'event_timed' || m === 'electronic') return 'event';
  return 'video';
}
