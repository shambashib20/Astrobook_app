import { Feather } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TAB_COUNT = 5;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

const TABS = [
  {
    name: "feed",
    icon: (color: string) => <Feather name="home" size={22} color={color} />,
  },
  {
    name: "explore",
    icon: (color: string) => <Feather name="compass" size={22} color={color} />,
  },
  {
    name: "astroverse",
    icon: (color: string) => (
      <MaterialCommunityIcons name="star-four-points" size={22} color={color} />
    ),
  },

  {
    name: "astrologers",
    icon: (color: string) => <Feather name="user" size={22} color={color} />,
  },
  {
    name: "profile",
    icon: (color: string) => (
      <MaterialCommunityIcons name="zodiac-aries" size={22} color={color} />
    ),
  },
];

function CustomTabBar({ state, navigation }: any) {
  const dotX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;

  useEffect(() => {
    Animated.spring(dotX, {
      toValue: state.index * TAB_WIDTH + TAB_WIDTH / 2 - 3,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.tabBar}>
      {/* Animated dot */}
      <Animated.View
        style={[styles.dot, { transform: [{ translateX: dotX }] }]}
      />

      {/* Tab items */}
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = TABS[index];
        const color = isFocused ? "#9d0399" : "#4A4468";

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            activeOpacity={1}
            onPress={() => {
              // Same tab dubara press ho toh uska internal stack root pe pop
              // karo (standard tab-bar behavior) — warna sirf switch karo.
              if (!isFocused) {
                navigation.navigate(route.name);
              } else {
                navigation.emit({
                  type: "tabPress",
                  target: route.key,
                });
              }
            }}
          >
            {tab?.icon(color)}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="astroverse" />
      <Tabs.Screen name="astrologers" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff1ff",
    height: 64,
    paddingBottom: 8,
    paddingTop: 10,
    elevation: 12,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: "relative",
  },
  tabItem: {
    width: TAB_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9d0399",
    left: 0,
  },
});