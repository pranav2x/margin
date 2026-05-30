import { Stack } from 'expo-router';
import { useTheme } from '../../theme';

/**
 * Golden — Phase 0 reference screens. These are the hand-built templates
 * Phase 1 subagents imitate when restyling the production (tabs)/* screens.
 * Routes: /golden, /golden/boards, /golden/you.
 */
export default function GoldenLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: 'slide_from_right',
      }}
    />
  );
}
