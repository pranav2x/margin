import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { useTheme } from '../../theme';

// Lane B — post-a-take composer.
export default function NewTake() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top,
      }}
    >
      <Txt variant="bodyLg" tone="ash">
        Post a take — coming soon
      </Txt>
    </View>
  );
}
