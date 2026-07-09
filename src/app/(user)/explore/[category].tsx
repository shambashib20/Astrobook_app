import { consultationService } from "@/features/consultation/service";
import type { BrowsedService } from "@/features/consultation/types";
import { useCategoryPosts } from "@/features/posts/hooks/useFeed";
import type { Post } from "@/features/posts/types/post.types";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* Hero Section */}
            <View style={[styles.hero, { backgroundColor: meta.color }]}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Feather name="arrow-left" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.heroEmoji}>{meta.emoji}</Text>
              <Text style={styles.heroTitle}>{label}</Text>
              <Text style={styles.heroDesc}>{meta.description}</Text>
            </View>

            {/* Consultancies Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultancies</Text>
              {servicesLoading ? (
                <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
              ) : services.length === 0 ? (
                <Text style={styles.emptyText}>
                  Is category mein abhi koi consultancy nahi hai
                </Text>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Posts</Text>
              {postsLoading && posts.length === 0 && (
                <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
              )}
              {!postsLoading && posts.length === 0 && (
                <Text style={styles.emptyText}>Koi post nahi mila</Text>
              )}
            </View>
          </View>
        }
        renderItem={renderPostItem}
        numColumns={1}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        ListFooterComponent={
          postsLoadingMore ? (
            <ActivityIndicator color="#9d0399" style={{ marginVertical: 20 }} />
          ) : !postsHasMore && posts.length > 0 ? (
            <Text style={styles.endText}>Bas itna hi</Text>
          ) : (
            <View style={{ height: 32 }} />
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
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#FFF", marginTop: 4 },
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

  horizontalList: { gap: 10, paddingBottom: 4 },
  postCard: {
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
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
});
