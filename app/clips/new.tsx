import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { useTheme } from '../../theme';

// Lane D — clip composer (record/import + caption).
export default function NewClip() {
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
        Add a clip — coming soon
      </Txt>
    </View>
  );
}
