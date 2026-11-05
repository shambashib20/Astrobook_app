import { AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import { useAstrologerApplicationStatus } from "@/features/astrologer-application/hooks/useAstrologerApplication";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyAppointments } from "@/features/consultation/hooks/useAppointments";
import { useHasUpcomingAvailability } from "@/features/consultation/hooks/useHasUpcomingAvailability";
import TransactionRow from "@/features/payment/components/TransactionRow";
import { useMyTransactions } from "@/features/payment/hooks/useMyTransactions";
import { inr, sumAmount } from "@/features/payment/utils/transactions";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardLink from "../components/dashboard/DashboardLink";
import DashboardStats from "../components/dashboard/DashboardStats";
import SessionRow from "../components/dashboard/SessionRow";

const MAX_SESSIONS = 4;

/** YYYY-MM-DD in local time */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AstrologerDashboardScreen() {
  const router = useRouter();
  const user = useUser();
  const { appointments, loading, refreshing, fetchAppointments } = useMyAppointments();
  const { status } = useAstrologerApplicationStatus();
  const { profile } = useMyProfile();
  const { hasAvailability, refetch: refetchAvailability } = useHasUpcomingAvailability();
  const { transactions, refetch: refetchTx } = useMyTransactions();

  // Tab screen mounted rehti hai — har baar focus par fresh data
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
      refetchAvailability();
      refetchTx();
    }, []),
  );

  // Bank row tabhi jab admin ne verify kar diya ho AUR bank/vendor abhi jura nahi
  const needsBank =
    status?.verificationStatus === "approved" && !!profile && !profile.cashfreeVendorId;
  // Earned = mile hue payments ka total (Transactions screen se same source)
  const earned = sumAmount(transactions);
  const live = appointments.ongoing;
  const recent = transactions.slice(0, 5);
  const next = [...live, ...appointments.upcoming].slice(0, MAX_SESSIONS);
  const firstName = user?.name?.trim().split(" ")[0];
  const go = (href: string) => router.push(href as any);

  // Aaj ke sessions — ongoing + upcoming filtered by today's date
  const today = todayKey();
  const todaySessions = [
    ...live,
    ...appointments.upcoming.filter((a) => a.scheduledAt.startsWith(today)),
  ];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LinearGradient colors={[AstroColors.canvasHeader, AstroColors.canvas]} style={styles.header}>
        <Text style={styles.hello}>Namaste{firstName ? `, ${firstName}` : ""} 👋</Text>
        <Text style={styles.sub}>Aaj ka overview</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
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
        <DashboardStats
          stats={[
            { label: "Upcoming", value: String(appointments.upcoming.length + live.length) },
            { label: "Completed", value: String(appointments.completed.length) },
            { label: "Earned", value: inr(earned), accent: true },
          ]}
        />

        {needsBank ? (
          <DashboardLink
            highlight
            icon="credit-card"
            title="Connect bank account"
            subtitle="Complete onboarding to receive payouts"
            onPress={() => go("/(astrologer)/bank-onboarding")}
          />
        ) : null}

        {/* ── Aaj ke sessions strip ─────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionLabelRow}>
            <Feather name="sun" size={14} color={AstroColors.gold} />
            <Text style={styles.section}>Today's sessions</Text>
          </View>
          <TouchableOpacity onPress={() => go("/(astrologer)/sessions")} hitSlop={8}>
            <Text style={styles.seeAll}>Sab dekho</Text>
          </TouchableOpacity>
        </View>

        {loading && todaySessions.length === 0 ? (
          <ActivityIndicator color={AstroColors.brand} style={{ marginVertical: 12 }} />
        ) : todaySessions.length === 0 ? (
          <View style={styles.todayEmpty}>
            <Feather name="moon" size={16} color={AstroColors.textMuted} />
            <Text style={styles.todayEmptyText}>Aaj koi session nahi hai</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {todaySessions.map((a) => (
              <SessionRow
                key={a.id}
                appt={a}
                live={a.status === "ongoing"}
                onPress={() => go("/(astrologer)/sessions")}
              />
            ))}
          </View>
        )}

        {/* ── Upcoming sessions ─────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Upcoming sessions</Text>
          {next.length > 0 ? (
            <TouchableOpacity onPress={() => go("/(astrologer)/sessions")} hitSlop={8}>
              <Text style={styles.seeAll}>Sab dekho</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && next.length === 0 ? (
          <ActivityIndicator color={AstroColors.brand} style={{ marginVertical: 24 }} />
        ) : next.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="calendar" size={22} color={AstroColors.brand} />
            </View>
            <Text style={styles.emptyTitle}>Abhi koi session nahi</Text>
            {hasAvailability === false ? (
              <>
                <Text style={styles.emptyText}>
                  Availability set karo taaki users tumhe book kar sakein.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => go("/(astrologer)/availability")}>
                  <Text style={styles.emptyBtnText}>Availability set karo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Tumhare slots khule hain — booking aate hi yahan dikhegi.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {next.map((a) => (
              <SessionRow
                key={a.id}
                appt={a}
                live={a.status === "ongoing"}
                onPress={() => go("/(astrologer)/sessions")}
              />
            ))}
          </View>
        )}

        {recent.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Recent payments</Text>
              <TouchableOpacity onPress={() => go("/(astrologer)/transactions")} hitSlop={8}>
                <Text style={styles.seeAll}>Sab dekho</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.list}>
              {recent.map((t) => (
                <TransactionRow key={t.id} item={t} sub="service" card />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  hello: { ...AstroType.title, color: AstroColors.ink },
  sub: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  section: { ...AstroType.heading, color: AstroColors.ink, marginTop: 4 },
  seeAll: { ...AstroType.caption, fontWeight: "700", color: AstroColors.brand },
  todayEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  todayEmptyText: { ...AstroType.caption, color: AstroColors.textMuted },
  list: { gap: 10 },
  empty: {
    alignItems: "center",
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: 24,
    gap: 6,
    ...AstroShadow.soft,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { ...AstroType.body, fontWeight: "800", color: AstroColors.text },
  emptyText: { ...AstroType.caption, color: AstroColors.textSecondary, textAlign: "center", lineHeight: 18 },
  emptyBtn: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: 20,
    marginTop: 8,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },
});
