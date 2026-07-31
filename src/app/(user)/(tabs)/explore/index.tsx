import Header from "@/components/header";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.75;

const INITIAL_COUNT = 6;

export default function ExploreScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const { filters, categories, loading, error, fetchCategories } =
    useCategories();

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered =
    activeFilter === "all"
      ? categories
      : categories.filter((c) => c.filter === activeFilter);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  // Group into rows of 2
  const rows: (typeof categories)[number][][] = [];
  for (let i = 0; i < displayed.length; i += 2) {
    rows.push(displayed.slice(i, i + 2));
  }

  return (
    <View style={styles.root}>
      <Header />

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                activeFilter === f.id && styles.filterChipActive,
              ]}
              onPress={() => {
                setActiveFilter(f.id);
                setShowAll(false);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color="#9d0399" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Grid */}
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.card, { backgroundColor: cat.color }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/explore/[category]" as any,
                      params: { category: cat.id, label: cat.label },
                    })
                  }
                >
                  <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                  <Text style={styles.cardLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
              {/* Empty placeholder if odd number */}
              {row.length === 1 && <View style={styles.cardEmpty} />}
            </View>
          ))}

          {/* Show More */}
          {!showAll && filtered.length > INITIAL_COUNT && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.showMoreText}>Show more</Text>
              <Text style={styles.showMoreArrow}>↓</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
  },
  root: { flex: 1, backgroundColor: "#F9F5FF" },

  // Filter tabs
  filterWrapper: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FF",
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F9F5FF",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  filterChipActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
  },
  filterChipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  filterChipTextActive: { color: "#FFF", fontWeight: "700" },

  // Grid
  content: { padding: PADDING, gap: GAP },
  row: { flexDirection: "row", gap: GAP },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
  },
  cardEmpty: { width: CARD_WIDTH },
  cardEmoji: { fontSize: 36 },
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  // Show more
  showMoreBtn: { alignItems: "center", paddingVertical: 16, gap: 4 },
  showMoreText: { fontSize: 14, color: "#9d0399", fontWeight: "600" },
  showMoreArrow: { fontSize: 16, color: "#9d0399" },
});
