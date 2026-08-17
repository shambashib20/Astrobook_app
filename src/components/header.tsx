import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useUnreadCount } from "@/features/notifications/hooks/useNotifications";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header({ rightSlot }: { rightSlot?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { count: unreadCount, fetchCount } = useUnreadCount();

  // useEffect(() => {}, []) sirf PEHLI baar mount pe chalta — Header jin
  // screens (Feed, Profile) pe hai woh navigation stack mein back jaane pe
  // remount nahi hoti (React Navigation unhe memory mein rakhta hai), toh
  // notifications screen se "mark read" karke wapas aane pe badge purana hi
  // dikhta rehta tha. useFocusEffect har baar chalta hai jab yeh screen
  // wapas focus mein aati hai — isliye badge hamesha fresh rehta hai.
  useFocusEffect(
    useCallback(() => {
      fetchCount();
    }, []),
  );

  return (
    <View>
      <StatusBar style="dark" />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/astro-icon.png")}
            style={{ width: 160, height: 40 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.actionsRow}>
          {rightSlot}
          {/* Notifications */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(user)/notifications")}
          >
            <Feather name="bell" size={22} color="#9d0399" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Cart */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(user)/cart")}
          >
            <Feather name="shopping-cart" size={22} color="#9d0399" />
          </TouchableOpacity>
          
        </View>
      </View>
      <LinearGradient
        colors={["rgba(255,255,255,0.4)", "#00000050", "rgba(255,255,255,0.4)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 2, width: "100%" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#fff1ff",
    elevation: 2,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff1ff",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
});
