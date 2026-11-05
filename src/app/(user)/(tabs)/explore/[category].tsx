import { AstroColors, AstroShadow } from "@/constants/astro-theme";
import AstrologerCard from "@/features/astrologer/components/AstrologerCard";
import AstrologerCardSkeleton from "@/features/astrologer/components/AstrologerCardSkeleton";
import { useAstrologersList } from "@/features/astrologer/hooks/useAstrologersList";
import CategoryHero from "@/features/categories/components/CategoryHero";
import { usePullStretch } from "@/features/categories/hooks/usePullStretch";
import { categoriesService } from "@/features/categories/services";
import type { CategoryStats } from "@/features/categories/types";
import ServiceSlideCard from "@/features/consultation/components/ServiceSlideCard";
import { consultationService } from "@/features/consultation/service";
import type { BrowsedService } from "@/features/consultation/types";
import ProfilePostTile from "@/features/posts/components/ProfilePostTile";
import { useCategoryPosts } from "@/features/posts/hooks/useFeed";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAD = 16;
const GAP = 12;
const ASTRO_SLIDE_W = SCREEN_WIDTH - PAD * 2 - 24;
const SERVICE_W = 216;
const POST_W = 156;
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
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({
  stats,
  astrologerCount,
  accent,
}: {
  stats: CategoryStats | null;
  astrologerCount: number;
  accent: string;
}) {
  const items = [
    {
      icon: "file-text" as const,
      value: stats?.postCount ?? "—",
      label: "Posts",
    },
    {
      icon: "users" as const,
      value: astrologerCount > 0 ? astrologerCount : "—",
      label: "Astrologers",
    },
    {
      icon: "heart" as const,
      value:
        stats
          ? stats.interestedUserCount >= 1000
            ? `${(stats.interestedUserCount / 1000).toFixed(1)}k`
            : String(stats.interestedUserCount)
          : "—",
      label: "Interested",
    },
  ];

  return (
    <View style={statsStyles.bar}>
      {items.map((item, i) => (
        <View key={item.label} style={statsStyles.item}>
          <View style={[statsStyles.iconWrap, { backgroundColor: accent + "22" }]}>
            <Feather name={item.icon} size={14} color={accent} />
          </View>
          <Text style={statsStyles.value}>{item.value}</Text>
          <Text style={statsStyles.label}>{item.label}</Text>
          {i < items.length - 1 && <View style={statsStyles.divider} />}
        </View>
      ))}
    </View>
  );
}

const statsStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    marginHorizontal: PAD,
    backgroundColor: AstroColors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: -20,
    ...AstroShadow.card,
    zIndex: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    position: "relative",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: AstroColors.ink,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "600",
    color: AstroColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    position: "absolute",
    right: 0,
    top: "15%",
    bottom: "15%",
    width: 1,
    backgroundColor: AstroColors.border,
  },
});

// ─── Trusted By Row ───────────────────────────────────────────────────────────

function TrustedByRow({
  stats,
  accent,
}: {
  stats: CategoryStats | null;
  accent: string;
}) {
  if (!stats || stats.interestedUserCount === 0) return null;

  const avatars = stats.sampleAvatars.slice(0, 5);
  const overflow = Math.max(0, stats.interestedUserCount - avatars.length);
  const displayCount =
    stats.interestedUserCount >= 1000
      ? `${Math.floor(stats.interestedUserCount / 1000)}k+`
      : `${stats.interestedUserCount}+`;

  return (
    <View style={trustedStyles.row}>
      {/* Stacked avatar circles */}
      <View style={trustedStyles.avatarStack}>
        {avatars.map((url, i) => (
          <Image
            key={url + i}
            source={{ uri: url }}
            style={[trustedStyles.avatar, { marginLeft: i === 0 ? 0 : -10, zIndex: avatars.length - i }]}
            contentFit="cover"
          />
        ))}
        {/* +N overflow circle */}
        {overflow > 0 && avatars.length > 0 && (
          <View
            style={[
              trustedStyles.avatar,
              { marginLeft: -10, backgroundColor: accent + "22", zIndex: 0 },
            ]}
          >
            <Text style={[trustedStyles.overflowText, { color: accent }]}>
              +{overflow > 999 ? "999" : overflow}
            </Text>
          </View>
        )}
      </View>
      <View style={trustedStyles.textWrap}>
        <Text style={trustedStyles.heading}>
          <Text style={[trustedStyles.count, { color: accent }]}>{displayCount} </Text>
          users trust this
        </Text>
        <Text style={trustedStyles.sub}>
          People with an interest in this category
        </Text>
      </View>
    </View>
  );
}

const trustedStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: PAD,
    gap: 14,
    backgroundColor: AstroColors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: AstroColors.surface,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.brandTint,
  },
  overflowText: {
    fontSize: 9,
    fontWeight: "800",
  },
  textWrap: { flex: 1 },
  heading: {
    fontSize: 13.5,
    fontWeight: "700",
    color: AstroColors.ink,
    lineHeight: 18,
  },
  count: {
    fontWeight: "900",
  },
  sub: {
    fontSize: 11.5,
    color: AstroColors.textMuted,
    marginTop: 1,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  onSeeAll,
}: {
  title: string;
  count?: number;
  onSeeAll?: () => void;
}) {
  return (
    <View style={secStyles.row}>
      <Text style={secStyles.title}>{title}</Text>
      <View style={secStyles.right}>
        {count !== undefined && count > 0 ? (
          <View style={secStyles.badge}>
            <Text style={secStyles.badgeText}>{count}</Text>
          </View>
        ) : null}
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
            <Text style={secStyles.seeAll}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAD,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: AstroColors.ink,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: AstroColors.brandTint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: AstroColors.brand,
  },
  seeAll: {
    fontSize: 12.5,
    fontWeight: "700",
    color: AstroColors.brand,
  },
});

// ─── Empty Placeholder ────────────────────────────────────────────────────────

function EmptyPlaceholder({ icon, title, sub }: { icon: keyof typeof Feather.glyphMap; title: string; sub: string }) {
  return (
    <View style={[emptyStyles.box, { marginHorizontal: PAD }]}>
      <View style={emptyStyles.iconCircle}>
        <Feather name={icon} size={18} color={AstroColors.brand} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.sub}>{sub}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  box: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: AstroColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AstroColors.border,
    gap: 4,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 13.5, fontWeight: "700", color: AstroColors.ink },
  sub: {
    fontSize: 12,
    color: AstroColors.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    category,
    label,
    heroVideoUrl: heroVideoParam,
  } = useLocalSearchParams<{
    category: string;
    label: string;
    heroVideoUrl?: string;
  }>();

  const meta = CATEGORY_META[category] || {
    emoji: "🌟",
    color: "#6B21A8",
    description: "Explore the cosmic wisdom of this ancient practice.",
  };

  const { pull, maxPull, scrollProps } = usePullStretch();

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
  const [stats, setStats] = useState<CategoryStats | null>(null);

  const astro = useAstrologersList(
    { category, sort: "recommended", limit: 20 },
    { enabled: !!category },
  );

  const astroPages = useMemo(() => {
    const pages: (typeof astro.astrologers)[] = [];
    for (let i = 0; i < astro.astrologers.length; i += 2) {
      pages.push(astro.astrologers.slice(i, i + 2));
    }
    return pages;
  }, [astro.astrologers]);

  useEffect(() => {
    if (!category) return;
    fetchPosts();

    // Services
    setServicesLoading(true);
    consultationService
      .browseByTag(category, 20, 0)
      .then((res) => setServices(res.services))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));

    // Stats
    categoriesService
      .getCategoryStats(category)
      .then(setStats)
      .catch(() => setStats(null));
  }, [category]);

  const isEmpty =
    !postsLoading &&
    !servicesLoading &&
    !astro.loading &&
    posts.length === 0 &&
    services.length === 0 &&
    astro.astrologers.length === 0;

  const otherCategories = Object.keys(CATEGORY_META)
    .filter((key) => key !== category)
    .slice(0, 8);

  const prettify = (key: string) =>
    key
      .split("-")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        {...scrollProps}
      >
        {/* ── Hero ── */}
        <CategoryHero
          id={category}
          label={label}
          description={meta.description}
          color={meta.color}
          navy={COSMIC_NAVY}
          paddingTop={insets.top + 50}
          pull={pull}
          maxPull={maxPull}
          heroVideoUrl={heroVideoParam ?? null}
          onBack={() => router.back()}
        />

        {/* ── Stats Bar — overlaps hero bottom ── */}
        <StatsBar
          stats={stats}
          astrologerCount={astro.astrologers.length}
          accent={meta.color}
        />

        {/* ── Trusted by ── */}
        <View style={{ marginTop: 12 }}>
          <TrustedByRow stats={stats} accent={meta.color} />
        </View>

        {/* ── Astrologers ── */}
        <SectionHeader
          title="Astrologers"
          count={astro.astrologers.length}
        />
        {astro.loading ? (
          <View style={{ paddingHorizontal: PAD, gap: 10 }}>
            <AstrologerCardSkeleton variant="compact" />
            <AstrologerCardSkeleton variant="compact" />
          </View>
        ) : astro.error ? (
          <View style={{ paddingHorizontal: PAD }}>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Failed to load astrologers</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => astro.refetch()}
                accessibilityRole="button"
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : astro.astrologers.length === 0 ? (
          <EmptyPlaceholder
            icon="user"
            title="No Astrologers Yet"
            sub="Astrologers in this category will be added soon"
          />
        ) : (
          <FlatList
            data={astroPages}
            horizontal
            keyExtractor={(page) => page.map((a) => a.id).join("-")}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ASTRO_SLIDE_W + GAP}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={styles.sliderContent}
            renderItem={({ item: page }) => (
              <View style={{ width: ASTRO_SLIDE_W, gap: 10 }}>
                {page.map((a) => (
                  <AstrologerCard key={a.id} astrologer={a} variant="compact" />
                ))}
              </View>
            )}
          />
        )}

        {/* ── Consultancies ── */}
        <SectionHeader
          title="Consultancies"
          count={services.length}
        />
        {servicesLoading ? (
          <ActivityIndicator
            color={AstroColors.brand}
            style={{ marginVertical: 12 }}
          />
        ) : services.length === 0 ? (
          <EmptyPlaceholder
            icon="briefcase"
            title="No Consultancies Yet"
            sub="Experts in this category will be joining soon"
          />
        ) : (
          <FlatList
            data={services}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={SERVICE_W + GAP}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={styles.sliderContent}
            renderItem={({ item }) => (
              <ServiceSlideCard service={item} width={SERVICE_W} accent={meta.color} />
            )}
          />
        )}

        {/* ── Recent Posts ── */}
        <SectionHeader
          title="Recent Posts"
          count={posts.length}
        />
        {postsLoading && posts.length === 0 ? (
          <ActivityIndicator
            color={AstroColors.brand}
            style={{ marginVertical: 12 }}
          />
        ) : posts.length === 0 ? (
          <EmptyPlaceholder
            icon="image"
            title="No Posts Found"
            sub="Posts from astrologers in this category will appear here"
          />
        ) : (
          <FlatList
            data={posts}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            onEndReached={() => postsHasMore && loadMorePosts()}
            onEndReachedThreshold={0.6}
            contentContainerStyle={styles.sliderContent}
            renderItem={({ item }) => (
              <ProfilePostTile
                post={item}
                width={POST_W}
                showAuthor
                onPress={() =>
                  router.push({
                    pathname: "/(user)/post/[id]" as any,
                    params: { id: item.id },
                  })
                }
              />
            )}
            ListFooterComponent={
              postsLoadingMore ? (
                <ActivityIndicator
                  color={AstroColors.brand}
                  style={{ alignSelf: "center", marginHorizontal: 12 }}
                />
              ) : null
            }
          />
        )}

        {/* ── Dead-end fallback ── */}
        {isEmpty && otherCategories.length > 0 && (
          <View style={styles.exploreMore}>
            <Text style={[secStyles.title, { paddingHorizontal: PAD }]}>
              Aur bhi explore karo
            </Text>
            <View style={styles.chipRow}>
              {otherCategories.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.chip}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/explore/[category]" as any,
                      params: { category: key, label: prettify(key) },
                    })
                  }
                >
                  <Text style={styles.chipText}>{prettify(key)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  sliderContent: { paddingHorizontal: PAD, gap: GAP, paddingBottom: 6 },

  errorBox: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: AstroColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AstroColors.border,
    gap: 10,
  },
  errorText: { fontSize: 13.5, fontWeight: "700", color: "#374151" },
  retryBtn: {
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: { fontSize: 13, fontWeight: "800", color: AstroColors.brand },

  exploreMore: { paddingTop: 24, gap: 14 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: PAD,
  },
  chip: {
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 12.5, fontWeight: "600", color: "#4A4468" },
});
