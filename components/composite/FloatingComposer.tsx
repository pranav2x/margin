import { Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface Props {
  onPress: () => void;
  bottom?: number;
}

export function FloatingComposer({ onPress, bottom = 100 }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 24,
        bottom,
        width: 56,
        height: 56,
        borderRadius: 999,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Plus size={22} color={colors.paper} strokeWidth={1.5} />
    </Pressable>
  );
}
