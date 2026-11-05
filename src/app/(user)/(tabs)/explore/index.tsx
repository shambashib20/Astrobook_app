import Header from "@/components/header";
import { AstroColors, AstroRadius, AstroType } from "@/constants/astro-theme";
import CategoryCard from "@/features/categories/components/CategoryCard";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - PADDING * 2 - GAP) / 2);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.82);

const INITIAL_COUNT = 6;

export default function ExploreScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const { filters, categories, loading, error, fetchCategories } =
    useCategories();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Explore tab chhodte hi filter/search/show-all reset — wapas aane par hamesha
  // fresh "All" state. (Category detail se back aane par reset NAHI hota, kyunki
  // tab blur nahi hua — sirf tab badalne par hota hai.)
  const navigation = useNavigation();
  useEffect(() => {
    const tabRoute = navigation.getParent();
    if (!tabRoute) return;
    return tabRoute.addListener("blur", () => {
      setActiveFilter("all");
      setQuery("");
      setShowAll(false);
    });
  }, [navigation]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const filtered = useMemo(() => {
    const byFilter =
      activeFilter === "all"
        ? categories
        : categories.filter((c) => c.filter === activeFilter);
    return searching
      ? byFilter.filter((c) => c.label.toLowerCase().includes(q))
      : byFilter;
  }, [categories, activeFilter, q, searching]);

  // Search karte waqt saare matches dikhao ("Show more" ke peeche nahi chhupao)
  const displayed =
    showAll || searching ? filtered : filtered.slice(0, INITIAL_COUNT);

  const open = (id: string, label: string, heroVideoUrl?: string | null) =>
    router.push({
      pathname: "/(user)/explore/[category]" as any,
      params: {
        category: id,
        label,
        // heroVideoUrl ko query param se paas karo — category page video play karega
        ...(heroVideoUrl ? { heroVideoUrl } : {}),
      },
    });

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>What would you like guidance on?</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Feather name="search" size={17} color={AstroColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories — Tarot, Vastu, Kundli…"
            placeholderTextColor={AstroColors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Category search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              hitSlop={10}
              onPress={() => setQuery("")}
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={17} color={AstroColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        {filters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
            style={styles.filtersScroll}
          >
            {filters.map((f) => {
              const active = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setActiveFilter(f.id);
                    setShowAll(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator
            color={AstroColors.brand}
            style={{ marginTop: 40 }}
          />
        ) : error ? (
          <TouchableOpacity onPress={fetchCategories}>
            <Text style={styles.emptyText}>{error} — tap to retry</Text>
          </TouchableOpacity>
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Categories Found</Text>
            <Text style={styles.emptyText}>
              {searching
                ? `No results for "${query.trim()}"`
                : "Nothing here yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayed.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                onPress={() => open(cat.id, cat.label, cat.heroVideoUrl)}
              />
            ))}
          </View>
        )}

        {!loading &&
          !searching &&
          !showAll &&
          filtered.length > INITIAL_COUNT && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setShowAll(true)}
              accessibilityRole="button"
            >
              <Text style={styles.showMoreText}>See all {filtered.length}</Text>
              <Feather
                name="chevron-down"
                size={16}
                color={AstroColors.brand}
              />
            </TouchableOpacity>
          )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  content: { paddingHorizontal: PADDING, paddingTop: 18 },

  titleBlock: { marginBottom: 14 },
  title: { ...AstroType.title, fontSize: 26, color: AstroColors.ink },
  subtitle: {
    ...AstroType.body,
    color: AstroColors.textSecondary,
    marginTop: 2,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
    borderRadius: AstroRadius.pill,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AstroColors.text,
    paddingVertical: 8,
  },

  filtersScroll: { marginTop: 12, marginHorizontal: -PADDING },
  filtersRow: { paddingHorizontal: PADDING, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  chipActive: {
    backgroundColor: AstroColors.brand,
    borderColor: AstroColors.brand,
  },
  chipText: {
    fontSize: 13,
    color: AstroColors.textSecondary,
    fontWeight: "600",
  },
  chipTextActive: { color: AstroColors.onBrand, fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: 16 },

  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    marginTop: 12,
  },
  showMoreText: { fontSize: 14, color: AstroColors.brand, fontWeight: "700" },

  empty: { alignItems: "center", marginTop: 48, gap: 4 },
  emptyTitle: { ...AstroType.heading, color: AstroColors.ink },
  emptyText: {
    fontSize: 13,
    color: AstroColors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
