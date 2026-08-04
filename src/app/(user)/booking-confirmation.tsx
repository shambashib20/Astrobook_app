import Header from "@/components/header";
import { consultationService } from "@/features/consultation/service";
import type { AppointmentWithChildren } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_META: Record<
  string,
  {
    icon: keyof typeof Feather.glyphMap;
    bg: string;
    border: string;
    color: string;
    title: string;
    subtitle: string;
  }
> = {
  pending: {
    icon: "clock",
    bg: "#FFFBEB",
    border: "#FDE68A",
    color: "#B45309",
    title: "Booking Pending",
    subtitle: "Astrologer confirm karega, tab tak yeh 'pending' rahegi.",
  },
  confirmed: {
    icon: "check-circle",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    color: "#15803D",
    title: "Booking Confirmed!",
    subtitle: "Payment successful — tumhari booking confirm ho chuki hai.",
  },
  ongoing: {
    icon: "video",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    color: "#1D4ED8",
    title: "Session Ongoing",
    subtitle: "Tumhara session abhi chal raha hai.",
  },
  completed: {
    icon: "check",
    bg: "#F3F4F6",
    border: "#E5E7EB",
    color: "#4B5563",
    title: "Session Completed",
    subtitle: "Yeh consultation complete ho chuki hai.",
  },
  cancelled: {
    icon: "x-circle",
    bg: "#FEF2F2",
    border: "#FECACA",
    color: "#DC2626",
    title: "Booking Cancelled",
    subtitle: "Yeh booking cancel kar di gayi thi.",
  },
};

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [appointment, setAppointment] = useState<AppointmentWithChildren | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    consultationService
      .getAppointmentById(appointmentId)
      .then(setAppointment)
      .catch((err: any) =>
        setError(
          err?.response?.data?.message || "Booking details load nahi hui",
        ),
      )
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centerFill]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={[styles.root, styles.centerFill, { padding: 24 }]}>
        <Feather name="alert-circle" size={32} color="#DC2626" />
        <Text style={styles.errorText}>{error ?? "Booking nahi mili"}</Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.errorBtnText}>My Bookings pe jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scheduledDate = new Date(appointment.scheduledAt);
  const meta = STATUS_META[appointment.status] ?? STATUS_META.pending!;
  const dateStr = scheduledDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = scheduledDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {/* --- BIG STATUS ICON --- */}
        <View style={styles.statusIconWrap}>
          <View
            style={[
              styles.statusIconCircle,
              { backgroundColor: meta.bg, borderColor: meta.border },
            ]}
          >
            <Feather name={meta.icon} size={44} color={meta.color} />
          </View>
          <Text style={[styles.statusTitle, { color: meta.color }]}>
            {meta.title}
          </Text>
          <Text style={styles.statusSubtitle}>{meta.subtitle}</Text>
        </View>

        {/* --- SERVICE CARD --- */}
        <View style={styles.card}>
          <View style={styles.serviceRow}>
            {appointment.service.coverImage ? (
              <Image
                source={{ uri: appointment.service.coverImage }}
                style={styles.serviceImage}
              />
            ) : (
              <View style={styles.serviceEmojiBox}>
                <Text style={{ fontSize: 30 }}>
                  {appointment.service.isBasic ? "🔮" : "✨"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.orderServiceName} numberOfLines={2}>
                {appointment.service.title}
              </Text>
              {appointment.astrologerName && (
                <Text style={styles.orderAstroName}>
                  with {appointment.astrologerName}
                </Text>
              )}
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  ⏱ {appointment.durationMinutes} min
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailLine}>
            <Feather name="calendar" size={13} color="#9d0399" />
            <Text style={styles.detailLineText}>
              {dateStr} • {timeStr}
            </Text>
          </View>

          <View style={styles.detailLine}>
            <Feather name="hash" size={13} color="#9d0399" />
            <Text style={styles.detailLineText}>
              Booking ID: {appointment.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* --- PRICE DETAILS CARD --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹ {appointment.price ?? appointment.service.price ?? "—"}
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        {(appointment.status === "confirmed" || appointment.status === "ongoing") && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() =>
              router.push({
                pathname: "/(user)/session/[appointmentId]" as any,
                params: { appointmentId: appointment.id },
              })
            }
          >
            <Feather name="video" size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>Join Session</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/(user)/feed" as any)}
        >
          <Text style={styles.secondaryBtnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { alignItems: "center", justifyContent: "center", gap: 12 },
  listContent: { padding: 16, gap: 14, paddingBottom: 40 },

  errorText: { fontSize: 14, color: "#374151", textAlign: "center" },
  errorBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  errorBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },

  statusIconWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  statusIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 6,
  },
  statusTitle: { fontSize: 20, fontWeight: "800" },
  statusSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 19,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },

  serviceRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
  },
  serviceEmojiBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  orderServiceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  orderAstroName: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  chip: {
    backgroundColor: "#F5F0FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 11, color: "#6B21A8", fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#F3F4F6" },

  detailLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailLineText: { fontSize: 12.5, color: "#374151", fontWeight: "500" },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  totalValue: { fontSize: 17, fontWeight: "800", color: "#9d0399" },

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
  primaryBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    elevation: 3,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    elevation: 3,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
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
