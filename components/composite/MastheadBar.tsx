import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PressableScale } from '../primitives/PressableScale';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { eyebrowDate } from '../../lib/utils/format';

interface Props {
  title?: string;
  showSearch?: boolean;
  showDate?: boolean;
  onSearchPress?: () => void;
  inverted?: boolean;
}

export function MastheadBar({
  title = 'MARGIN',
  showSearch = true,
  showDate = true,
  onSearchPress,
  inverted,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: inverted ? colors.ink : colors.paper }}>
      <View
        style={{
          height: 64,
          paddingHorizontal: SCREEN_PADDING,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Txt variant="display4" inverted={inverted} style={{ letterSpacing: 0.5 }}>
            {title}
          </Txt>
          {showDate && (
            <MicroLabel inverted={inverted} style={{ marginTop: 2 }}>
              {eyebrowDate(new Date('2026-05-18'))}
            </MicroLabel>
          )}
        </View>
        {showSearch && (
          <PressableScale onPress={onSearchPress} style={{ padding: space[2] }}>
            <Search
              size={22}
              color={inverted ? colors.paper : colors.ink}
              strokeWidth={1.25}
            />
          </PressableScale>
        )}
      </View>
      <HairlineRule inverted={inverted} />
    </View>
  );
}
