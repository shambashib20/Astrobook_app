import Header from "@/components/header";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentFailedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appointmentId, reason, astroId, serviceId, scheduledAt } =
    useLocalSearchParams<{
      appointmentId?: string;
      reason?: string;
      astroId?: string;
      serviceId?: string;
      scheduledAt?: string;
    }>();

  const handleRetry = () => {
    // Checkout screen pe wapas — pendingAppointmentId wahan state mein nahi
    // rahega (naya screen instance hai), isliye appointmentId query param se
    // pass kar rahe hain taaki checkout dobara naya booking na banaye
    router.replace({
      pathname: "/(user)/checkout" as any,
      params: {
        astroId,
        serviceId,
        scheduledAt,
        retryAppointmentId: appointmentId,
      },
    });
  };

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.iconCircle}>
          <Feather name="x" size={40} color="#DC2626" />
        </View>

        <Text style={styles.title}>Payment Nahi Ho Paya</Text>
        <Text style={styles.subtitle}>
          {reason || "Payment complete nahi ho saka."}
        </Text>

        {appointmentId && (
          <View style={styles.infoBox}>
            <Feather name="info" size={14} color="#B45309" />
            <Text style={styles.infoText}>
              Tumhari booking "pending" status mein safe hai — payment ke bina
              astrologer confirm nahi karega. Chahe toh My Bookings se baad mein
              bhi payment complete kar sakte ho.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View
        style={[styles.stickyBottom, { paddingBottom: 24 + insets.bottom }]}
      >
        {astroId && serviceId && scheduledAt && (
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>Dobara Try Karo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.secondaryBtnText}>My Bookings pe jao</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    paddingBottom: 140,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
    gap: 10,
    elevation: 10,
  },
  retryBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  retryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    width: "100%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#9d0399",
  },
  secondaryBtnText: { color: "#9d0399", fontSize: 14, fontWeight: "700" },
});
