import { Children, Fragment, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Score } from '../motion/Score';
import { MicroLabel } from './MicroLabel';
import { HairlineRule } from './HairlineRule';
import { space, useTheme } from '../../theme';

type Size = 'xl' | 'lg' | 'md' | 'sm';
type Align = 'left' | 'center' | 'right';
type Tone = 'default' | 'accent';

interface Props {
  value: string | number;
  label: string;
  size?: Size;
  align?: Align;
  tone?: Tone;
  style?: ViewStyle;
}

const ALIGN_TO_FLEX: Record<Align, ViewStyle['alignItems']> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const ALIGN_TO_TEXT: Record<Align, 'left' | 'center' | 'right'> = {
  left: 'left',
  center: 'center',
  right: 'right',
};

/**
 * The signature primitive. Big Inter number above a tracked UPPERCASE label.
 *   <StatBlock value="67%" label="WIN RATE" />
 *   <StatBlock value={12} label="CALLS" size="lg" tone="accent" />
 *
 * Every "67%", "12 calls", "8 day streak" surface uses this — never inline a
 * Score + MicroLabel pair in a screen.
 */
export function StatBlock({
  value,
  label,
  size = 'lg',
  align = 'left',
  tone = 'default',
  style,
}: Props) {
  return (
    <View style={[{ alignItems: ALIGN_TO_FLEX[align] }, style]}>
      <Score
        value={value}
        size={size}
        tone={tone === 'accent' ? 'ember' : 'ink'}
        style={{ textAlign: ALIGN_TO_TEXT[align] }}
      />
      <MicroLabel style={{ marginTop: space[2], textAlign: ALIGN_TO_TEXT[align] }}>
        {label}
      </MicroLabel>
    </View>
  );
}

interface RowProps {
  children: ReactNode;
  /** Show hairline dividers between blocks. Default true. */
  dividers?: boolean;
  style?: ViewStyle;
}

/**
 * Lays 2–3 StatBlocks horizontally with vertical HairlineRule dividers between.
 * The light Strava stat row.
 *
 *   <StatBlockRow>
 *     <StatBlock value="67%" label="WIN RATE" align="center" />
 *     <StatBlock value={12}  label="CALLS"    align="center" />
 *     <StatBlock value={8}   label="STREAK"   align="center" />
 *   </StatBlockRow>
 */
export function StatBlockRow({ children, dividers = true, style }: RowProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      {items.map((child, i) => (
        <Fragment key={i}>
          <View style={{ flex: 1 }}>{child}</View>
          {dividers && i < items.length - 1 ? (
            <View
              style={{
                width: 1,
                backgroundColor: colors.fog,
                marginHorizontal: space[3],
              }}
            />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

// Convenience re-export for screens that lay rows above a horizontal hairline.
export { HairlineRule };
