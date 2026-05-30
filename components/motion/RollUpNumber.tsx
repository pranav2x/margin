import { memo, useEffect, useState } from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { type as typeTokens, useTheme, fonts } from '../../theme';

type SizeKey = 'xl' | 'lg' | 'md' | 'sm';

interface Props {
  value: number;
  size?: SizeKey;
  inverted?: boolean;
  minDigits?: number;
  style?: ViewStyle;
}

const sizeMap: Record<SizeKey, keyof typeof typeTokens> = {
  xl: 'scoreXl',
  lg: 'scoreLg',
  md: 'scoreMd',
  sm: 'scoreSm',
};

interface DigitProps {
  current: string;
  next: string;
  index: number;
  size: SizeKey;
  color: string;
  trigger: number;
  onSettled: () => void;
}

const Digit = memo(({ current, next, index, size, color, trigger, onSettled }: DigitProps) => {
  const v = typeTokens[sizeMap[size]];
  const charHeight = v.lineHeight ?? v.fontSize ?? 16;
  const charWidth = (v.fontSize ?? 16) * 0.62;
  const t = useSharedValue(0);

  useEffect(() => {
    if (current === next) return;
    t.value = 0;
    t.value = withDelay(
      index * 40,
      withTiming(1, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }, () => {
        runOnJS(onSettled)();
      }),
    );
  }, [trigger, current, next, index, t, onSettled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * charHeight }],
  }));

  const isDigit = current >= '0' && current <= '9';

  const numericFamily = v.fontFamily ?? fonts.extrabold;

  if (!isDigit || current === next) {
    return (
      <Animated.Text
        allowFontScaling={false}
        style={[
          v as TextStyle,
          {
            color,
            fontFamily: numericFamily,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          },
        ]}
      >
        {current}
      </Animated.Text>
    );
  }

  return (
    <View style={{ height: charHeight, width: charWidth, overflow: 'hidden' }}>
      <Animated.View style={animatedStyle}>
        <Animated.Text
          allowFontScaling={false}
          style={[
            v as TextStyle,
            {
              color,
              fontFamily: numericFamily,
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
              width: charWidth,
              height: charHeight,
            },
          ]}
        >
          {current}
        </Animated.Text>
        <Animated.Text
          allowFontScaling={false}
          style={[
            v as TextStyle,
            {
              color,
              fontFamily: numericFamily,
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
              width: charWidth,
              height: charHeight,
            },
          ]}
        >
          {next}
        </Animated.Text>
      </Animated.View>
    </View>
  );
});
Digit.displayName = 'Digit';

export function RollUpNumber({ value, size = 'md', inverted, style }: Props) {
  const { colors } = useTheme();
  const color = inverted ? colors.paper : colors.ink;

  const [displayed, setDisplayed] = useState(value);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (value !== displayed) {
      setTrigger((n) => n + 1);
    }
  }, [value, displayed]);

  const onSettled = () => {
    setDisplayed(value);
  };

  const current = String(displayed).split('');
  const next = String(value).split('');
  const len = Math.max(current.length, next.length);
  const c = current.length < len ? Array(len - current.length).fill(' ').concat(current) : current;
  const n = next.length < len ? Array(len - next.length).fill(' ').concat(next) : next;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end' }, style]}>
      {c.map((d, i) => (
        <Digit
          key={`${i}-${trigger}`}
          current={d}
          next={n[i]}
          index={i}
          size={size}
          color={color}
          trigger={trigger}
          onSettled={onSettled}
        />
      ))}
    </View>
  );
}
