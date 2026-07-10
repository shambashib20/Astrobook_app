import Header from "@/components/header";
import { useUser } from "@/features/auth/store/auth.store";
import { useLikePost } from "@/features/posts/hooks/usePosts";
import { useFeedPosts } from "@/features/posts/hooks/useFeed";
import type { Post } from "@/features/posts/types/post.types";
import { Feather } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Video post ke andar ka player — apna component hai taaki har video ka
// apna independent Agora... nahi, expo-video player instance ho, aur
// visibility ke hisaab se play/pause ho sake ──────────────────────────────
function FeedVideoPlayer({ post, isVisible }: { post: Post; isVisible: boolean }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(post.mediaUrl ?? "", (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (isVisible) player.play();
    else player.pause();
  }, [isVisible, player]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => setMuted((m) => !m)}
      style={styles.videoWrap}
    >
      <VideoView
        style={styles.postVideo}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.muteBadge}>
        <Feather name={muted ? "volume-x" : "volume-2"} size={14} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const user = useUser();
  const { toggleLike } = useLikePost();
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    fetchFeed,
    loadMore,
    updatePost,
  } = useFeedPosts();

  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);

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

  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        message: `${post.astrologerName ?? "Astrobook"} ka post dekho: astrobook://post/${post.id}`,
      });
    } catch {
      // user ne cancel kiya — kuch nahi karna
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const firstVideo = viewableItems.find(
        (v) => (v.item as Post).mediaType === "VIDEO",
      );
      setVisiblePostId(firstVideo ? (firstVideo.item as Post).id : null);
    },
  ).current;

  const renderPost = ({ item: post }: { item: Post }) => {
    const bgColor = post.bgColor ?? colorForId(post.astrologerId);
    const textColor = post.textColor ?? "#FFFFFF";

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <TouchableOpacity
          style={styles.postHeader}
          activeOpacity={0.8}
          onPress={() => goToAstrologer(post.astrologerId)}
        >
          <View style={styles.postAuthorRow}>
            <View style={[styles.postAvatar, { backgroundColor: bgColor }]}>
              <Text style={styles.postAvatarEmoji}>
                {post.astrologerAvatar ?? "🔮"}
              </Text>
            </View>
            <View>
              <Text style={styles.postAuthorName}>
                {post.astrologerName ?? "Astrologer"}
              </Text>
              <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.followBtnText}>Follow +</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Post Content */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => goToPost(post.id)}>
          {post.mediaType === "VIDEO" && post.mediaUrl ? (
            <FeedVideoPlayer post={post} isVisible={visiblePostId === post.id} />
          ) : post.mediaType === "IMAGE" && post.mediaUrl ? (
            <View>
              <Image
                source={{ uri: post.mediaUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />
              {/* Optional single draggable text sticker — position % se render */}
              {post.stickerText && (
                <View
                  style={[
                    styles.stickerChip,
                    {
                      backgroundColor: post.stickerBgColor ?? "#00000090",
                      left: `${Number(post.stickerX ?? 0.5) * 100}%`,
                      top: `${Number(post.stickerY ?? 0.5) * 100}%`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stickerText,
                      { color: post.stickerTextColor ?? "#FFFFFF" },
                    ]}
                  >
                    {post.stickerText}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.postImageArea, { backgroundColor: bgColor }]}>
              <Text style={[styles.postContent, { color: textColor }]}>
                {post.content}
              </Text>
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
          {post.mediaType !== "TEXT" && (
            <Text style={styles.imagePostCaption} numberOfLines={2}>
              {post.content}
            </Text>
          )}
        </TouchableOpacity>

        {/* Post Bottom — Like / Comment / Share / Book */}
        <View style={styles.postBottom}>
          <View style={styles.actionsRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => toggleLike(post, updatePost)}
              >
                <MaterialCommunityIcons
                  name={post.isLikedByMe ? "heart" : "heart-outline"}
                  size={22}
                  color={post.isLikedByMe ? "#DC2626" : "#9d0399"}
                />
                <Text style={styles.count}>{post.likesCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => goToPost(post.id)}
              >
                <MaterialCommunityIcons
                  name="comment-outline"
                  size={22}
                  color="#9d0399"
                />
                <Text style={styles.count}>{post.commentsCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleShare(post)}
              >
                <MaterialCommunityIcons
                  name="share-outline"
                  size={22}
                  color="#9d0399"
                />
              </TouchableOpacity>
            </View>

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
      <Header
        rightSlot={
          user?.isAstrologer ? (
            <TouchableOpacity
              style={styles.addPostBtn}
              onPress={() => router.push("/(astrologer)/posts" as any)}
            >
              <Feather name="plus-circle" size={26} color="#9d0399" />
            </TouchableOpacity>
          ) : undefined
        }
      />

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
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
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

  addPostBtn: { padding: 4 },

  postCard: { backgroundColor: "#FFF", marginTop: 0 },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarEmoji: { fontSize: 20 },
  postAuthorName: { fontSize: 15, fontWeight: "700", color: "#0b1d5b" },
  postTime: { fontSize: 11, color: "#999" },
  followBtnText: { color: "#9d0399", fontSize: 12, fontWeight: "600" },
  followBtn: {},

  postImageArea: {
    width: SCREEN_WIDTH,
    minHeight: 320,
    padding: 24,
    justifyContent: "space-between",
  },
  postImage: { width: SCREEN_WIDTH, height: 320 },

  // Video
  videoWrap: { width: SCREEN_WIDTH, height: 380, backgroundColor: "#000" },
  postVideo: { width: "100%", height: "100%" },
  muteBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#00000080",
    borderRadius: 16,
    padding: 8,
  },

  // Sticker (single, draggable, position stored as %)
  stickerChip: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH * 0.7,
    transform: [{ translateX: -20 }, { translateY: -14 }],
  },
  stickerText: { fontSize: 14, fontWeight: "700" },

  imagePostCaption: {
    fontSize: 14,
    color: "#374151",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  postContent: {
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
  postBottom: { paddingHorizontal: 14, paddingVertical: 10 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  leftActions: { flexDirection: "row", alignItems: "center", gap: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 13, color: "#9d0399" },
  bookBtn: {
    backgroundColor: "#9d0399",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
