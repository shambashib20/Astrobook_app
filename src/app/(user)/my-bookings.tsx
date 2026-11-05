import Header from "@/components/header";
import { toast } from "@/components/toast";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyAppointments } from "@/features/consultation/hooks/useAppointments";
import { consultationService } from "@/features/consultation/service";
import type { AppointmentDetailed } from "@/features/consultation/types";
import ReviewModal, { type ReviewTarget } from "@/features/reviews/components/ReviewModal";
import { StarsRow } from "@/features/reviews/components/Stars";
import { useMyReviews } from "@/features/reviews/hooks/useReviews";
import type { MyReview } from "@/features/reviews/types";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeFilter = "today" | "month" | "year" | "all";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function matchesTimeFilter(iso: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (filter === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (filter === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (filter === "year") {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

// ─── Status badge config ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  pending: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", label: "Pending" },
  confirmed: { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", label: "Confirmed" },
  ongoing: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", label: "Ongoing" },
  completed: { bg: "#F3F4F6", border: "#E5E7EB", text: "#4B5563", label: "Completed" },
  cancelled: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", label: "Cancelled" },
  missed: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", label: "Missed — Refunded" },
};

// ─── BookingCard ─────────────────────────────────────────────────────────────

function BookingCard({
  item,
  onCancel,
  cancelling,
  myReview,
  onRate,
}: {
  item: AppointmentDetailed;
  onCancel: (id: string) => void;
  cancelling: boolean;
  myReview?: MyReview;
  onRate: (item: AppointmentDetailed, existing?: MyReview) => void;
}) {
  const router = useRouter();
  const user = useUser();
  const { date, time } = formatDateTime(item.scheduledAt);
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending!;
  const canCancel = item.status === "pending" || item.status === "confirmed";
  const canJoin = item.status === "confirmed" || item.status === "ongoing";
  const isViewerAstrologer = user?.id === item.astrologerId;
  const otherPartyName = isViewerAstrologer ? item.userName : item.astrologerName;
  const canRate = item.status === "completed" && !isViewerAstrologer;

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

      {canRate && (
        <View style={styles.rateRow}>
          {myReview ? (
            <>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rateLabel}>Aapki rating</Text>
                <StarsRow rating={myReview.rating} size={14} />
              </View>
              <TouchableOpacity
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onRate(item, myReview);
                }}
              >
                <Text style={styles.rateLink}>Edit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.rateLabel, { flex: 1 }]}>
                Session kaisa raha?
              </Text>
              <TouchableOpacity
                style={styles.rateBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onRate(item);
                }}
              >
                <Feather name="star" size={13} color="#9d0399" />
                <Text style={styles.rateBtnText}>Leave a Review</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

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

// ─── SectionBlock ─────────────────────────────────────────────────────────────
// Hamesha render hota hai — empty ho to ek chhoti empty state dikhata hai

function SectionBlock({
  title,
  items,
  onCancel,
  cancellingId,
  reviews,
  onRate,
}: {
  title: string;
  items: AppointmentDetailed[];
  onCancel: (id: string) => void;
  cancellingId: string | null;
  reviews: Map<string, MyReview>;
  onRate: (item: AppointmentDetailed, existing?: MyReview) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} <Text style={styles.sectionCount}>({items.length})</Text>
      </Text>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No {title.toLowerCase()} bookings</Text>
        </View>
      ) : (
        items.map((item) => (
          <BookingCard
            key={item.id}
            item={item}
            onCancel={onCancel}
            cancelling={cancellingId === item.id}
            myReview={reviews.get(item.id)}
            onRate={onRate}
          />
        ))
      )}
    </View>
  );
}

// ─── Main tab config ──────────────────────────────────────────────────────────

const TABS = [
  { key: "consultations", label: "Consultations", enabled: true },
  { key: "courses", label: "Courses", enabled: false },
  { key: "products", label: "Products", enabled: false },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("consultations");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const { appointments, loading, refreshing, fetchAppointments } =
    useMyAppointments();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { byAppointment: myReviews } = useMyReviews();
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const handleRate = (item: AppointmentDetailed, existing?: MyReview) =>
    setReviewTarget({
      appointmentId: item.id,
      astrologerId: item.astrologerId,
      astrologerName: item.astrologerName,
      existing,
    });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = (id: string) => {
    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancellingId(id);
            try {
              await consultationService.cancelAppointment(id);
              await fetchAppointments();
              toast.show("Booking cancelled", "success");
            } catch (err: any) {
              toast.show(
                err?.response?.data?.message || "Failed to cancel booking",
                "error",
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  // Filter appointments by time — teeno sections ke liye alag alag
  const filterFn = (item: AppointmentDetailed) =>
    matchesTimeFilter(item.scheduledAt, timeFilter);

  const upcomingCombined = [...appointments.ongoing, ...appointments.upcoming];
  const filteredUpcoming = upcomingCombined.filter(filterFn);
  const filteredCompleted = appointments.completed.filter(filterFn);
  const filteredCancelled = appointments.cancelled.filter(filterFn);

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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 32 + insets.bottom },
          ]}
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
            <Text style={styles.pageTitleText}>My bookings</Text>
          </View>

          {/* Type tabs */}
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

          {activeTab === "consultations" && (
            <>
              {/* Time filter chips */}
              <View style={styles.filterRow}>
                {TIME_FILTERS.map((f) => {
                  const active = timeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setTimeFilter(f.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3 sections — hamesha dikhte hain */}
              <SectionBlock
                title="Upcoming"
                items={filteredUpcoming}
                onCancel={handleCancel}
                cancellingId={cancellingId}
                reviews={myReviews}
                onRate={handleRate}
              />
              <SectionBlock
                title="Completed"
                items={filteredCompleted}
                onCancel={handleCancel}
                cancellingId={cancellingId}
                reviews={myReviews}
                onRate={handleRate}
              />
              <SectionBlock
                title="Cancelled"
                items={filteredCancelled}
                onCancel={handleCancel}
                cancellingId={cancellingId}
                reviews={myReviews}
                onRate={handleRate}
              />
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <ReviewModal target={reviewTarget} onClose={() => setReviewTarget(null)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 32 },

  pageTitleRow: { paddingHorizontal: 16, paddingTop: 20, marginBottom: 16 },
  pageTitleText: { color: "#1A1A2E", fontSize: 28, fontWeight: "900" },

  // Type tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    marginBottom: 0,
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

  // Time filter chips
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#EDE0F5",
    backgroundColor: "#F9F5FF",
  },
  filterChipActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#9d0399",
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#9d0399" },

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

  // Booking card
  bookingCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
    overflow: "hidden",
  },
  cardInner: { flexDirection: "row", padding: 12, gap: 12 },
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
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", flex: 1 },
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
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  cardMetaText: { fontSize: 11, color: "#6B7280" },

  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3E8FF",
    backgroundColor: "#FDF7FF",
  },
  rateLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateBtnText: { fontSize: 12, color: "#9d0399", fontWeight: "800" },
  rateLink: { fontSize: 12, color: "#9d0399", fontWeight: "800" },

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
  cancelBtnText: { fontSize: 12, color: "#DC2626", fontWeight: "700" },
});