import { consultationService } from "@/features/consultation/service";
import type { BrowsedService } from "@/features/consultation/types";
import { useCategoryPosts } from "@/features/posts/hooks/useFeed";
import type { Post } from "@/features/posts/types/post.types";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Astrobook ka signature "cosmic" navy — login/otp/onboarding mein already
// establish hai. Har category hero isi navy mein blend hota hai neeche se,
// taaki poora app ek hi visual identity share kare, sirf ek flat solid
// color block na ho.
const COSMIC_NAVY = "#121943";

const CATEGORY_META: Record<
  string,
  { emoji: string; color: string; description: string }
> = {
  numerology: {
    emoji: "🔢",
    color: "#1E40AF",
    description:
      "Discover the mystical relationship between numbers and life events. Numerology reveals your life path, destiny, and personality through the power of numbers.",
  },
  "numerology-name": {
    emoji: "📛",
    color: "#1E3A5F",
    description:
      "Your name carries a unique vibration. Name numerology reveals hidden traits and life influences encoded in your birth name.",
  },
  vastu: {
    emoji: "🏠",
    color: "#1E3A5F",
    description:
      "Ancient Indian science of architecture and space. Vastu Shastra harmonizes your living and working spaces with natural forces.",
  },
  "vastu-home": {
    emoji: "🏡",
    color: "#065F46",
    description:
      "Transform your home into a sanctuary of positive energy with expert Vastu guidance for every room and direction.",
  },
  "vedic-astrology": {
    emoji: "⭐",
    color: "#4C1D95",
    description:
      "The oldest and most complete system of astrology. Vedic astrology uses your birth chart to reveal your destiny, karma, and life purpose.",
  },
  kundli: {
    emoji: "🔮",
    color: "#6B21A8",
    description:
      "Your Kundli is a cosmic blueprint of your life. Get detailed analysis of your birth chart, planetary positions, and life predictions.",
  },
  tarot: {
    emoji: "🃏",
    color: "#92400E",
    description:
      "Tarot cards are windows to the subconscious mind. Get clarity on love, career, and life decisions through intuitive tarot readings.",
  },
  "tarot-love": {
    emoji: "💕",
    color: "#9D174D",
    description:
      "Navigate matters of the heart with tarot. Love readings reveal relationship patterns, compatibility, and the path to your soulmate.",
  },
  palmistry: {
    emoji: "✋",
    color: "#065F46",
    description:
      "Your hands carry the map of your life. Palmistry reads the lines, mounts, and shapes of your palms to reveal personality and destiny.",
  },
  "face-reading": {
    emoji: "👁️",
    color: "#7C2D12",
    description:
      "The face is a mirror of the soul. Face reading reveals character, health, fortune, and life patterns through facial features.",
  },
  reiki: {
    emoji: "✨",
    color: "#065F46",
    description:
      "Reiki is a Japanese healing technique based on the principle of free energy flow. Balance your chakras and restore vitality.",
  },
  "past-life": {
    emoji: "🌀",
    color: "#134E4A",
    description:
      "Explore your soul's journey across lifetimes. Past life readings reveal karmic patterns, unresolved lessons, and soul connections.",
  },
  meditation: {
    emoji: "🧘",
    color: "#1E40AF",
    description:
      "Meditation is the gateway to inner peace. Connect with expert guides for personalized meditation and mindfulness practices.",
  },
  gemstones: {
    emoji: "💎",
    color: "#6B21A8",
    description:
      "Gemstones carry powerful cosmic energies. Get expert guidance on which stones can enhance your luck, health, and prosperity.",
  },
  "love-reading": {
    emoji: "💕",
    color: "#9D174D",
    description:
      "Gain deep insights into your love life, relationships, and romantic future through expert astrology and card readings.",
  },
};

// Hero ke andar chhote decorative "stars" — fixed positions, lightweight
// (koi extra asset/library nahi chahiye), sirf cosmic feel dene ke liye.
const STAR_DOTS = [
  { top: "24%", left: "12%", size: 3, opacity: 0.9 },
  { top: "34%", left: "85%", size: 2, opacity: 0.6 },
  { top: "20%", left: "70%", size: 2, opacity: 0.7 },
  { top: "58%", left: "8%", size: 2, opacity: 0.5 },
  { top: "68%", left: "90%", size: 3, opacity: 0.8 },
  { top: "16%", left: "45%", size: 2, opacity: 0.5 },
];

const BG_PALETTE = [
  "#6B21A8",
  "#1E3A5F",
  "#92400E",
  "#065F46",
  "#9D174D",
  "#4C1D95",
];
function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 997;
  return BG_PALETTE[hash % BG_PALETTE.length]!;
}

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category, label } = useLocalSearchParams<{
    category: string;
    label: string;
  }>();

  const meta = CATEGORY_META[category] || {
    emoji: "🌟",
    color: "#6B21A8",
    description: "Explore the cosmic wisdom of this ancient practice.",
  };

  const {
    posts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    hasMore: postsHasMore,
    fetchPosts,
    loadMore: loadMorePosts,
  } = useCategoryPosts(category);

  const [services, setServices] = useState<BrowsedService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
    if (category) {
      setServicesLoading(true);
      consultationService
        .browseByTag(category, 20, 0)
        .then((res) => setServices(res.services))
        .catch(() => setServices([]))
        .finally(() => setServicesLoading(false));
    }
  }, [category]);

  const isEmpty =
    !postsLoading &&
    !servicesLoading &&
    posts.length === 0 &&
    services.length === 0;

  const otherCategories = Object.entries(CATEGORY_META)
    .filter(([key]) => key !== category)
    .slice(0, 8);

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[
        styles.postCard,
        { backgroundColor: colorForId(item.astrologerId) },
      ]}
      activeOpacity={0.9}
      onPress={() =>
        router.push({
          pathname: "/(user)/post/[id]" as any,
          params: { id: item.id },
        })
      }
    >
      <View style={styles.postCardHeader}>
        <View style={styles.postAvatar}>
          <Text style={{ fontSize: 16 }}>{item.astrologerAvatar ?? "🔮"}</Text>
        </View>
        <Text style={styles.postAuthor} numberOfLines={1}>
          {item.astrologerName ?? "Astrologer"}
        </Text>
      </View>
      <Text style={styles.postContent} numberOfLines={4}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}

        ListHeaderComponent={
          <View>
              {/* ── Hero — cosmic gradient, brand navy mein blend hoti hai.
                  Gradient khud full-bleed hai (status bar ke peeche bhi jaata
                  hai, immersive look), lekin andar ka content (back button,
                  badge) insets.top se safe distance rakhta hai — warna status
                  bar icons ke saath overlap/cramped lagta hai. ── */}
            <LinearGradient
              colors={[meta.color, COSMIC_NAVY]}
              style={[styles.hero, { paddingTop: insets.top + 50 }]}
            >
              {STAR_DOTS.map((star, i) => (
                <View
                  key={i}
                  style={[
                    styles.star,
                    {
                      top: star.top as any,
                      left: star.left as any,
                      width: star.size,
                      height: star.size,
                      opacity: star.opacity,
                    },
                  ]}
                />
              ))}
              <TouchableOpacity
                style={[styles.backBtn, { top: insets.top + 12 }]}
                onPress={() => router.back()}
                hitSlop={8}
              >
                <Feather name="arrow-left" size={22} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.emojiBadge}>
                <Text style={styles.heroEmoji}>{meta.emoji}</Text>
              </View>
              <Text style={styles.heroTitle}>{label}</Text>
              <Text style={styles.heroDesc}>{meta.description}</Text>
            </LinearGradient>

            {/* ── Consultancies Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultancies</Text>
              {servicesLoading ? (
                <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
              ) : services.length === 0 ? (
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIconCircle}>
                    <Feather name="users" size={20} color="#9d0399" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    Abhi koi consultancy nahi
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Is category ke astrologers jaldi add honge
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={services}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.astroCard}
                      activeOpacity={0.9}
                      onPress={() =>
                        router.push({
                          pathname: "/(user)/astrologer-profile" as any,
                          params: { id: item.astrologerId },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.astroAvatar,
                          { backgroundColor: colorForId(item.id) },
                        ]}
                      >
                        <Text style={{ fontSize: 24 }}>🔮</Text>
                      </View>
                      <Text style={styles.astroName} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.astroSpeciality} numberOfLines={1}>
                        by {item.astrologerName}
                      </Text>
                      <Text style={styles.astroPrice}>
                        {item.price ? `₹${item.price}` : "—"}
                      </Text>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() =>
                          router.push({
                            pathname: "/(user)/astrologer-profile" as any,
                            params: { id: item.astrologerId },
                          })
                        }
                      >
                        <Text style={styles.bookBtnText}>Book</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {/* ── Recent Posts Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Posts</Text>
              {postsLoading && posts.length === 0 && (
                <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
              )}
              {!postsLoading && posts.length === 0 && (
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIconCircle}>
                    <Feather name="file-text" size={20} color="#9d0399" />
                  </View>
                  <Text style={styles.emptyTitle}>Koi post nahi mila</Text>
                  <Text style={styles.emptySubtext}>
                    Astrologers is category mein post karenge toh yahan dikhega
                  </Text>
                </View>
              )}
            </View>

            {/* ── Empty hone par khaali space ki jagah "aur explore karo"
                genuinely useful section — dead-end feel nahi hoga ── */}
            {isEmpty && otherCategories.length > 0 && (
              <View style={styles.exploreMoreSection}>
                <Text style={styles.sectionTitle}>Aur bhi explore karo</Text>
                <View style={styles.categoryChips}>
                  {otherCategories.map(([key, cat]) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.categoryChip}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/(user)/explore/[category]" as any,
                          params: {
                            category: key,
                            label: key
                              .split("-")
                              .map((w) => w[0]?.toUpperCase() + w.slice(1))
                              .join(" "),
                          },
                        })
                      }
                    >
                      <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                      <Text style={styles.categoryChipText}>
                        {key
                          .split("-")
                          .map((w) => w[0]?.toUpperCase() + w.slice(1))
                          .join(" ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        }
        renderItem={renderPostItem}
        numColumns={1}
        contentContainerStyle={{
          // paddingHorizontal: 16,
          gap: 12,
          paddingBottom: insets.bottom + 16,
        }}
        ListFooterComponent={
          postsLoadingMore ? (
            <ActivityIndicator color="#9d0399" style={{ marginVertical: 20 }} />
          ) : !postsHasMore && posts.length > 0 ? (
            <Text style={styles.endText}>Bas itna hi</Text>
          ) : (
            <View style={{ height: 8 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  emptyText: { fontSize: 13, color: "#9CA3AF", paddingHorizontal: 16 },
  endText: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingVertical: 20,
  },

  hero: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  heroEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#FFF", marginTop: 6 },
  heroDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 4,
  },

  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0b1d5b",
    marginBottom: 12,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0E6FF",
    gap: 4,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F9F5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 13.5, fontWeight: "700", color: "#374151" },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 17,
  },

  horizontalList: { gap: 10, paddingBottom: 4 },
  postCard: {
    borderRadius: 14,
  padding: 14,
  minHeight: 130,
  marginHorizontal: 16,   // 👈 add
  },
  postCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  postAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  postAuthor: { fontSize: 12, color: "#FFF", fontWeight: "700", flex: 1 },
  postContent: { fontSize: 13, color: "#FFF", lineHeight: 19 },

  astroCard: {
    width: 140,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
  },
  astroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  astroName: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  astroSpeciality: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  astroPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9d0399",
    marginTop: 4,
    marginBottom: 8,
  },
  bookBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bookBtnText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  exploreMoreSection: { paddingTop: 24, paddingHorizontal: 16 },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryChipEmoji: { fontSize: 14 },
  categoryChipText: { fontSize: 12.5, fontWeight: "600", color: "#4A4468" },
});
