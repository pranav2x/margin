import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/composite/BottomTabBar';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  // Order matches BottomTabBar's icon/label maps. The [+] center create button
  // is rendered BY the tab bar between battles and clips — it is not a tab
  // screen (no real route).
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'boards' }} />
      <Tabs.Screen name="battles" options={{ title: 'battles' }} />
      <Tabs.Screen name="clips" options={{ title: 'clips' }} />
      <Tabs.Screen name="you" options={{ title: 'you' }} />
    </Tabs>
  );
}
