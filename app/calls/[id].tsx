import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { useTheme } from '../../theme';

// Lane B — single call detail.
export default function CallDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
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
        Call {id} — coming soon
      </Txt>
    </View>
  );
}
