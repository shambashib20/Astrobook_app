import Header from "@/components/header";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { AstrologerProfileView } from "@/features/astrologer/components/AstrologerProfileView";
import { useAuthStore, useUser } from "@/features/auth/store/auth.store";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MENU_ITEMS = [
  { icon: "📅", label: "My Bookings", route: "/(user)/my-bookings" },
  { icon: "🔔", label: "Notifications", route: null },
  { icon: "🔒", label: "Privacy & Security", route: null },
  { icon: "💬", label: "Help & Support", route: null },
  { icon: "⭐", label: "Rate the App", route: null },
  { icon: "📋", label: "Terms & Privacy Policy", route: null },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useUser();
  const { handleLogout } = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);
  const { isLoading } = useAuthStore();

  // Loading ho raha hai — kuch mat dikhao, flicker avoid karo
  if (isLoading) {
    return null;
  }

  // Astrologer hai — same route, alag view (koi redirect nahi)
  if (user?.isAstrologer) {
    return <AstrologerProfileView />;
  }

  const onLogout = async () => {
    setLoggingOut(true);
    await handleLogout();
    setLoggingOut(false);
  };

  return (
    <View style={styles.root}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? "User"}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/(user)/edit-profile" as any)}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index < MENU_ITEMS.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
          onPress={onLogout}
          disabled={loggingOut}
          activeOpacity={0.75}
        >
          {loggingOut ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={styles.logoutText}>Logging out...</Text>
            </View>
          ) : (
            <Text style={styles.logoutText}>🚪 Logout</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F0FF" },
  content: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 1,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#9d0399",
  },
  avatarEmoji: { fontSize: 36 },
  name: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", marginBottom: 4 },
  phone: { fontSize: 14, color: "#666", marginBottom: 2 },
  email: { fontSize: 13, color: "#999", marginBottom: 16 },
  editBtn: {
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 8,
  },
  editBtnText: { color: "#9d0399", fontWeight: "700", fontSize: 14 },
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F0FF" },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: 14, color: "#1A1A2E", fontWeight: "500" },
  menuArrow: { fontSize: 20, color: "#CCC" },
  logoutBtn: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
});
