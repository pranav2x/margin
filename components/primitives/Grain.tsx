import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme';

interface Props {
  // Overall strength of the grain. Newsprint wants this faint — the spec calls
  // for ~3–6%; per-speck variance lands the effective value inside that band.
  opacity?: number;
  // Grain is always monochrome: ink specks on light/surface, shadow over ink.
  tone?: 'ink' | 'shadow';
  // How many specks to scatter across the box.
  count?: number;
  style?: ViewStyle;
}

// Deterministic PRNG so the texture is identical on every render (no flicker,
// and capture targets stay stable between on-screen and exported frames).
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEWBOX = 100;

// A token-driven film-grain overlay: one SVG full of tiny monochrome specks,
// stretched to fill its parent, so profile + share surfaces read like newsprint.
// No color literals — the fill comes from the theme and the strength from
// `opacity`; it never introduces a second accent.
export function Grain({ opacity = 0.05, tone = 'ink', count = 140, style }: Props) {
  const { colors } = useTheme();
  const fill = tone === 'shadow' ? colors.shadow : colors.ink;

  const specks = useMemo(() => {
    const rand = mulberry32(0x9e3779b9 ^ count);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: rand() * VIEWBOX,
      y: rand() * VIEWBOX,
      size: 0.4 + rand() * 0.6,
      o: 0.45 + rand() * 0.55,
    }));
  }, [count]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="none">
        {specks.map((p) => (
          <Rect key={p.key} x={p.x} y={p.y} width={p.size} height={p.size} fill={fill} opacity={p.o} />
        ))}
      </Svg>
    </View>
  );
}
