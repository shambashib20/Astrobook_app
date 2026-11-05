import ScreenHeader from "@/components/ScreenHeader";
import { AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
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
  { key: "upcoming", label: "Upcoming", icon: "calendar" as const },
  { key: "ongoing", label: "Live", icon: "radio" as const },
  { key: "completed", label: "Completed", icon: "check-circle" as const },
  { key: "cancelled", label: "Cancelled", icon: "x-circle" as const },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_META: Record<string, { bg: string; fg: string; label: string }> = {
  pending:   { bg: "#FFFBEB", fg: "#B45309",              label: "Pending" },
  confirmed: { bg: AstroColors.successTint, fg: AstroColors.successDark, label: "Confirmed" },
  ongoing:   { bg: "#EFF6FF", fg: "#1D4ED8",              label: "Live" },
  completed: { bg: "#F3F4F6", fg: "#4B5563",              label: "Done" },
  cancelled: { bg: AstroColors.dangerTint, fg: AstroColors.danger, label: "Cancelled" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function CancelledByChip({ cancelledBy }: { cancelledBy?: "user" | "astrologer" | null }) {
  if (!cancelledBy) return null;
  const byAstrologer = cancelledBy === "astrologer";
  return (
    <View style={[styles.chip, byAstrologer ? styles.chipAstrologer : styles.chipUser]}>
      <Feather
        name={byAstrologer ? "user-x" : "user"}
        size={10}
        color={byAstrologer ? AstroColors.danger : AstroColors.textSecondary}
      />
      <Text style={[styles.chipText, byAstrologer ? styles.chipTextAstrologer : styles.chipTextUser]}>
        {byAstrologer ? "Cancelled by astrologer" : "Cancelled by user"}
      </Text>
    </View>
  );
}

function SessionCard({ item }: { item: AppointmentDetailed }) {
  const router = useRouter();
  const { date, time } = formatDateTime(item.scheduledAt);
  const meta = STATUS_META[item.status] ?? STATUS_META.pending!;
  const canJoin = item.status === "confirmed" || item.status === "ongoing";
  const isCancelled = item.status === "cancelled";

  return (
    <TouchableOpacity
      style={[styles.card, canJoin && styles.cardActive]}
      activeOpacity={0.85}
      onPress={() =>
        canJoin &&
        router.push({
          pathname: "/(user)/session/[appointmentId]" as any,
          params: { appointmentId: item.id },
        })
      }
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Feather name="user" size={16} color={AstroColors.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.userName ?? "Client"}
          </Text>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.service.title}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusPillText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Meta: date / time / duration */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={11} color={AstroColors.brand} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Feather name="clock" size={11} color={AstroColors.brand} />
          <Text style={styles.metaText}>{time}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Feather name="activity" size={11} color={AstroColors.brand} />
          <Text style={styles.metaText}>{item.durationMinutes} min</Text>
        </View>
      </View>

      {/* Price */}
      {item.price && (
        <View style={styles.priceRow}>
          <Feather name="tag" size={11} color={AstroColors.gold} />
          <Text style={styles.priceText}>₹{parseFloat(item.price).toFixed(0)}</Text>
        </View>
      )}

      {/* cancelledBy chip */}
      {isCancelled && <CancelledByChip cancelledBy={item.cancelledBy} />}

      {/* Join CTA */}
      {canJoin && (
        <View style={styles.joinRow}>
          <Feather name="video" size={13} color="#FFF" />
          <Text style={styles.joinText}>Join Session</Text>
          <Feather name="arrow-right" size={13} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AstrologerSessionsScreen() {
  const { appointments, loading, refreshing, fetchAppointments } = useMyAppointments();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const currentList = appointments[activeTab] ?? [];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Sessions" subtitle="All your bookings in one place" />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = appointments[tab.key]?.length ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              hitSlop={4}
            >
              <Feather
                name={tab.icon}
                size={13}
                color={isActive ? AstroColors.onBrand : AstroColors.textSecondary}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.fill}>
          <ActivityIndicator color={AstroColors.brand} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAppointments(true)}
              tintColor={AstroColors.brand}
              colors={[AstroColors.brand]}
            />
          }
        >
          {currentList.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={22} color={AstroColors.brand} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>
                Is tab mein abhi koi session nahi hai.
              </Text>
            </View>
          ) : (
            currentList.map((item) => <SessionCard key={item.id} item={item} />)
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AstroColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AstroColors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brandTint,
  },
  tabActive: { backgroundColor: AstroColors.brand },
  tabText: { ...AstroType.micro, color: AstroColors.textSecondary },
  tabTextActive: { color: AstroColors.onBrand, fontWeight: "800" },
  countBadge: {
    backgroundColor: AstroColors.brandTintStrong,
    borderRadius: AstroRadius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  countText: { fontSize: 10, fontWeight: "700", color: AstroColors.brand },
  countTextActive: { color: AstroColors.onBrand },

  // Card
  card: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: AstroColors.border,
    gap: 10,
    ...AstroShadow.soft,
  },
  cardActive: {
    borderColor: AstroColors.brand,
    borderWidth: 1.5,
  },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: { ...AstroType.body, fontWeight: "700", color: AstroColors.ink },
  serviceTitle: { ...AstroType.caption, color: AstroColors.textSecondary },

  statusPill: { borderRadius: AstroRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillText: { ...AstroType.micro, fontWeight: "700", textTransform: "capitalize" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...AstroType.micro, color: AstroColors.textSecondary },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: AstroColors.border,
  },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  priceText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.gold },

  // cancelledBy chip
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AstroRadius.pill,
  },
  chipAstrologer: { backgroundColor: AstroColors.dangerTint },
  chipUser:       { backgroundColor: AstroColors.brandTint },
  chipText:       { ...AstroType.micro, fontWeight: "700" },
  chipTextAstrologer: { color: AstroColors.danger },
  chipTextUser:       { color: AstroColors.brand },

  // Join CTA
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.md,
    paddingVertical: 10,
  },
  joinText: { ...AstroType.button, color: AstroColors.onBrand },

  // Empty
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { ...AstroType.body, fontWeight: "700", color: AstroColors.ink },
  emptyText: { ...AstroType.caption, color: AstroColors.textMuted, textAlign: "center" },
});
