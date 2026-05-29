import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

export default function BoardsScreen() {
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
      <MicroLabel>LEADERBOARDS</MicroLabel>
      <Txt variant="display2" style={{ marginTop: space[3] }}>
        Boards
      </Txt>
      <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4] }}>
        Per-sport leaderboards land here.
      </Txt>
    </View>
  );
}
