import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppIcon, type IconName } from './AppIcon';
import { Txt } from './Text';
import { space, useTheme } from '../../theme';

interface Props {
  likes: number;
  comments: number;
  shares?: number;
  liked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

interface ItemProps {
  icon: IconName;
  count: number;
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}

function Item({ icon, count, active, onPress, accessibilityLabel }: ItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}
    >
      <AppIcon name={icon} size={22} tone={active ? 'ember' : 'ink'} filled={active} />
      <Txt
        variant="bodySm"
        weight="semibold"
        style={{ color: active ? colors.ember : colors.ink }}
      >
        {count}
      </Txt>
    </Pressable>
  );
}

/**
 * Three icon+count actions in a row. Heart / Comment / Share.
 * Standard card-footer pattern for clips + takes.
 */
export function SocialActionRow({
  likes,
  comments,
  shares,
  liked,
  onLike,
  onComment,
  onShare,
}: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[5] }}>
      <Item
        icon="Heart"
        count={likes}
        active={liked}
        onPress={onLike}
        accessibilityLabel={liked ? 'Unlike' : 'Like'}
      />
      <Item icon="MessageCircle" count={comments} onPress={onComment} accessibilityLabel="Comment" />
      {shares !== undefined ? (
        <Item icon="Share2" count={shares} onPress={onShare} accessibilityLabel="Share" />
      ) : null}
    </View>
  );
}
