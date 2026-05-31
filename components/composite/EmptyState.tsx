import { View } from 'react-native';
import { AppIcon, type IconName } from '../primitives/AppIcon';
import { Txt } from '../primitives/Text';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';

/**
 * EmptyState — a screen-level dead-end killer.
 *
 * Rule from the design report: an empty state must NEVER be a wall. Always
 * give the user a way forward — even a soft one. The CTA is required.
 *
 *   <EmptyState
 *     icon="Trophy"
 *     title="Be the first name on this board."
 *     body="Drop a mark on the You tab — it lands here the second you save."
 *     ctaLabel="ADD YOUR FIRST MARK"
 *     onPress={() => router.push('/(tabs)/you')}
 *   />
 *
 * `tone="soft"` reserves the call-to-action as a ghost button (used when the
 * empty state isn't a true zero — e.g. a filter cleared the list).
 */

interface Props {
  icon?: IconName;
  title: string;
  body?: string;
  ctaLabel: string;
  onPress: () => void;
  tone?: 'primary' | 'soft';
}

export function EmptyState({
  icon = 'Trophy',
  title,
  body,
  ctaLabel,
  onPress,
  tone = 'primary',
}: Props) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{
        paddingHorizontal: SCREEN_PADDING,
        paddingVertical: space[9],
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.fog,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space[4],
        }}
      >
        <AppIcon name={icon} size={32} tone="ash" />
      </View>
      <Txt variant="display4" weight="bold" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {body ? (
        <Txt
          variant="body"
          tone="ash"
          style={{ marginTop: space[3], textAlign: 'center' }}
        >
          {body}
        </Txt>
      ) : null}
      <View style={{ marginTop: space[5], alignSelf: 'stretch' }}>
        <PrimaryButton
          label={ctaLabel}
          variant={tone === 'soft' ? 'ghost' : 'primary'}
          full
          onPress={onPress}
        />
      </View>
    </View>
  );
}
