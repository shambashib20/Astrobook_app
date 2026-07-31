import AstroLogo from "@/assets/images/astro-icon.svg";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header({ rightSlot }: { rightSlot?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <StatusBar style="dark" />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoRow}>
          <AstroLogo width={160} height={40} />
        </View>
        <View style={styles.actionsRow}>
          {rightSlot}
          {/* Bookmarks — saved/favourites */}
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="bookmark" size={22} color="#9d0399" />
          </TouchableOpacity>
          {/* Cart */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(user)/cart")}
          >
            <Feather name="shopping-cart" size={22} color="#9d0399" />
          </TouchableOpacity>
          {/* Search */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(user)/checkout")}
          >
            <Feather name="search" size={22} color="#9d0399" />
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
});
