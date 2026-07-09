import { CustomTabBar, type TabConfig } from "@/components/CustomTabBar";
import { Feather } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";

// Same shared tab bar jo (user) layout use karta hai — sirf items alag.
const TABS: TabConfig[] = [
  {
    name: "dashboard",
    icon: (color) => <Feather name="home" size={22} color={color} />,
  },
  {
    name: "services",
    icon: (color) => (
      <MaterialCommunityIcons
        name="briefcase-outline"
        size={22}
        color={color}
      />
    ),
  },
  {
    name: "availability",
    icon: (color) => <Feather name="calendar" size={22} color={color} />,
  },
  {
    name: "posts",
    icon: (color) => <Feather name="edit-3" size={22} color={color} />,
  },
  {
    name: "profile",
    icon: (color) => (
      <MaterialCommunityIcons name="zodiac-aries" size={22} color={color} />
    ),
  },
];

export default function AstrologerLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} tabs={TABS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="availability" />
      <Tabs.Screen name="posts" />
      {/* profile tab (user)/profile pe redirect karta hai — shared profile page */}
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
