import { Easing } from 'react-native-reanimated';

export const motion = {
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  spring: { damping: 22, stiffness: 180, mass: 0.6 },
  fast: 180,
  base: 280,
  slow: 480,
  glacial: 800,
} as const;
