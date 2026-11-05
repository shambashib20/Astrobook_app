import { AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TransactionRow from "../components/TransactionRow";
import { useMyTransactions } from "../hooks/useMyTransactions";
import {
  PERIODS,
  filterTransactions,
  groupByDay,
  inr,
  sumAmount,
  type PeriodKey,
} from "../utils/transactions";

export default function AstrologerTransactionsScreen() {
  const router = useRouter();
  const { transactions, loading, refreshing, error, refetch } = useMyTransactions();
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterTransactions(transactions, period, query),
    [transactions, period, query],
  );
  const sections = useMemo(() => groupByDay(filtered), [filtered]);
  const total = useMemo(() => sumAmount(filtered), [filtered]);
  const isFiltered = period !== "all" || query.trim().length > 0;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  const clear = () => {
    setPeriod("all");
    setQuery("");
  };

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {isFiltered ? "Total for this filter" : "Total earned"}
        </Text>
        <Text style={styles.summaryValue}>{inr(total)}</Text>
        <Text style={styles.summarySub}>
          {filtered.length} payment{filtered.length === 1 ? "" : "s"}
          {period !== "all" ? ` · ${periodLabel}` : ""}
        </Text>
      </View>

      <View style={styles.search}>
        <Feather name="search" size={17} color={AstroColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by client or service"
          placeholderTextColor={AstroColors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <Feather name="x" size={17} color={AstroColors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setPeriod(p.key)}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LinearGradient colors={[AstroColors.canvasHeader, AstroColors.canvas]} style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(astrologer)/dashboard" as any))}
          hitSlop={8}
          accessibilityLabel="Wapas jao"
        >
          <Feather name="arrow-left" size={19} color={AstroColors.brand} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Transactions</Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AstroColors.brand} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={30} color={AstroColors.danger} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.outBtn} onPress={() => refetch()}>
            <Text style={styles.outBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              tintColor={AstroColors.brand}
              colors={[AstroColors.brand]}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.day}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => (
            <View
              style={[
                styles.itemWrap,
                index === 0 && styles.itemFirst,
                index === section.data.length - 1 && styles.itemLast,
              ]}
            >
              <TransactionRow item={item} />
              {index < section.data.length - 1 ? <View style={styles.sep} /> : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name={isFiltered ? "search" : "credit-card"} size={22} color={AstroColors.brand} />
              </View>
              <Text style={styles.emptyTitle}>
                {isFiltered ? "No results found" : "No payments yet"}
              </Text>
              <Text style={styles.emptyText}>
                {isFiltered
                  ? "Try adjusting your filter or search."
                  : "Payments will appear here once a user completes a booking."}
              </Text>
              {isFiltered ? (
                <TouchableOpacity style={styles.outBtn} onPress={clear}>
                  <Text style={styles.outBtnText}>Clear filter</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { ...AstroType.heading, color: AstroColors.ink },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: AstroColors.surface, alignItems: "center", justifyContent: "center", ...AstroShadow.soft },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  stateText: { ...AstroType.body, color: AstroColors.textSecondary, textAlign: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

  summary: { backgroundColor: AstroColors.ink, borderRadius: AstroRadius.xl, padding: 20, marginTop: 4 },
  summaryLabel: { ...AstroType.caption, color: "#C4B5FD" },
  summaryValue: { fontSize: 32, fontWeight: "800", color: AstroColors.onBrand, marginTop: 4 },
  summarySub: { ...AstroType.caption, color: "#C4B5FD", marginTop: 4 },

  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, marginTop: 14, paddingHorizontal: 14, backgroundColor: AstroColors.surface, borderRadius: AstroRadius.pill, ...AstroShadow.soft },
  searchInput: { flex: 1, ...AstroType.body, color: AstroColors.text, paddingVertical: 0 },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: AstroRadius.pill, backgroundColor: AstroColors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: AstroColors.border },
  chipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary },
  chipTextOn: { color: AstroColors.onBrand },

  day: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary, marginTop: 14, marginBottom: 8, marginLeft: 4 },
  itemWrap: { backgroundColor: AstroColors.surface },
  itemFirst: { borderTopLeftRadius: AstroRadius.lg, borderTopRightRadius: AstroRadius.lg },
  itemLast: { borderBottomLeftRadius: AstroRadius.lg, borderBottomRightRadius: AstroRadius.lg },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: AstroColors.border, marginLeft: 66 },

  empty: { alignItems: "center", paddingTop: 48, gap: 6 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: AstroColors.brandTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { ...AstroType.body, fontWeight: "800", color: AstroColors.text },
  emptyText: { ...AstroType.caption, color: AstroColors.textSecondary, textAlign: "center", lineHeight: 18 },
  outBtn: { minHeight: MIN_TOUCH, paddingHorizontal: 20, marginTop: 8, borderRadius: AstroRadius.pill, borderWidth: 1.5, borderColor: AstroColors.brand, alignItems: "center", justifyContent: "center" },
  outBtnText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },
});
