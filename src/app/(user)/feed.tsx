import Header from "@/components/header";
import { useFeedPosts } from "@/features/posts/hooks/useFeed";
import type { Post } from "@/features/posts/types/post.types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function FeedScreen() {
  const router = useRouter();
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    fetchFeed,
    loadMore,
  } = useFeedPosts();

  useEffect(() => {
    fetchFeed();
  }, []);

  const goToPost = (postId: string) => {
    router.push({
      pathname: "/(user)/post/[id]" as any,
      params: { id: postId },
    });
  };

  const goToAstrologer = (astrologerId: string) => {
    router.push({
      pathname: "/(user)/astrologer-profile" as any,
      params: { id: astrologerId },
    });
  };

  const goToBookService = (post: Post) => {
    if (!post.basicServiceId) {
      goToAstrologer(post.astrologerId);
      return;
    }
    router.push({
      pathname: "/(user)/service/[id]" as any,
      params: { id: post.basicServiceId, astroId: post.astrologerId },
    });
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const bgColor = colorForId(post.astrologerId);
    return (
      <View style={styles.postCard}>
        {/* ----- Post Header ----- */}
        <TouchableOpacity
          style={styles.postHeader}
          activeOpacity={0.8}
          onPress={() => goToAstrologer(post.astrologerId)}
        >
          <View style={styles.postAuthorRow}>
            {/* Light Purple Avatar Icon */}
            <View style={[styles.postAvatar, { backgroundColor: "#F3E8FF" }]}>
              <MaterialCommunityIcons
                name="account"
                size={24}
                color="#D946EF"
              />
            </View>
            <View>
              <Text style={styles.postAuthorName}>
                {post.astrologerName ?? "Astrologer"}
              </Text>
              {/* Subtitle add kiya */}
              <Text style={styles.postSubtitle}>Vedic</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={(e) => e.stopPropagation?.()}>
              <Text style={styles.followBtnText}>Follow +</Text>
            </TouchableOpacity>
            {/* 3-dot menu add kiya */}
            <TouchableOpacity>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={24}
                color="#333"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ----- Post Content (Image with Overlay) ----- */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => goToPost(post.id)}
        >
          {post.mediaType === "IMAGE" && post.mediaUrl ? (
            <ImageBackground
              source={{ uri: post.mediaUrl }}
              style={styles.postImage}
              resizeMode="cover"
            >
              {/* Overlay ke andar content */}
              <View style={styles.imageOverlayContent}>
                <Text style={styles.overlayMainText}>{post.content}</Text>
              </View>

              {/* Bottom row inside image (Logo + Text) */}
              <View style={styles.imageFooterOverlay}>
                <View style={styles.postLogoSmall}>
                  <Text style={styles.postLogoAstro}>Astro</Text>
                  <View style={styles.postLogoBadge}>
                    <Text style={styles.postLogoBook}>Book</Text>
                  </View>
                </View>
                {/* Screenshot jaisa Bengali text */}
                <Text style={styles.bottomRightOverlayText}>
                  মহালয়ার শুভেচ্ছা
                </Text>
              </View>
            </ImageBackground>
          ) : (
            // Fallback (agar IMAGE nahi hai toh)
            <View style={[styles.postImageArea, { backgroundColor: bgColor }]}>
              <Text style={styles.postContent}>{post.content}</Text>
              <View style={styles.postFooterRow}>
                <View style={styles.postLogoSmall}>
                  <Text style={styles.postLogoAstro}>Astro</Text>
                  <View style={styles.postLogoBadge}>
                    <Text style={styles.postLogoBook}>Book</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ----- Post Bottom (Caption & Actions) ----- */}
        <View style={styles.postBottom}>
          {/* Caption */}
          <Text style={styles.captionText} numberOfLines={2}>
            {post.content}
          </Text>

          <View style={styles.actionsFooterRow}>
            {/* Left Side: Icons + Date */}
            <View style={styles.leftFooterGroup}>
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconItem}>
                  <MaterialCommunityIcons
                    name="thumb-up-outline"
                    size={22}
                    color="#9d0399"
                  />
                  <Text style={styles.iconCount}>121</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconItem}>
                  <MaterialCommunityIcons
                    name="comment-outline"
                    size={22}
                    color="#9d0399"
                  />
                  <Text style={styles.iconCount}>22</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconItem}>
                  <MaterialCommunityIcons
                    name="share-outline"
                    size={22}
                    color="#9d0399"
                  />
                  <Text style={styles.iconCount}>3</Text>
                </TouchableOpacity>
              </View>
              {/* Date neeche le aaye */}
              <Text style={styles.postDate}>
                {new Date(post.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Right Side: Book Now */}
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => goToBookService(post)}
            >
              <Text style={styles.bookText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Header />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Abhi tak koi post nahi hai</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          refreshing={refreshing}
          onRefresh={() => fetchFeed(true)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color="#9d0399"
                style={{ marginVertical: 20 }}
              />
            ) : !hasMore && posts.length > 0 ? (
              <Text style={styles.endOfFeedText}>
                Bas itna hi — aur posts nahi hain
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
  endOfFeedText: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingVertical: 24,
  },

  // --- Post Card ---
  postCard: { backgroundColor: "#FFF", marginBottom: 10 }, // Margin diya taaki cards alag nazar aayein

  // --- Header ---
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  postAuthorName: { fontSize: 15, fontWeight: "700", color: "#0b1d5b" },
  postSubtitle: { fontSize: 12, color: "#888", marginTop: 2 }, // "Vedic" text
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  followBtnText: { color: "#9d0399", fontSize: 13, fontWeight: "600" },

  // --- Post Image Content (Overlay) ---
  postImage: {
    width: SCREEN_WIDTH,
    height: 380, // Height badha di
    justifyContent: "space-between",
    padding: 24, // Padding for inner contents
  },
  imageOverlayContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
  overlayMainText: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.3)", // Darker text shadow for readability
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  imageFooterOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bottomRightOverlayText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // --- Fallback Image Area (Agar image nahi hai toh) ---
  postImageArea: {
    width: SCREEN_WIDTH,
    minHeight: 320,
    padding: 24,
    justifyContent: "space-between",
  },
  postContent: {
    color: "#FFF",
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
    marginTop: 16,
  },
  postFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },

  // --- Logo Styles (Astro Book) ---
  postLogoSmall: { flexDirection: "row", alignItems: "center" },
  postLogoAstro: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  postLogoBadge: {
    backgroundColor: "#9d0399", // Solid color diya image ke liye
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  postLogoBook: { fontSize: 16, fontWeight: "800", color: "#FFF" },

  // --- Post Bottom / Footer ---
  postBottom: { paddingHorizontal: 14, paddingVertical: 12 },
  captionText: {
    fontSize: 14,
    color: "#111",
    marginBottom: 12,
    lineHeight: 20,
  },
  actionsFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Top align
  },
  leftFooterGroup: { flexDirection: "column", alignItems: "flex-start" },
  iconRow: { flexDirection: "row", gap: 16 },
  iconItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconCount: { fontSize: 14, color: "#9d0399", fontWeight: "500" },
  postDate: { fontSize: 12, color: "#999", marginTop: 8 },
  bookBtn: {
    backgroundColor: "#9d0399",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  bookText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
