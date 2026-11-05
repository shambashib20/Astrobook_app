import Header from "@/components/header";
import UserAvatar from "@/components/UserAvatar";
import { AstroColors } from "@/constants/astro-theme";
import ProfileAbout from "@/features/astrologer/components/ProfileAbout";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import {
  experienceLabel,
  formatCount,
  formatDuration,
  formatPrice,
  formatRating,
} from "@/features/astrologer/utils/cardFormat";
import { useUser } from "@/features/auth/store/auth.store";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import {
  useFollowCounts,
  useFollowStatus,
} from "@/features/follows/hooks/useFollow";
import ProfilePostTile from "@/features/posts/components/ProfilePostTile";
import { useAstrologerPosts } from "@/features/posts/hooks/useFeed";
import AstrologerReviewsSection from "@/features/reviews/components/AstrologerReviewsSection";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = SCREEN_WIDTH * 0.62;
const ITEM_GAP = 12;
const POST_TILE = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export default function AstrologerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useUser();
  const isOwnProfile = !!currentUser && currentUser.id === id;

  const {
    astrologer,
    basicService,
    normalServices,
    loading,
    error,
    fetchProfile,
  } = useAstrologerProfile(id);

  const { posts, loading: postsLoading, fetchPosts } = useAstrologerPosts(id);
  const {
    isFollowing,
    fetchStatus,
    toggle: toggleFollowStatus,
  } = useFollowStatus(isOwnProfile ? undefined : id);
  const { counts: followCounts, fetchCounts } = useFollowCounts(id);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchCounts();
    if (!isOwnProfile) fetchStatus();
  }, [id]);

  // Follow/unfollow ke baad count bhi turant refresh — warna stale rahega
  // jab tak screen dobara mount na ho
  const toggleFollow = async () => {
    await toggleFollowStatus();
    fetchCounts();
  };

  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAllPosts, setShowAllPosts] = useState(false);

  if (loading || !astrologer) {
    return (
      <View style={styles.root}>
        <Header />
        <View style={styles.centerFill}>
          {error ? (
            <Text style={styles.emptyText}>{error}</Text>
          ) : (
            <ActivityIndicator color="#9d0399" size="large" />
          )}
        </View>
      </View>
    );
  }

  // meta abhi optional hai (astrologer ne profile complete nahi ki ho sakti)
  const meta = astrologer.meta;
  const displayName = astrologer.name ?? "Astrologer";
  // Naye backend fields pehle, purana `meta.*` sirf fallback (app naye
  // backend se pehle deploy ho jaye to bhi screen na toote)
  const expertise =
    astrologer.categories && astrologer.categories.length > 0
      ? astrologer.categories
      : meta?.speciality
        ? [meta.speciality]
        : [];
  const languages =
    astrologer.languages && astrologer.languages.length > 0
      ? astrologer.languages.join(", ")
      : (meta?.languages ?? "");
  const experience =
    experienceLabel(astrologer.experienceYears) ??
    (meta?.exp && meta.exp !== "New" ? meta.exp : null);
  const rating = astrologer.rating ?? meta?.rating ?? 0;
  const reviews = astrologer.totalReviews ?? meta?.reviews ?? 0;
  const isOnline = astrologer.isOnline ?? meta?.online ?? false;
  const bio = astrologer.bio ?? meta?.about ?? null;
  const basicPriceLabel = formatPrice(basicService?.price);
  const basicDuration = formatDuration(basicService?.durationMinutes);

  const scrollToNext = () => {
    if (activeIndex < normalServices.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  const scrollToPrev = () => {
    if (activeIndex > 0) {
      const prev = activeIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
      setActiveIndex(prev);
    }
  };

  const onMomentumScrollEnd = (e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (ITEM_WIDTH + ITEM_GAP));
    setActiveIndex(index);
  };

  // NOTE: pehle yeh seedha book-slot pe le jaata tha. Ab har "Book" click
  // (header Basic CTA ho ya consultancy card) pehle service/[id].tsx (detail
  // page) kholega — book-slot pe navigate karna sirf wahan se hoga.
  const goToServiceDetail = (serviceId: string) => {
    if (isOwnProfile) return; // safety net — header CTA already hidden for self
    router.push({
      pathname: "/(user)/service/[id]" as any,
      params: { id: serviceId, astroId: astrologer.id },
    });
  };

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + insets.bottom },
        ]}
      >
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          {!isOwnProfile && (
            <FavoriteButton
              itemId={astrologer.id}
              itemType="astrologer"
              style={styles.heartBtn}
            />
          )}
          <View style={styles.topRow}>
            {/* Avatar & Follow */}
            <View style={styles.profileSidebar}>
              <View style={styles.avatarContainer}>
                <UserAvatar
                  uri={astrologer.avatarUrl}
                  name={astrologer.name}
                  id={astrologer.id}
                  size={100}
                />
              </View>
              {!isOwnProfile && (
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    isFollowing && styles.followBtnActive,
                  ]}
                  onPress={toggleFollow}
                  disabled={isFollowing === null}
                >
                  <Text
                    style={[
                      styles.followBtnText,
                      isFollowing && styles.followBtnTextActive,
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow+"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoColumn}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>
                  {displayName}
                </Text>
                {astrologer.isVerified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={AstroColors.brand}
                  />
                ) : null}
              </View>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isOnline
                        ? AstroColors.success
                        : AstroColors.offline,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isOnline
                        ? AstroColors.successDark
                        : AstroColors.textMuted,
                    },
                  ]}
                >
                  {isOnline ? "Abhi available" : "Offline"}
                </Text>
              </View>

              <View style={styles.ratingRow}>
                {reviews > 0 ? (
                  <>
                    <Ionicons name="star" size={14} color={AstroColors.gold} />
                    <Text style={styles.ratingValue}>
                      {formatRating(rating)}
                    </Text>
                    <Text style={styles.reviewCount}>
                      · {reviews} review{reviews === 1 ? "" : "s"}
                    </Text>
                  </>
                ) : (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>New on AstroBook</Text>
                  </View>
                )}
              </View>

              {(experience || languages) && (
                <View style={styles.metaLine}>
                  {experience ? (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="briefcase-outline"
                        size={13}
                        color={AstroColors.textSecondary}
                      />
                      <Text style={styles.metaText}>{experience}</Text>
                    </View>
                  ) : null}
                  {languages ? (
                    <View style={[styles.metaItem, { flexShrink: 1 }]}>
                      <Ionicons
                        name="language-outline"
                        size={13}
                        color={AstroColors.textSecondary}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {languages}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.followStatsRow}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/follow-list",
                      params: {
                        userId: astrologer.id,
                        name: displayName,
                        role: "astrologer",
                        initialTab: "followers",
                      },
                    })
                  }
                >
                  <Text style={styles.followStatText}>
                    <Text style={styles.followStatCount}>
                      {formatCount(followCounts?.followers)}
                    </Text>{" "}
                    Followers
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/follow-list",
                      params: {
                        userId: astrologer.id,
                        name: displayName,
                        role: "astrologer",
                        initialTab: "following",
                      },
                    })
                  }
                >
                  <Text style={styles.followStatText}>
                    <Text style={styles.followStatCount}>
                      {followCounts?.following ?? 0}
                    </Text>{" "}
                    Following
                  </Text>
                </TouchableOpacity>
              </View>

              {isOwnProfile ? (
                <Text style={styles.noBasicText}>
                  Yeh tumhara apna profile hai
                </Text>
              ) : basicService ? (
                <TouchableOpacity
                  style={styles.bookBtnWrapper}
                  onPress={() => goToServiceDetail(basicService.id)}
                >
                  <View style={styles.bookPriceBox}>
                    <Text style={styles.bookPriceText}>
                      {basicPriceLabel ?? "—"}
                      {basicDuration ? ` · ${basicDuration}` : ""}
                    </Text>
                  </View>
                  <View style={styles.bookActionBox}>
                    <Text style={styles.bookActionText}>Book Now</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noBasicText}>
                  No Bookings available right now!
                </Text>
              )}
            </View>
          </View>

          <ProfileAbout expertise={expertise} bio={bio} />
        </View>

        {/* Consultations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consultations</Text>
          </View>

          {normalServices.length > 0 ? (
            <View style={styles.carouselContainer}>
              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  styles.arrowLeft,
                  activeIndex === 0 && styles.arrowDisabled,
                ]}
                onPress={scrollToPrev}
                disabled={activeIndex === 0}
              >
                <Feather name="chevron-left" size={22} color="#9d0399" />
              </TouchableOpacity>

              <FlatList
                ref={flatListRef}
                data={normalServices}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.carouselListContent}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                  length: ITEM_WIDTH + ITEM_GAP,
                  offset: (ITEM_WIDTH + ITEM_GAP) * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.consultCard}
                    activeOpacity={0.8}
                    onPress={() => goToServiceDetail(item.id)}
                  >
                    <View style={styles.consultImageArea}>
                      {item.coverImage ? (
                        <Image
                          source={{ uri: item.coverImage }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.consultImageEmoji}>
                          {meta?.emoji ?? "🔮"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.consultContent}>
                      <Text style={styles.consultName} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.consultBottomRow}>
                        <Text style={styles.consultPrice}>
                          ₹{item.price ?? "—"}
                        </Text>
                        {!isOwnProfile && (
                          <TouchableOpacity
                            style={styles.consultBookBtn}
                            onPress={() => goToServiceDetail(item.id)}
                          >
                            <Text style={styles.consultBookText}>Book Now</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  styles.arrowRight,
                  activeIndex === normalServices.length - 1 &&
                    styles.arrowDisabled,
                ]}
                onPress={scrollToNext}
                disabled={activeIndex === normalServices.length - 1}
              >
                <Feather name="chevron-right" size={22} color="#9d0399" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No consultations available</Text>
            </View>
          )}

          {normalServices.length > 1 && (
            <View style={styles.dotsRow}>
              {normalServices.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <AstrologerReviewsSection astrologerId={astrologer.id} />

        {/* Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Posts{posts.length > 0 ? ` (${posts.length})` : ""}
            </Text>
          </View>

          {postsLoading ? (
            <ActivityIndicator
              color={AstroColors.brand}
              style={{ marginTop: 12 }}
            />
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.postGrid}>
                {(showAllPosts ? posts : posts.slice(0, 4)).map((post) => (
                  <ProfilePostTile
                    key={post.id}
                    post={post}
                    width={POST_TILE}
                    onPress={() =>
                      router.push({
                        pathname: "/(user)/post/[id]" as any,
                        params: { id: post.id },
                      })
                    }
                  />
                ))}
              </View>
              {posts.length > 4 && (
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => setShowAllPosts((v) => !v)}
                  accessibilityRole="button"
                >
                  <Text style={styles.moreBtnText}>
                    {showAllPosts
                      ? "Kam dikhao"
                      : `Sab ${posts.length} posts dekho`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  scrollContent: { paddingBottom: 32 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  noBasicText: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },

  headerCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
  },
  heartBtn: { position: "absolute", top: 10, right: 10, zIndex: 5 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  profileSidebar: { alignItems: "center", gap: 10, flexShrink: 0 },
  avatarContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: "#d8b4fe",
    backgroundColor: "#fdf2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  followBtn: {
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginTop: 10,
  },
  followBtnActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
  },
  followBtnTextActive: { color: "#FFFFFF" },
  followBtnText: { color: "#9d0399", fontSize: 13, fontWeight: "600" },
  followStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  followStatText: { fontSize: 12.5, color: "#6B7280" },
  followStatCount: { fontWeight: "700", color: "#1A1A2E" },
  infoColumn: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 30,
  },
  name: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "800",
    color: AstroColors.ink,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  ratingValue: { fontSize: 13, fontWeight: "800", color: AstroColors.text },
  newPill: {
    backgroundColor: AstroColors.brandTint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  newPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: AstroColors.brandDark,
  },
  metaLine: { marginTop: 8, gap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12.5, color: AstroColors.textSecondary },
  postGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moreBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 8,
  },
  moreBtnText: { fontSize: 14, fontWeight: "700", color: AstroColors.brand },
  speciality: { fontSize: 13, color: "#6B7280", marginBottom: 1 },
  language: { fontSize: 12, color: "#6B7280", marginBottom: 1 },
  exp: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  reviewCount: { fontSize: 12, color: AstroColors.textSecondary },

  bookBtnWrapper: {
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 10,
    alignSelf: "flex-start",
  },
  bookPriceBox: {
    backgroundColor: "#eac0e8",
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: "center",
  },
  bookPriceText: { color: "#9d0399", fontSize: 12, fontWeight: "700" },
  bookActionBox: {
    backgroundColor: "#9d0399",
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: "center",
  },
  bookActionText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  bioContainer: { marginTop: 16 },
  bioText: { fontSize: 13, color: "#374151", lineHeight: 20 },
  seeMoreLink: { color: "#9d0399", fontWeight: "600" },

  featuredPostContainer: { marginTop: 16 },
  postSquareCard: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: "space-between",
  },
  postTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  postLogoSmall: { flexDirection: "row", alignItems: "center" },
  postLogoAstro: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  postLogoBadge: {
    backgroundColor: "#FFFFFF30",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  postLogoBook: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  postFooterText: { color: "#FFFFFFCC", fontSize: 12 },
  postMiddleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postEmoji: { fontSize: 24, marginBottom: 8 },
  postText: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "500",
  },
  postBottomRow: { marginTop: 8 },
  postStatsRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
  postStat: { fontSize: 12, color: "rgba(255,255,255,0.8)" },

  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0b1d5b" },

  carouselContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  carouselListContent: {
    paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2 - 16,
    gap: ITEM_GAP,
  },
  consultCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
    elevation: 2,
  },
  consultImageArea: {
    height: 140,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  consultImageEmoji: { fontSize: 32 },
  consultContent: { padding: 12 },
  consultName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  consultBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  consultPrice: { fontSize: 16, fontWeight: "800", color: "#0b1d5b" },
  consultBookBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  consultBookText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  arrowBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  arrowLeft: { left: 0 },
  arrowRight: { right: 0 },
  arrowDisabled: { opacity: 0.3 },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D8B4FE" },
  dotActive: { backgroundColor: "#9d0399", width: 16 },

  emptyContainer: { paddingVertical: 16, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  postListCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
    marginBottom: 12,
    elevation: 1,
  },
  postListImage: { width: "100%", height: 160 },
  postListContent: { padding: 14, gap: 6 },
  postListText: { fontSize: 13, color: "#374151", lineHeight: 19 },
  postListDate: { fontSize: 11, color: "#9CA3AF" },
});
