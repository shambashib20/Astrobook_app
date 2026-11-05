import Header from "@/components/header";
import {
  AstroColors,
  AstroRadius,
  AstroSpacing,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { useFavoritesList } from "@/features/favorites/hooks/useFavorites";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AstrologerCard from "../components/AstrologerCard";
import AstrologerCardSkeleton from "../components/AstrologerCardSkeleton";
import { useAstrologersList } from "../hooks/useAstrologersList";
import type { AstrologerAvailability, AstrologerProfile, AstrologerSort } from "../types";
import { filterAstrologersLocally } from "../utils/cardFormat";

// ─── Astrologers listing ─────────────────────────────────────────────────────
// Search + All/Online/Offline toggle + ek-select chips (sort). Category filter
// yahan nahi hai — woh Explore tab mein hai (category → astrologers/
// consultations/posts). "Saved" chip favourite astrologers dikhata hai taaki
// pasand aaya astrologer dobara dhundhna na pade.

type ChipKey = "saved" | Exclude<AstrologerSort, "recommended">;

const CHIPS: { key: ChipKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "saved", label: "Saved", icon: "heart" },
  { key: "top_rated", label: "Top Rated", icon: "star" },
  { key: "most_followed", label: "Most Followed", icon: "people" },
  { key: "experienced", label: "Experienced", icon: "school" },
  { key: "new", label: "New", icon: "sparkles" },
  { key: "price_low", label: "Lowest Price", icon: "pricetag" },
];

const AVAILABILITY: { key: AstrologerAvailability; label: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

export default function AstrologersListScreen() {
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<AstrologerAvailability>("all");
  const [chip, setChip] = useState<ChipKey | null>(null);

  const q = useDebouncedValue(search.trim(), 350);
  const showingSaved = chip === "saved";

  const list = useAstrologersList(
    {
      sort: chip && chip !== "saved" ? chip : "recommended",
      availability,
      q: q || undefined,
      limit: 100,
    },
    { enabled: !showingSaved },
  );
  const saved = useFavoritesList("astrologer", { enabled: showingSaved });

  const savedAstrologers = useMemo<AstrologerProfile[]>(
    () =>
      (saved.data ?? []).map((i) => ({ ...i.astrologer, phone: null })),
    [saved.data],
  );

  const data = useMemo(
    () =>
      showingSaved
        ? filterAstrologersLocally(savedAstrologers, availability, q)
        : list.astrologers,
    [showingSaved, savedAstrologers, availability, q, list.astrologers],
  );

  const loading = showingSaved ? saved.isLoading : list.loading;
  const error = showingSaved
    ? saved.isError
      ? "Failed to load saved astrologers"
      : null
    : list.error;
  const refreshing = showingSaved ? saved.isRefetching : list.refreshing;
  const onRefresh = () => (showingSaved ? saved.refetch() : list.refetch());
  const filtersActive = availability !== "all" || !!q || (chip !== null && !showingSaved);

  const clearAll = useCallback(() => {
    setSearch("");
    setAvailability("all");
    setChip(null);
  }, []);

  const subtitle = showingSaved
    ? "Your saved astrologers"
    : loading
      ? "Finding astrologers…"
      : `${data.length} ${data.length === 1 ? "astrologer" : "astrologers"}`;

  const empty = (() => {
    if (error) {
      return {
        icon: "alert-circle-outline" as const,
        title: error,
        hint: null,
        action: { label: "Try Again", onPress: onRefresh },
      };
    }
    if (showingSaved && savedAstrologers.length === 0) {
      return {
        icon: "heart-outline" as const,
        title: "No Saved Astrologers Yet",
        hint: "Tap the heart on any astrologer's card to save them here for easy access later.",
        action: null,
      };
    }
    return {
      icon: "search-outline" as const,
      title: "No Astrologers Found",
      hint: filtersActive || showingSaved ? "Try changing your filters or search." : null,
      action: filtersActive || showingSaved ? { label: "Clear Filters", onPress: clearAll } : null,
    };
  })();

  return (
    <View style={styles.root}>
      <Header />

      <View style={styles.controls}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Find Your Astrologer</Text>
          <Text style={styles.count}>{subtitle}</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={AstroColors.brand} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skill or language"
            placeholderTextColor="#B8A2C9"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Astrologer search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={AstroColors.brand} />
            </TouchableOpacity>
          )}
        </View>

        {/* All / Online / Offline */}
        <View style={styles.segment} accessibilityRole="tablist">
          {AVAILABILITY.map((opt) => {
            const active = availability === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setAvailability(opt.key)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                {opt.key === "online" ? (
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: active ? AstroColors.onBrand : AstroColors.success },
                    ]}
                  />
                ) : null}
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ek-select chips: dobara dabao to hat jaata hai (default order) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {CHIPS.map((c) => {
            const active = chip === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setChip(active ? null : c.key)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={c.icon}
                  size={14}
                  color={active ? AstroColors.onBrand : c.key === "saved" || c.key === "top_rated" ? AstroColors.brand : AstroColors.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={error ? [] : data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AstrologerCard astrologer={item} />}
          contentContainerStyle={[styles.listContent, data.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // Filter badalne par purani list thodi dim rehti hai jab tak naya
          // result aata hai
          style={!showingSaved && list.isSwitching ? styles.switching : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[AstroColors.brand]}
              tintColor={AstroColors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={empty.icon} size={30} color={AstroColors.brand} />
              </View>
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              {empty.hint ? <Text style={styles.emptyHint}>{empty.hint}</Text> : null}
              {empty.action ? (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={empty.action.onPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptyBtnText}>{empty.action.label}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },

  controls: {
    backgroundColor: AstroColors.canvasHeader,
    paddingTop: AstroSpacing.md,
    paddingBottom: AstroSpacing.md,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AstroColors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: AstroSpacing.lg,
  },
  title: { ...AstroType.title, color: AstroColors.ink },
  count: { ...AstroType.caption, color: AstroColors.textSecondary },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: AstroSpacing.lg,
    height: MIN_TOUCH,
    paddingHorizontal: 14,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: AstroColors.ink, padding: 0 },

  segment: {
    flexDirection: "row",
    marginHorizontal: AstroSpacing.lg,
    padding: 3,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.brandTint,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 34,
    borderRadius: AstroRadius.sm + 1,
  },
  segmentItemActive: { backgroundColor: AstroColors.brand },
  segmentText: { fontSize: 13, fontWeight: "700", color: AstroColors.textSecondary },
  segmentTextActive: { color: AstroColors.onBrand },
  liveDot: { width: 7, height: 7, borderRadius: 4 },

  chipRow: { paddingHorizontal: AstroSpacing.lg, gap: AstroSpacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  chipActive: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipText: { fontSize: 12.5, fontWeight: "700", color: AstroColors.textSecondary },
  chipTextActive: { color: AstroColors.onBrand },

  listContent: { padding: AstroSpacing.lg, gap: 14 },
  switching: { opacity: 0.55 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { ...AstroType.heading, color: AstroColors.ink, textAlign: "center" },
  emptyHint: {
    fontSize: 13,
    color: AstroColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 6,
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: 20,
    borderRadius: AstroRadius.md,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: { fontSize: 14, fontWeight: "800", color: AstroColors.brand },
});
