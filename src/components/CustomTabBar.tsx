import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export type TabConfig = {
  name: string; // must match the Tabs.Screen route name
  icon: (color: string) => React.ReactNode;
};

type Props = {
  state: any;
  navigation: any;
  tabs: TabConfig[];
};

// Astrobook ka shared bottom tab bar — animated purple dot indicator,
// light theme. (user) aur (astrologer) dono layouts isi component ko
// alag `tabs` config ke saath use karte hain — design ek jagah change
// hoga to dono jagah reflect hoga.
export function CustomTabBar({ state, navigation, tabs }: Props) {
  const tabWidth = SCREEN_WIDTH / tabs.length;
  const dotX = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(dotX, {
      toValue: state.index * tabWidth + tabWidth / 2 - 3,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.tabBar}>
      <Animated.View
        style={[styles.dot, { transform: [{ translateX: dotX }] }]}
      />

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs[index];
        const color = isFocused ? "#9d0399" : "#4A4468";

        return (
          <TouchableOpacity
            key={route.key}
            style={[styles.tabItem, { width: tabWidth }]}
            activeOpacity={1}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
          >
            {tab?.icon(color)}
          </TouchableOpacity>
        );
      })}
    </View>
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
