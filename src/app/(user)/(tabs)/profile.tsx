import Header from "@/components/header";
import { useAstrologerApplicationStatus } from "@/features/astrologer-application/hooks/useAstrologerApplication";
import { AstrologerProfileView } from "@/features/astrologer/components/AstrologerProfileView";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore, useUser } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  // isAstrologer ka gate abhi bhi Zustand se — yeh session-level fact hai,
  // login ke time hi pata chal jaata hai, isliye query load hone ka wait
  // nahi karna padta (flicker-free branch decision).
  const sessionUser = useUser();
  // Baaki sab display data (name/avatar/bio/phone) ab useMyProfile() se —
  // yehi cache Edit Profile screen bhi use karti hai, isliye dono hamesha
  // sync rehte hain, koi manual wiring nahi chahiye.
  const { profile, loading: profileLoading } = useMyProfile();
  const { handleLogout } = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);
  const { isLoading } = useAuthStore();
  // Astrologer application ka current status — button/state isi se decide
  // hota hai. sessionUser.isAstrologer=false hone ke baad hi yeh relevant
  // hai (astrologer already ban chuke user ke liye upar hi return ho jaata
  // hai, isliye query yahan safe hai — enabled check apne aap ho jaata hai
  // kyunki hook sirf render hone par hi query fire karta hai).
  const { status: applicationStatus, loading: applicationLoading } =
    useAstrologerApplicationStatus(!sessionUser?.isAstrologer);

  // Loading ho raha hai — kuch mat dikhao, flicker avoid karo
  if (isLoading) {
    return null;
  }

  // Astrologer hai — same route, alag view (koi redirect nahi)
  if (sessionUser?.isAstrologer) {
    return <AstrologerProfileView />;
  }

  const user = profile ?? sessionUser;

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
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImg}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name ?? "User"}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/(user)/edit-profile" as any)}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {!applicationLoading && applicationStatus && (
          <>
            {!applicationStatus.hasApplied && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => router.push("/(user)/become-astrologer" as any)}
              >
                <Text style={styles.upgradeBtnText}>✨ Upgrade to Astrologer</Text>
              </TouchableOpacity>
            )}

            {applicationStatus.verificationStatus === "pending" && (
              <View style={styles.statusCardPending}>
                <Text style={styles.statusCardTitle}>⏳ Application Under Review</Text>
                <Text style={styles.statusCardText}>
                  Humari team tumhari application review kar rahi hai. Approve hote hi
                  notify kar denge.
                </Text>
              </View>
            )}

            {applicationStatus.verificationStatus === "rejected" && (
              <View style={styles.statusCardRejected}>
                <Text style={styles.statusCardTitleRejected}>Application Rejected</Text>
                {applicationStatus.rejectionReason && (
                  <Text style={styles.statusCardText}>
                    Reason: {applicationStatus.rejectionReason}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.reapplyBtn}
                  onPress={() => router.push("/(user)/become-astrologer" as any)}
                >
                  <Text style={styles.reapplyBtnText}>Reapply</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

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
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#9d0399",
    backgroundColor: "#F3E8FF",
  },
  bio: {
    fontSize: 13,
    color: "#4A4468",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
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
  upgradeBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#9d0399",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  upgradeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  statusCardPending: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 16,
  },
  statusCardRejected: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C2410C",
    marginBottom: 4,
  },
  statusCardTitleRejected: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 4,
  },
  statusCardText: { fontSize: 13, color: "#4A4468", lineHeight: 18 },
  reapplyBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: "#B91C1C",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  reapplyBtnText: { color: "#B91C1C", fontWeight: "700", fontSize: 13 },
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