import { View, Pressable, Text } from 'react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { Score } from '../motion/Score';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';
import { formatStatValue, type PlayerStat } from '../../lib/hooks/usePlayerProfile';

// Verified is a small filled-ink pill; unverified is a hairline outline. No
// color-coding — both verified and unverified read in ink/paper only.
export function VerifiedMark({ verified, inverted }: { verified: boolean; inverted?: boolean }) {
  const { colors } = useTheme();
  const base = inverted ? colors.paper : colors.ink;
  const onBase = inverted ? colors.ink : colors.paper;
  return (
    <View
      accessible
      accessibilityLabel={verified ? 'Verified' : 'Unverified'}
      style={{
        borderWidth: 1,
        borderColor: base,
        backgroundColor: verified ? base : 'transparent',
        paddingHorizontal: space[2],
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: fonts.bold,
          fontSize: 10,
          lineHeight: 14,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: verified ? onBase : base,
        }}
      >
        {verified ? 'Verified' : 'Unverified'}
      </Text>
    </View>
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
        <VerifiedMark verified={stat.verified} />
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
