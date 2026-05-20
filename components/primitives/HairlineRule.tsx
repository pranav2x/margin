import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  inverted?: boolean;
  style?: ViewStyle;
  weight?: number;
}

export function HairlineRule({ inverted, style, weight }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          height: weight ?? StyleSheet.hairlineWidth,
          backgroundColor: inverted ? colors.shadow : colors.fog,
          width: '100%',
        },
        style,
      ]}
    />
  );
}
