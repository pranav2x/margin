import { View, Pressable } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { Score } from '../motion/Score';
import { VerifiedBadge, tierOf } from '../primitives/VerifiedBadge';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { formatStatValue, type PlayerStat } from '../../lib/hooks/usePlayerProfile';

// Legacy 2-state mark — kept as a thin wrapper over VerifiedBadge so existing
// call sites stay working while the codebase migrates onto the full 3-tier
// vocabulary (unverified / video-proof / event-timed). `method`, when passed,
// promotes the badge to the event tier where appropriate.
export function VerifiedMark({
  verified,
  inverted,
  method,
}: {
  verified: boolean;
  inverted?: boolean;
  method?: string | null;
}) {
  return (
    <VerifiedBadge
      tier={tierOf(verified, method)}
      withLabel
      inverted={inverted}
    />
  );
}

interface Props {
  stat: PlayerStat;
  onPress: () => void;
}

export function StatLine({ stat, onPress }: Props) {
  const implausible = stat.is_plausible === false;
  const display = formatStatValue(stat.value, stat.metric.unit);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${stat.metric.label}, ${display} ${stat.metric.unit ?? ''}, ${stat.verified ? 'verified' : 'unverified'}${implausible ? ', outside expected range' : ''}`}
      style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[4], minHeight: 44 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: space[4] }}>
          <Txt variant="bodyLg" weight="semibold">{stat.metric.label}</Txt>
          {stat.metric.unit ? (
            <MicroLabel style={{ marginTop: space[1] }}>{stat.metric.unit}</MicroLabel>
          ) : null}
        </View>
        <Score
          value={display}
          size="md"
          tone={implausible ? 'ash' : 'ink'}
          style={implausible ? { textDecorationLine: 'line-through' } : undefined}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[3], gap: space[3] }}>
        <VerifiedMark verified={stat.verified} method={stat.verification_method} />
        {implausible ? (
          <Txt variant="bodySm" tone="ash" weight="semibold" style={{ flex: 1 }}>
            outside the expected range — verify to rank
          </Txt>
        ) : stat.notes ? (
          <Txt variant="bodySm" tone="ash" numberOfLines={1} style={{ flex: 1 }}>
            {stat.notes}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
