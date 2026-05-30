import { View, Pressable } from 'react-native';
import { Avatar } from '../primitives/Avatar';
import { Txt } from '../primitives/Text';
import { space, useTheme } from '../../theme';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  avatarUrl?: string;
  handle: string;
  meta?: string;
  timestamp?: string;
  size?: Size;
  onPress?: () => void;
}

const AVATAR_SIZE: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

/**
 * Avatar + handle + meta line. The standard card header.
 * Replaces ~8 inline `<Avatar /> + <Txt>@handle</Txt>` clusters.
 */
export function AvatarMeta({
  avatarUrl,
  handle,
  meta,
  timestamp,
  size = 'md',
  onPress,
}: Props) {
  const { colors } = useTheme();
  const avatarSize = AVATAR_SIZE[size];

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <Avatar uri={avatarUrl} size={avatarSize} />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyLg" weight="semibold" numberOfLines={1}>
          @{handle}
        </Txt>
        {meta || timestamp ? (
          <Txt
            variant="bodySm"
            tone="ash"
            numberOfLines={1}
            style={{ marginTop: 2, color: colors.ash }}
          >
            {meta}
            {meta && timestamp ? ' · ' : ''}
            {timestamp}
          </Txt>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return body;
}
