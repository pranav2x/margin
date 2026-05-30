import { View, Pressable } from 'react-native';
import { Txt } from '../primitives/Text';
import { Score } from '../motion/Score';
import { AvatarMeta } from './AvatarMeta';
import { VerifiedBadge, type VerifiedTier } from '../primitives/VerifiedBadge';
import { AppIcon } from '../primitives/AppIcon';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

/**
 * LeaderboardRow — the Strava-faithful ranked-segment row, lifted out of
 * `(tabs)/index.tsx` so the same component renders on Boards, on Battles
 * recap lists, and inside Profile's "vs. your school" snippet.
 *
 * Layout, left → right:
 *   [ rank ]  [ avatar + @handle + school ]  [ value (▲▼ delta) + tier ]
 *
 * `isCurrentUser` is the row-highlight variant — surface-tinted background,
 * ember rank + value, never any other accent. The caller decides when to
 * pin the row (sticky-bottom pattern lives on the list, not here).
 */

export interface LeaderboardRowData {
  rank: number;
  handle: string;
  school: string | null;
  avatarUrl?: string;
  value: string;
  /** Positive = climbed since last week, negative = fell, 0 = same. */
  weeklyDelta?: number;
  tier: VerifiedTier;
}

interface Props {
  row: LeaderboardRowData;
  unit?: string | null;
  isCurrentUser?: boolean;
  onPress?: () => void;
}

export function LeaderboardRow({ row, unit, isCurrentUser = false, onPress }: Props) {
  const { colors } = useTheme();
  const accent = isCurrentUser || row.rank === 1;
  const a11y =
    `Rank ${row.rank}, @${row.handle}, ${row.value}${unit ? ' ' + unit : ''}, ` +
    `${row.tier === 'unverified' ? 'unverified' : row.tier === 'event' ? 'event-timed' : 'video-proof'}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING,
        minHeight: 64,
        // Current-user row sits on `overlay` (one step above the list bg);
        // pressed state lifts to `surface`. Depth = lighter, never shadowed.
        backgroundColor: isCurrentUser
          ? colors.overlay
          : pressed
            ? colors.surface
            : colors.paper,
        borderLeftWidth: isCurrentUser ? 3 : 0,
        borderLeftColor: isCurrentUser ? colors.ember : 'transparent',
      })}
    >
      <View style={{ width: 36, alignItems: 'flex-start' }}>
        <Score value={`${row.rank}`} size="md" tone={accent ? 'ember' : 'ink'} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: space[3] }}>
        <AvatarMeta
          avatarUrl={row.avatarUrl}
          handle={row.handle}
          meta={row.school ?? undefined}
          size="sm"
        />
      </View>

      <View style={{ alignItems: 'flex-end', minWidth: 92, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
          {row.weeklyDelta !== undefined && row.weeklyDelta !== 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <AppIcon
                name={row.weeklyDelta > 0 ? 'ChevronUp' : 'ChevronDown'}
                size={12}
                tone="ash"
              />
              <Txt variant="micro" tone="ash">
                {Math.abs(row.weeklyDelta)}
              </Txt>
            </View>
          ) : null}
          <Score value={row.value} size="md" tone={accent ? 'ember' : 'ink'} />
        </View>
        <VerifiedBadge tier={row.tier} />
      </View>
    </Pressable>
  );
}
