import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/composite/BottomTabBar';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'today' }} />
      <Tabs.Screen name="watch" options={{ title: 'watch' }} />
      <Tabs.Screen name="takes" options={{ title: 'takes' }} />
      <Tabs.Screen name="call" options={{ title: 'the call' }} />
      <Tabs.Screen name="you" options={{ title: 'you' }} />
    </Tabs>
  );
}
