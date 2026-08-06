import Header from "@/components/header";
import UserAvatar from "@/components/UserAvatar";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { useUser } from "@/features/auth/store/auth.store";
import { useAstrologerPosts } from "@/features/posts/hooks/useFeed";
import { Feather } from "@expo/vector-icons";
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

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: 13,
            color: i <= Math.floor(rating) ? "#9d0399" : "#E5E7EB",
          }}
        >
          ★
        </Text>
      ))}
      <Text style={{ fontSize: 12, color: "#9d0399", marginLeft: 4 }}>
        {rating}
      </Text>
    </View>
  );
}

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

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [id]);

  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
  const speciality = meta?.speciality ?? "Astrologer";
  const languages = meta?.languages ?? "—";
  const experience = meta?.exp ?? "New";
  const rating = meta?.rating ?? 0;
  const reviews = meta?.reviews ?? 0;
  const bio = meta?.about;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
      >
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.topRow}>
            {/* Avatar & Follow */}
            <View style={styles.profileSidebar}>
              <View style={styles.avatarContainer}>
                <UserAvatar
                  uri={astrologer.avatarUrl}
                  name={astrologer.name}
                  id={astrologer.id}
                  size={144}
                />
              </View>
              <TouchableOpacity>
                <Text style={styles.followBtnText}>Follow+</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoColumn}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.speciality}>{speciality}</Text>
              <Text style={styles.language}>{languages}</Text>
              <Text style={styles.exp}>Exp: {experience}</Text>

              <View style={styles.ratingRow}>
                <StarRating rating={rating} />
                <Text style={styles.reviewCount}>{reviews} reviews</Text>
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
                      ₹{basicService.price ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.bookActionBox}>
                    <Text style={styles.bookActionText}>Book Now</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noBasicText}>
                  Booking abhi available nahi hai
                </Text>
              )}
            </View>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {bio || "Is astrologer ne abhi apni bio add nahi ki hai."}
              {bio ? (
                <Text style={styles.seeMoreLink}> See more...</Text>
              ) : null}
            </Text>
          </View>
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
                      <Text style={styles.consultImageEmoji}>
                        {meta?.emoji ?? "🔮"}
                      </Text>
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

        {/* Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts by {displayName}</Text>
          </View>

          {postsLoading ? (
            <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Koi post nahi hai abhi</Text>
            </View>
          ) : (
            posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postListCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/(user)/post/[id]" as any,
                    params: { id: post.id },
                  })
                }
              >
                {post.mediaType === "IMAGE" && post.mediaUrl && (
                  <Image
                    source={{ uri: post.mediaUrl }}
                    style={styles.postListImage}
                  />
                )}
                <View style={styles.postListContent}>
                  <Text style={styles.postListText} numberOfLines={3}>
                    {post.content}
                  </Text>
                  <Text style={styles.postListDate}>
                    {new Date(post.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
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
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  profileSidebar: { alignItems: "center", gap: 10, flexShrink: 0 },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "#d8b4fe",
    backgroundColor: "#fdf2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { color: "#9d0399", fontSize: 13, fontWeight: "600" },
  infoColumn: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: "#0b1d5b", marginBottom: 2 },
  speciality: { fontSize: 13, color: "#6B7280", marginBottom: 1 },
  language: { fontSize: 12, color: "#6B7280", marginBottom: 1 },
  exp: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  ratingRow: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  reviewCount: { fontSize: 12, color: "#9d0399" },

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
