import { ScrollView, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from '../primitives/Text';
import { space, SCREEN_PADDING, useTheme } from '../../theme';

interface Props {
  items: string[];
  active: string;
  onChange: (item: string) => void;
  inverted?: boolean;
}

/**
 * Horizontal scroll of text pills. Active = ink (or paper if inverted),
 * bold weight + a 2px ember underline. Inactive = ash, semibold, no underline.
 */
export function TabPill({ items, active, onChange, inverted }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        gap: space[5],
        alignItems: 'flex-end',
      }}
      style={{ flexGrow: 0 }}
    >
      {items.map((item) => {
        const isActive = item === active;
        return (
          <Pressable
            key={item}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(item);
            }}
            style={{ paddingTop: space[3], paddingBottom: space[2] }}
          >
            <Txt
              variant="bodyLg"
              weight={isActive ? 'bold' : 'semibold'}
              tone={isActive ? 'ink' : 'ash'}
              inverted={inverted}
            >
              {item}
            </Txt>
            <View
              style={{
                marginTop: space[1],
                height: 2,
                borderRadius: 1,
                backgroundColor: isActive ? colors.ember : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
