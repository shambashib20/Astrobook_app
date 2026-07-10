import Header from "@/components/header";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyAppointments } from "@/features/consultation/hooks/useAppointments";
import { consultationService } from "@/features/consultation/service";
import type { AppointmentDetailed } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
}

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  pending: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#B45309",
    label: "Pending",
  },
  confirmed: {
    bg: "#F0FDF4",
    border: "#BBF7D0",
    text: "#15803D",
    label: "Confirmed",
  },
  ongoing: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1D4ED8",
    label: "Ongoing",
  },
  completed: {
    bg: "#F3F4F6",
    border: "#E5E7EB",
    text: "#4B5563",
    label: "Completed",
  },
  cancelled: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#DC2626",
    label: "Cancelled",
  },
};

function BookingCard({
  item,
  onCancel,
  cancelling,
}: {
  item: AppointmentDetailed;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const router = useRouter();
  const user = useUser();
  const { date, time } = formatDateTime(item.scheduledAt);
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending!;
  const canCancel = item.status === "pending" || item.status === "confirmed";
  const canJoin = item.status === "confirmed" || item.status === "ongoing";
  // Astrologer isi shared screen se apni sessions bhi dekhta hai — usse
  // apna khud ka naam nahi, CLIENT ka naam dikhna chahiye
  const isViewerAstrologer = user?.id === item.astrologerId;
  const otherPartyName = isViewerAstrologer ? item.userName : item.astrologerName;

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/(user)/booking-confirmation" as any,
          params: { appointmentId: item.id },
        })
      }
    >
      <View style={styles.cardInner}>
        <View style={styles.thumbnail}>
          <Text style={{ fontSize: 28 }}>
            {item.service.isBasic ? "🔮" : "✨"}
          </Text>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.service.title}
            </Text>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </View>

          {otherPartyName && (
            <Text style={styles.cardAstro}>
              {isViewerAstrologer ? "Client: " : "with "}
              {otherPartyName}
            </Text>
          )}

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>

          <View style={styles.cardMeta}>
            <Feather name="clock" size={11} color="#9d0399" />
            <Text style={styles.cardMetaText}>{time}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Feather name="calendar" size={11} color="#9d0399" />
            <Text style={styles.cardMetaText}>{date}</Text>
          </View>
        </View>
      </View>

      {(canJoin || canCancel) && (
        <View style={styles.actionsRow}>
          {canJoin && (
            <TouchableOpacity
              style={styles.joinSessionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push({
                  pathname: "/(user)/session/[appointmentId]" as any,
                  params: { appointmentId: item.id },
                });
              }}
            >
              <Feather name="video" size={13} color="#FFF" />
              <Text style={styles.joinSessionBtnText}>Join Session</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              disabled={cancelling}
              onPress={(e) => {
                e.stopPropagation?.();
                onCancel(item.id);
              }}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionBlock({
  title,
  items,
  onCancel,
  cancellingId,
}: {
  title: string;
  items: AppointmentDetailed[];
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} <Text style={styles.sectionCount}>({items.length})</Text>
      </Text>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No {title.toLowerCase()} bookings
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <BookingCard
            key={item.id}
            item={item}
            onCancel={onCancel}
            cancelling={cancellingId === item.id}
          />
        ))
      )}
    </View>
  );
}

const TABS = [
  { key: "consultations", label: "Consultations", enabled: true },
  { key: "courses", label: "Courses", enabled: false },
  { key: "products", label: "Products", enabled: false },
];

export default function MyBookingsScreen() {
  const [activeTab, setActiveTab] = useState("consultations");
  const { appointments, loading, refreshing, fetchAppointments } =
    useMyAppointments();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = (id: string) => {
    Alert.alert(
      "Booking Cancel Karein?",
      "Kya tum sach mein yeh booking cancel karna chahte ho?",
      [
        { text: "Nahi", style: "cancel" },
        {
          text: "Haan, Cancel Karo",
          style: "destructive",
          onPress: async () => {
            setCancellingId(id);
            try {
              await consultationService.cancelAppointment(id);
              await fetchAppointments();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.response?.data?.message ||
                  "Booking cancel nahi ho payi",
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  // "ongoing" ko "Upcoming" section ke saath hi dikha rahe hain (upar) —
  // is UI mein alag se "Ongoing" tab/section nahi tha, aur ongoing bhi
  // effectively ek "abhi hone wali / ho rahi" booking hi hai
  const upcomingCombined = [...appointments.ongoing, ...appointments.upcoming];

  return (
    <View style={styles.root}>
      <Header />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAppointments(true)}
              tintColor="#9d0399"
            />
          }
        >
          {/* Page Title */}
          <View style={styles.pageTitleRow}>
            <View style={styles.pageTitleBadge}>
              <Text style={styles.pageTitleText}>My bookings</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                  !tab.enabled && styles.tabDisabled,
                ]}
                onPress={() => tab.enabled && setActiveTab(tab.key)}
                disabled={!tab.enabled}
                activeOpacity={tab.enabled ? 0.8 : 1}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                    !tab.enabled && styles.tabTextDisabled,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {activeTab === "consultations" && (
            <View>
              <SectionBlock
                title="Upcoming"
                items={upcomingCombined}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
              <SectionBlock
                title="Completed"
                items={appointments.completed}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
              <SectionBlock
                title="Cancelled"
                items={appointments.cancelled}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 32 },

  pageTitleRow: { paddingHorizontal: 16, paddingTop: 20, marginBottom: 16 },
  pageTitleBadge: {
    borderRadius: 8,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  pageTitleText: {
    color: "#1A1A2E",
    fontSize: 28,
    fontWeight: "900",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#9d0399" },
  tabDisabled: { opacity: 0.4 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#9d0399" },
  tabTextDisabled: { color: "#9CA3AF" },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9d0399",
    marginBottom: 12,
  },
  sectionCount: { color: "#9d0399", fontWeight: "700" },

  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  // Booking Card
  bookingCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#F3E8FF",
  },
  cardInfo: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
    flex: 1,
  },
  cardAstro: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  cardMetaText: { fontSize: 11, color: "#6B7280" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FAFAFA",
  },
  joinSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#9d0399",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinSessionBtnText: { fontSize: 12, color: "#FFF", fontWeight: "700" },
  cancelBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  cancelBtnText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
  },
});
