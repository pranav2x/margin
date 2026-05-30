import { Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from './Text';
import { AppIcon, type IconName } from './AppIcon';
import { useTheme, space, radius } from '../../theme';

/**
 * FilterChip — single dismissible / pickable filter pill, e.g.
 * "Sport: Basketball ▾". Tap fires `onPress` (open a sheet, cycle a value,
 * etc.). Active = `overlay` bg + ink text; inactive = `surface` + ash text.
 *
 * Use ONE chip per filter dimension; if you want a whole row of multi-select
 * filters, those are SportChips (legacy) — FilterChip is the single-source
 * dropdown affordance that replaces the four-emoji sport row on Boards.
 */
interface Props {
  label: string;
  /** Optional leading icon. */
  leadingIcon?: IconName;
  /** Trailing chevron, defaults to ChevronDown when `onPress` is set. */
  trailingIcon?: IconName | null;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function FilterChip({
  label,
  leadingIcon,
  trailingIcon,
  active = true,
  onPress,
  style,
}: Props) {
  const { colors } = useTheme();
  const trailing = trailingIcon === null ? null : trailingIcon ?? (onPress ? 'ChevronDown' : null);

  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          height: 36,
          paddingHorizontal: space[3],
          borderRadius: radius.full,
          backgroundColor: pressed
            ? colors.popover
            : active
              ? colors.overlay
              : colors.surface,
        },
        style ?? {},
      ]}
    >
      {leadingIcon ? <AppIcon name={leadingIcon} size={16} tone={active ? 'ink' : 'ash'} /> : null}
      <Txt variant="bodySm" weight="semibold" tone={active ? 'ink' : 'ash'}>
        {label}
      </Txt>
      {trailing ? (
        <View style={{ marginLeft: -2 }}>
          <AppIcon name={trailing} size={14} tone="ash" />
        </View>
      ) : null}
    </Pressable>
  );
}
