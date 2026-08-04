import Header from "@/components/header";
import UserAvatar from "@/components/UserAvatar";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/users/hooks/useProfile";
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

// Minimalistic — sirf profile-related info. Posts ab /(astrologer)/posts
// pe hai, dashboard ab /(astrologer)/dashboard pe — yahan duplicate nahi karna.
export function AstrologerProfileView() {
  const router = useRouter();
  // sessionUser sirf id/name jaisi lightweight cheezon ke liye — avatarUrl
  // jaisa fresh data (Edit Profile se turant sync) useMyProfile() se aata
  // hai, isi cache ko Edit Profile screen bhi use karti hai.
  const sessionUser = useUser();
  const { profile } = useMyProfile();
  const user = profile ?? sessionUser;
  const { handleLogout } = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutPress = async () => {
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
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <UserAvatar
              uri={user?.avatarUrl}
              name={user?.name}
              id={sessionUser?.id}
              size={78}
            />
          </View>
          <Text style={styles.name}>{user?.name ?? "Astrologer"}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ Astrologer</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/(user)/edit-profile" as any)}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard shortcut */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => router.push("/(astrologer)/dashboard" as any)}
        >
          <Text style={styles.dashboardBtnIcon}>📊</Text>
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogoutPress}
          disabled={loggingOut}
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
    elevation: 2,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2.5,
    borderColor: "#9d0399",
  },
  avatarEmoji: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", marginBottom: 4 },
  email: { fontSize: 13, color: "#999", marginBottom: 2 },
  phone: { fontSize: 13, color: "#999", marginBottom: 10 },
  badge: {
    backgroundColor: "#F3E8FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#9d0399",
    marginBottom: 12,
  },
  badgeText: { color: "#9d0399", fontWeight: "700", fontSize: 12 },
  editBtn: {
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  editBtnText: { color: "#9d0399", fontWeight: "700", fontSize: 14 },

  dashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0b1d5b",
    borderRadius: 14,
    paddingVertical: 14,
    elevation: 3,
    shadowColor: "#0b1d5b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  dashboardBtnIcon: { fontSize: 18 },
  dashboardBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

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
