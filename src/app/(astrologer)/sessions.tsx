import ScreenHeader from "@/components/ScreenHeader";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyAppointments } from "@/features/consultation/hooks/useAppointments";
import type { AppointmentDetailed } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFFBEB", text: "#B45309" },
  confirmed: { bg: "#F0FDF4", text: "#15803D" },
  ongoing: { bg: "#EFF6FF", text: "#1D4ED8" },
  completed: { bg: "#F3F4F6", text: "#4B5563" },
  cancelled: { bg: "#FEF2F2", text: "#DC2626" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function SessionCard({ item }: { item: AppointmentDetailed }) {
  const router = useRouter();
  const { date, time } = formatDateTime(item.scheduledAt);
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending!;
  const canJoin = item.status === "confirmed" || item.status === "ongoing";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        canJoin &&
        router.push({
          pathname: "/(user)/session/[appointmentId]" as any,
          params: { appointmentId: item.id },
        })
      }
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Feather name="user" size={18} color="#9d0399" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.userName ?? "Client"}
          </Text>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.service.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardMetaRow}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color="#6B21A8" />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={12} color="#6B21A8" />
          <Text style={styles.metaText}>{time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="hash" size={12} color="#6B21A8" />
          <Text style={styles.metaText}>{item.durationMinutes} min</Text>
        </View>
      </View>

      {canJoin && (
        <View style={styles.joinRow}>
          <Feather name="video" size={13} color="#FFF" />
          <Text style={styles.joinText}>Join Session</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AstrologerSessionsScreen() {
  const user = useUser();
  const { appointments, loading, refreshing, fetchAppointments } = useMyAppointments();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const currentList = appointments[activeTab] ?? [];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Sessions" subtitle="Apni bookings yahan manage karo" />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({appointments[tab.key]?.length ?? 0})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAppointments(true)}
              tintColor="#9d0399"
            />
          }
        >
          {currentList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={28} color="#D1D5DB" />
              <Text style={styles.emptyText}>Is category mein koi booking nahi hai</Text>
            </View>
          ) : (
            currentList.map((item) => <SessionCard key={item.id} item={item} />)
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 12 },

  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FF",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F5F0FF",
  },
  tabActive: { backgroundColor: "#9d0399" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#6B21A8" },
  tabTextActive: { color: "#FFF" },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    gap: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  serviceTitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },

  cardMetaRow: { flexDirection: "row", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11.5, color: "#4B5563", fontWeight: "500" },

  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#9d0399",
    borderRadius: 8,
    paddingVertical: 8,
  },
  joinText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
});
