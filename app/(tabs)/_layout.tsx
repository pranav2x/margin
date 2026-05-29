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
      <Tabs.Screen name="index" options={{ title: 'boards' }} />
      <Tabs.Screen name="battles" options={{ title: 'battles' }} />
      <Tabs.Screen name="you" options={{ title: 'you' }} />
    </Tabs>
  );
}
