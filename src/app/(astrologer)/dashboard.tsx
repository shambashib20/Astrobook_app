import ScreenHeader from "@/components/ScreenHeader";
import { useMyAppointments } from "@/features/consultation/hooks/useAppointments";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

const CONTROLS = [
  {
    key: "sessions",
    icon: "📹",
    label: "Sessions",
    sub: "Bookings dekho, join karo",
    href: "/(user)/my-bookings",
    color: "#15803D",
  },
  {
    key: "services",
    icon: "🔮",
    label: "Services",
    sub: "Consultancy manage karo",
    href: "/(astrologer)/services",
    color: "#9d0399",
  },
  {
    key: "availability",
    icon: "📅",
    label: "Availability",
    sub: "Time slots set karo",
    href: "/(astrologer)/availability",
    color: "#0b1d5b",
  },
  {
    key: "posts",
    icon: "✍️",
    label: "Posts",
    sub: "Content share karo",
    href: "/(astrologer)/posts",
    color: "#4C1D95",
  },
] as const;

export default function AstrologerDashboard() {
  const router = useRouter();
  const {
    appointments,
    loading: apptsLoading,
    fetchAppointments,
  } = useMyAppointments();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const completedEarnings = appointments.completed.reduce(
    (sum, a) => sum + (a.service.price ? Number(a.service.price) : 0),
    0,
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <ScreenHeader
        title="🔮 Dashboard"
        subtitle="Welcome back!"
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appointments.upcoming.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {appointments.completed.length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#9d0399" }]}>
              ₹{completedEarnings}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        {/* ── Controls — quick nav hub ── */}
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.controlsGrid}>
          {CONTROLS.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={styles.controlCard}
              onPress={() => router.push(c.href as any)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.controlIconBox, { backgroundColor: c.color }]}
              >
                <Text style={styles.controlIcon}>{c.icon}</Text>
              </View>
              <Text style={styles.controlLabel}>{c.label}</Text>
              <Text style={styles.controlSub}>{c.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Upcoming Sessions (summary) ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
        </View>
        {apptsLoading ? (
          <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
        ) : appointments.upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming sessions</Text>
          </View>
        ) : (
          appointments.upcoming.slice(0, 5).map((appt) => {
            const { date, time } = formatDateTime(appt.scheduledAt);
            return (
              <View key={appt.id} style={styles.bookingCard}>
                <View style={styles.bookingStrip} />
                <View style={styles.bookingInner}>
                  <Text style={styles.bookingService}>
                    {appt.service.title}
                  </Text>
                  <View style={styles.bookingChips}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>📅 {date}</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>🕐 {time}</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        ⏱ {appt.durationMinutes} min
                      </Text>
                    </View>
                  </View>
                </View>
                {appt.service.price && (
                  <Text style={styles.bookingPrice}>₹{appt.service.price}</Text>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },

  header: {
    backgroundColor: "#0b1d5b",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  headerSubtitle: { fontSize: 13, color: "#C4CBEB", marginTop: 4 },

  content: { padding: 16, gap: 12 },

  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  statLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 8,
  },
  sectionHeaderRow: { marginTop: 8 },

  controlsGrid: { flexDirection: "row", gap: 12 },
  controlCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
    gap: 4,
  },
  controlIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  controlIcon: { fontSize: 18 },
  controlLabel: { fontSize: 13, fontWeight: "800", color: "#1A1A2E" },
  controlSub: { fontSize: 10, color: "#9CA3AF" },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  emptyText: { fontSize: 14, fontWeight: "700", color: "#374151" },

  bookingCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  bookingStrip: { width: 4, alignSelf: "stretch", backgroundColor: "#9d0399" },
  bookingInner: { flex: 1, padding: 14, gap: 8 },
  bookingService: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  bookingChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#F5F0FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: "#7C3AED", fontWeight: "600" },
  bookingPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9d0399",
    paddingRight: 14,
  },
});
