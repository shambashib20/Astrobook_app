import UserAvatar from "@/components/UserAvatar";
import { useUser } from "@/features/auth/store/auth.store";
import { usePost } from "@/features/posts/hooks/useFeed";
import { useComments, useLikePost } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/features/posts/types/post.types";
import { Feather } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Astrobook brand gradient — same purple family jo login/otp/header mein
// already establish hai (#9d0399), avatars/CTAs ko ek consistent "cosmic"
// identity dene ke liye instead of flat solid colors.
const BRAND_GRADIENT: [string, string] = ["#B026C9", "#7C0570"];

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

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "abhi";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function DetailVideoPlayer({ uri }: { uri: string }) {
  const [muted, setMuted] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => setMuted((m) => !m)}
      style={styles.videoWrap}
    >
      <VideoView
        style={styles.heroVideo}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.muteBadge}>
        <Feather
          name={muted ? "volume-x" : "volume-2"}
          size={14}
          color="#FFF"
        />
      </View>
    </TouchableOpacity>
  );
}

export default function PostDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { post, relatedPosts, loading, error, fetchPost } = usePost(id);
  const { toggleLike } = useLikePost();
  const [localPost, setLocalPost] = useState<Post | null>(null);

  const {
    comments,
    loading: commentsLoading,
    posting,
    fetchComments,
    addComment,
  } = useComments(id);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const handleSendComment = async () => {
    const text = commentText;
    setCommentText("");
    const ok = await addComment(text);
    if (ok && localPost) {
      setLocalPost({
        ...localPost,
        commentsCount: localPost.commentsCount + 1,
      });
    }
  };

  const handleShare = async () => {
    if (!localPost) return;
    try {
      await Share.share({
        message: `${localPost.astrologerName ?? "Astrobook"} ka post dekho: astrobook://post/${localPost.id}`,
      });
    } catch {
      // cancelled
    }
  };

  if (loading || !localPost) {
    return (
      <SafeAreaView style={[styles.root, styles.centerFill]} edges={["top"]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.root, styles.centerFill, { padding: 24 }]}
        edges={["top"]}
      >
        <Feather name="alert-circle" size={32} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Wapas jao</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bgColor = localPost.bgColor ?? colorForId(localPost.astrologerId);
  const textColor = localPost.textColor ?? "#FFFFFF";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header Bar — subtle lavender gradient, brand se consistent ── */}
      <LinearGradient colors={["#FDFBFF", "#F5F0FF"]} style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={19} color="#9d0399" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 34 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.commentBubbleRow}>
              <LinearGradient
                colors={BRAND_GRADIENT}
                style={styles.commentAvatar}
              >
                <Feather name="user" size={13} color="#FFF" />
              </LinearGradient>
              <View style={styles.commentBubble}>
                <View style={styles.commentBubbleHeader}>
                  <Text style={styles.commentName}>{item.userName}</Text>
                  <Text style={styles.commentTime}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <>
              {/* ── Author Row ── */}
              <TouchableOpacity
                style={styles.authorRow}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/(user)/astrologer-profile" as any,
                    params: { id: localPost.astrologerId },
                  })
                }
              >
                <UserAvatar
                  uri={localPost.astrologerAvatar}
                  name={localPost.astrologerName}
                  id={localPost.astrologerId}
                  size={46}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>
                    {localPost.astrologerName ?? "Astrologer"}
                  </Text>
                  <Text style={styles.authorTime}>
                    {formatDate(localPost.createdAt)}
                  </Text>
                </View>
                <View style={styles.chevronBadge}>
                  <Feather name="chevron-right" size={16} color="#9d0399" />
                </View>
              </TouchableOpacity>

              {/* ── Media ── */}
              {localPost.mediaType === "VIDEO" && localPost.mediaUrl ? (
                <DetailVideoPlayer uri={localPost.mediaUrl} />
              ) : localPost.mediaType === "IMAGE" && localPost.mediaUrl ? (
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: localPost.mediaUrl }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                  {localPost.stickerText && (
                    <View
                      style={[
                        styles.stickerChip,
                        {
                          backgroundColor:
                            localPost.stickerBgColor ?? "#00000090",
                          left: `${Number(localPost.stickerX ?? 0.5) * 100}%`,
                          top: `${Number(localPost.stickerY ?? 0.5) * 100}%`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stickerChipText,
                          { color: localPost.stickerTextColor ?? "#FFFFFF" },
                        ]}
                      >
                        {localPost.stickerText}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.textHero, { backgroundColor: bgColor }]}>
                  <Text style={[styles.textHeroContent, { color: textColor }]}>
                    {localPost.content}
                  </Text>
                </View>
              )}

              {localPost.mediaType !== "TEXT" && (
                <Text style={styles.caption}>{localPost.content}</Text>
              )}

              {/* ── Actions Bar ── */}
              <View style={styles.actionsBar}>
                <View style={styles.leftActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      localPost.isLikedByMe && styles.actionBtnLikedBg,
                    ]}
                    onPress={() =>
                      toggleLike(localPost, (updated) => setLocalPost(updated))
                    }
                  >
                    <MaterialCommunityIcons
                      name={localPost.isLikedByMe ? "heart" : "heart-outline"}
                      size={21}
                      color={localPost.isLikedByMe ? "#DC2626" : "#9d0399"}
                    />
                    <Text
                      style={[
                        styles.actionCount,
                        localPost.isLikedByMe && { color: "#DC2626" },
                      ]}
                    >
                      {localPost.likesCount}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <MaterialCommunityIcons
                      name="comment-outline"
                      size={20}
                      color="#9d0399"
                    />
                    <Text style={styles.actionCount}>
                      {localPost.commentsCount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleShare}
                  >
                    <MaterialCommunityIcons
                      name="share-outline"
                      size={20}
                      color="#9d0399"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/astrologer-profile" as any,
                      params: { id: localPost.astrologerId },
                    })
                  }
                >
                  <LinearGradient
                    colors={BRAND_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bookNowBtn}
                  >
                    <Text style={styles.bookNowText}>Book Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ── Related Posts ── */}
              {relatedPosts.length > 0 && (
                <View style={styles.relatedSection}>
                  <Text style={styles.relatedTitle}>
                    {localPost.astrologerName?.split(" ")[0] ?? "Astrologer"} ke
                    aur posts
                  </Text>
                  <FlatList
                    data={relatedPosts.slice(0, 3)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const rBg = item.bgColor ?? colorForId(item.astrologerId);
                      return (
                        <TouchableOpacity
                          style={styles.relatedCard}
                          activeOpacity={0.85}
                          onPress={() =>
                            router.replace({
                              pathname: "/(user)/post/[id]" as any,
                              params: { id: item.id },
                            })
                          }
                        >
                          <View style={styles.relatedThumbWrap}>
                            {item.mediaType === "IMAGE" && item.mediaUrl ? (
                              <Image
                                source={{ uri: item.mediaUrl }}
                                style={styles.relatedThumb}
                                resizeMode="cover"
                              />
                            ) : item.mediaType === "VIDEO" ? (
                              <View
                                style={[
                                  styles.relatedThumb,
                                  styles.relatedVideoThumb,
                                ]}
                              >
                                <Feather
                                  name="play-circle"
                                  size={26}
                                  color="#9d0399"
                                />
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.relatedThumb,
                                  { backgroundColor: rBg },
                                ]}
                              >
                                <Text
                                  style={styles.relatedTextContent}
                                  numberOfLines={4}
                                >
                                  {item.content}
                                </Text>
                              </View>
                            )}
                            {item.mediaType === "VIDEO" && (
                              <View style={styles.relatedTypeBadge}>
                                <Feather name="video" size={10} color="#FFF" />
                              </View>
                            )}
                          </View>
                          <Text style={styles.relatedCaption} numberOfLines={2}>
                            {item.content}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              <View style={styles.commentsHeader}>
                <Feather name="message-circle" size={15} color="#1A1A2E" />
                <Text style={styles.commentsTitle}>
                  Comments ({localPost.commentsCount})
                </Text>
              </View>

              {commentsLoading && (
                <ActivityIndicator color="#9d0399" style={{ marginTop: 10 }} />
              )}
              {!commentsLoading && comments.length === 0 && (
                <View style={styles.noCommentsBox}>
                  <Feather name="message-square" size={24} color="#D1D5DB" />
                  <Text style={styles.noComments}>
                    Sabse pehle comment karo!
                  </Text>
                </View>
              )}
            </>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* Comment input */}
        <View style={[styles.commentInputRow, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="Comment likho..."
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            maxLength={500}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSendComment}
            disabled={!commentText.trim() || posting}
          >
            <LinearGradient
              colors={
                !commentText.trim() || posting
                  ? ["#D1D5DB", "#D1D5DB"]
                  : BRAND_GRADIENT
              }
              style={styles.sendBtn}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="send" size={16} color="#FFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#374151", textAlign: "center" },
  errorBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  errorBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },

  // ── Header bar ──
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FF",
  },
  headerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    letterSpacing: 0.2,
  },

  // ── Author row ──
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0FF",
  },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  authorName: { fontSize: 15, fontWeight: "700", color: "#0b1d5b" },
  authorTime: { fontSize: 11.5, color: "#9CA3AF", marginTop: 1 },
  chevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F9F5FF",
    alignItems: "center",
    justifyContent: "center",
  },

  imageWrap: { width: SCREEN_WIDTH },
  heroImage: { width: SCREEN_WIDTH, height: 340 },
  stickerChip: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH * 0.7,
    transform: [{ translateX: -20 }, { translateY: -14 }],
  },
  stickerChipText: { fontSize: 14, fontWeight: "700" },

  videoWrap: { width: SCREEN_WIDTH, height: 380, backgroundColor: "#000" },
  heroVideo: { width: "100%", height: "100%" },
  muteBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#00000080",
    borderRadius: 16,
    padding: 8,
  },

  textHero: {
    width: SCREEN_WIDTH,
    minHeight: 300,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  textHeroContent: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "600",
    textAlign: "center",
  },
  caption: {
    fontSize: 14,
    color: "#374151",
    padding: 14,
    lineHeight: 21,
    backgroundColor: "#FFF",
  },

  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 6,
    borderBottomColor: "#F9F5FF",
  },
  leftActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  actionBtnLikedBg: { backgroundColor: "#FEF2F2" },
  actionCount: { fontSize: 13, color: "#555", fontWeight: "600" },
  bookNowBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  bookNowText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  relatedSection: {
    paddingTop: 18,
    backgroundColor: "#FFF",
    paddingBottom: 18,
    borderBottomWidth: 6,
    borderBottomColor: "#F9F5FF",
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A2E",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  relatedList: { paddingHorizontal: 16, gap: 12 },
  relatedCard: { width: 130, gap: 7 },
  relatedThumbWrap: {
    width: 130,
    height: 130,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0E6FF",
    elevation: 2,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  relatedThumb: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  relatedVideoThumb: { backgroundColor: "#EFF6FF" },
  relatedTextContent: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "700",
    textAlign: "center",
  },
  relatedTypeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#00000080",
    borderRadius: 10,
    padding: 4,
  },
  relatedCaption: { fontSize: 11.5, color: "#4B5563", lineHeight: 15 },

  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#F9F5FF",
  },
  commentsTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A2E" },
  noCommentsBox: { alignItems: "center", gap: 8, paddingVertical: 30 },
  noComments: { fontSize: 13, color: "#9CA3AF" },

  commentBubbleRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  commentBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  commentName: { fontSize: 12.5, fontWeight: "700", color: "#1A1A2E" },
  commentTime: { fontSize: 10.5, color: "#9CA3AF" },
  commentText: { fontSize: 13, color: "#374151", lineHeight: 18 },

  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9F5FF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
