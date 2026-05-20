import { ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from '../primitives/Text';
import { space, SCREEN_PADDING } from '../../theme';

interface Props {
  items: string[];
  active: string;
  onChange: (item: string) => void;
  inverted?: boolean;
}

export function TabPill({ items, active, onChange, inverted }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        gap: space[5],
        alignItems: 'center',
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
            style={{ paddingVertical: space[3] }}
          >
            <Txt
              variant="bodyLg"
              italic={isActive}
              tone={isActive ? 'ink' : 'ash'}
              inverted={inverted}
              style={{
                fontSize: 17,
                fontFamily: isActive ? 'InstrumentSerifItalic' : 'Geist',
              }}
            >
              {item}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
