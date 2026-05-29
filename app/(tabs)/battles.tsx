import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

export default function BattlesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingTop: insets.top + space[7],
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      <MicroLabel>HEAD-TO-HEAD</MicroLabel>
      <Txt variant="display2" style={{ marginTop: space[3] }}>
        Battles
      </Txt>
      <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4] }}>
        Compare athletes side by side here.
      </Txt>
    </View>
  );
}
