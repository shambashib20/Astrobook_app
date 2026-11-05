import ScreenHeader from "@/components/ScreenHeader";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrivacyActions } from "../hooks/usePrivacyActions";

export default function PrivacySecurityScreen() {
  const { busy, logoutAllDevices, deleteAccount } = usePrivacyActions();

  const confirmLogoutAll = () =>
    Alert.alert(
      "Logout of all devices?",
      "You will be logged out everywhere, including this phone. You will need to log in again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logoutAllDevices },
      ],
    );

  const confirmDelete = () =>
    Alert.alert(
      "Delete account?",
      "This cannot be undone. Your personal details, follows, and posts will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteAccount },
      ],
    );

  const disabled = busy !== null;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Privacy & Security"
        subtitle="Keep your account secure"
        fallbackHref="/(user)/(tabs)/profile"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={confirmLogoutAll}
          >
            <View style={styles.iconWrap}>
              {busy === "logoutAll" ? (
                <ActivityIndicator size="small" color="#9d0399" />
              ) : (
                <Feather name="log-out" size={18} color="#9d0399" />
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sign out of all devices</Text>
              <Text style={styles.rowSub}>
                Remove access from any other device you're logged in on
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#B8B0D0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => Linking.openSettings()}
          >
            <View style={styles.iconWrap}>
              <Feather name="settings" size={18} color="#9d0399" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App permissions</Text>
              <Text style={styles.rowSub}>Camera and microphone access</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#B8B0D0" />
          </TouchableOpacity>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.dangerText}>
            Your personal details, follows, and posts will be permanently
            removed. Booking and payment records are retained anonymously for
            accounting purposes. Complete or cancel any upcoming sessions first.
            For payment or payout questions, contact Help & Support before
            proceeding.
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, disabled && { opacity: 0.6 }]}
            activeOpacity={0.75}
            disabled={disabled}
            onPress={confirmDelete}
          >
            {busy === "delete" ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <View style={styles.deleteBtnInner}>
                <Feather name="trash-2" size={18} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F0FF" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F0FF" },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, color: "#1A1A2E", fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  dangerCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    gap: 10,
  },
  dangerTitle: { fontSize: 15, fontWeight: "800", color: "#B91C1C" },
  dangerText: { fontSize: 13, color: "#4A4468", lineHeight: 19 },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  deleteBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteBtnText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
});
