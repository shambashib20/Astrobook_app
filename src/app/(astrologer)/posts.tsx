import ScreenHeader from "@/components/ScreenHeader";
import { useCategories } from "@/features/categories/hooks/useCategories";
import {
  useCreatePost,
  useImageKitUpload,
  useMyPosts,
} from "@/features/posts/hooks/usePosts";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_WIDTH = SCREEN_WIDTH - 40; // composer ka horizontal padding minus
const PREVIEW_HEIGHT = 220;
const STICKER_W = 110;
const STICKER_H = 34;

const MAX_VIDEO_DURATION_SEC = 120; // "reel jaisa" — 2 minute
const MAX_VIDEO_SIZE_MB = 60; // ImageKit free-plan storage ke hisaab se realistic cap
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// Text-post background palette — Instagram-story jaisa curated set
const BG_COLORS = [
  "#6B21A8",
  "#1E3A5F",
  "#92400E",
  "#065F46",
  "#9D174D",
  "#4C1D95",
  "#0369A1",
  "#B45309",
];
const TEXT_COLORS = ["#FFFFFF", "#F5F5F5", "#FDE68A", "#FBCFE8", "#BFDBFE"];
const STICKER_BG_COLORS = ["#00000090", "#9d0399", "#FFFFFF", "#065F46"];
const STICKER_TEXT_COLORS = ["#FFFFFF", "#1A1A2E", "#FDE68A"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AstrologerPostsScreen() {
  const { posts, loading, fetchPosts, deletePost } = useMyPosts();
  const { uploadImage, uploading } = useImageKitUpload();
  const { categories, fetchCategories } = useCategories();

  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Media state — ek hi "Add Media" button image aur video dono handle karta hai
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "TEXT">("TEXT");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [pickingMedia, setPickingMedia] = useState(false);

  // TEXT post ke liye — astrologer khud color choose karta hai
  const [bgColor, setBgColor] = useState(BG_COLORS[0]!);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]!);

  // IMAGE post ke liye — optional SINGLE draggable text sticker
  const [stickerOn, setStickerOn] = useState(false);
  const [stickerText, setStickerText] = useState("");
  const [stickerBg, setStickerBg] = useState(STICKER_BG_COLORS[0]!);
  const [stickerTextColor, setStickerTextColor] = useState(STICKER_TEXT_COLORS[0]!);
  const [stickerPos, setStickerPos] = useState({
    x: PREVIEW_WIDTH / 2 - STICKER_W / 2,
    y: PREVIEW_HEIGHT / 2 - STICKER_H / 2,
  });
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_evt, gesture) => {
        setStickerPos((prev) => ({
          x: clamp(prev.x + gesture.dx, 0, PREVIEW_WIDTH - STICKER_W),
          y: clamp(prev.y + gesture.dy, 0, PREVIEW_HEIGHT - STICKER_H),
        }));
        pan.setValue({ x: 0, y: 0 });
      },
    }),
  ).current;

  const { createPost, loading: posting } = useCreatePost(() => {
    resetComposer();
    fetchPosts();
  });

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const resetComposer = () => {
    setShowComposer(false);
    setPostContent("");
    setSelectedTags([]);
    setMediaUri(null);
    setMediaType("TEXT");
    setVideoDuration(null);
    setStickerOn(false);
    setStickerText("");
    setStickerPos({
      x: PREVIEW_WIDTH / 2 - STICKER_W / 2,
      y: PREVIEW_HEIGHT / 2 - STICKER_H / 2,
    });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((t) => t !== tagId);
      if (prev.length >= 3) {
        Alert.alert("Limit", "Max 3 categories select kar sakte ho");
        return prev;
      }
      return [...prev, tagId];
    });
  };

  // ── Media picker — image aur video dono ek hi button se ──────────────────
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true, // image = crop, video = trim (max duration ke liye zaroori)
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const isVideo = asset.type === "video";

    if (isVideo) {
      setPickingMedia(true); // video ke liye size-check thoda time le sakta hai
      try {
        const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;
        if (durationSec > MAX_VIDEO_DURATION_SEC) {
          Alert.alert(
            "Video Bahut Lambi Hai",
            `Max ${MAX_VIDEO_DURATION_SEC / 60} minute ki video allowed hai — thodi chhoti chuno.`,
          );
          return;
        }

        // fileSize kabhi missing ho sakta hai (especially edited/trimmed videos) —
        // FileSystem se fallback check karo
        let sizeBytes = (asset as any).fileSize ?? (asset as any).filesize;
        if (!sizeBytes) {
          const info = await FileSystemLegacy.getInfoAsync(asset.uri, { size: true } as any);
          sizeBytes = (info as any).size ?? 0;
        }
        if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
          Alert.alert(
            "Video Bahut Badi Hai",
            `Max ${MAX_VIDEO_SIZE_MB}MB tak ki video allowed hai — thodi chhoti quality mein try karo.`,
          );
          return;
        }

        setMediaUri(asset.uri);
        setMediaType("VIDEO");
        setVideoDuration(durationSec);
      } finally {
        setPickingMedia(false);
      }
    } else {
      setMediaUri(asset.uri);
      setMediaType("IMAGE");
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType("TEXT");
    setVideoDuration(null);
    setStickerOn(false);
    setStickerText("");
  };

  const handlePublish = async () => {
    if (!postContent.trim()) {
      Alert.alert("Required", "Post content likhna zaroori hai");
      return;
    }

    let uploadedUrl: string | undefined;
    if (mediaUri && mediaType !== "TEXT") {
      const isVideo = mediaType === "VIDEO";
      const url = await uploadImage(
        mediaUri,
        `post_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
        "/astrobook/posts",
        isVideo ? "video/mp4" : "image/jpeg",
      );
      if (!url) return; // uploadImage khud Alert dikha chuka hai
      uploadedUrl = url;
    }

    await createPost({
      content: postContent,
      mediaUrl: uploadedUrl,
      mediaType,
      tags: selectedTags,
      ...(mediaType === "TEXT" ? { bgColor, textColor } : {}),
      ...(mediaType === "VIDEO" && videoDuration
        ? { durationSeconds: videoDuration }
        : {}),
      ...(mediaType === "IMAGE" && stickerOn && stickerText.trim()
        ? {
            stickerText: stickerText.trim(),
            stickerX: clamp(
              (stickerPos.x + STICKER_W / 2) / PREVIEW_WIDTH,
              0,
              1,
            ),
            stickerY: clamp(
              (stickerPos.y + STICKER_H / 2) / PREVIEW_HEIGHT,
              0,
              1,
            ),
            stickerTextColor,
            stickerBgColor: stickerBg,
          }
        : {}),
    });
  };

  const confirmDelete = (postId: string) => {
    Alert.alert("Delete Post", "Yeh post delete karna chahte ho?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePost(postId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="My Posts"
        subtitle="Apni cosmic wisdom share karo"
        rightSlot={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowComposer(true)}
          >
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#9d0399" style={{ marginTop: 40 }} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="edit-3" size={32} color="#9d0399" />
            <Text style={styles.emptyText}>Koi post nahi hai abhi</Text>
            <Text style={styles.emptySubtext}>
              "+ New" se apna pehla post banao!
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {post.mediaUrl && post.mediaType === "IMAGE" && (
                <Image source={{ uri: post.mediaUrl }} style={styles.postImage} />
              )}
              {post.mediaType === "VIDEO" && (
                <View style={[styles.postImage, styles.videoPlaceholder]}>
                  <Feather name="video" size={28} color="#9d0399" />
                  <Text style={styles.videoPlaceholderText}>
                    Video · {post.durationSeconds ?? 0}s
                  </Text>
                </View>
              )}
              <Text style={styles.postContent}>{post.content}</Text>
              <View style={styles.postFooter}>
                <Text style={styles.postDate}>
                  {new Date(post.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                <TouchableOpacity onPress={() => confirmDelete(post.id)}>
                  <Text style={styles.deleteBtn}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Post Composer Modal ── */}
      <Modal
        visible={showComposer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.composerCard}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowComposer(false)} hitSlop={8}>
                <Feather name="x" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.composerInput}
              placeholder="Share your cosmic insights... ✨"
              placeholderTextColor="#9CA3AF"
              multiline
              value={postContent}
              onChangeText={setPostContent}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{postContent.length}/2000</Text>

            {/* ── Media preview / picker ── */}
            {mediaType === "IMAGE" && mediaUri && (
              <View>
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: mediaUri }} style={styles.imagePreview} />
                  {stickerOn && stickerText.trim() !== "" && (
                    <Animated.View
                      {...panResponder.panHandlers}
                      style={[
                        styles.stickerChip,
                        {
                          left: stickerPos.x,
                          top: stickerPos.y,
                          backgroundColor: stickerBg,
                          transform: pan.getTranslateTransform(),
                        },
                      ]}
                    >
                      <Text
                        style={[styles.stickerChipText, { color: stickerTextColor }]}
                        numberOfLines={1}
                      >
                        {stickerText}
                      </Text>
                    </Animated.View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={removeMedia}
                  >
                    <Feather name="x" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Sticker controls */}
                <TouchableOpacity
                  style={styles.stickerToggleRow}
                  onPress={() => setStickerOn((v) => !v)}
                >
                  <Feather
                    name={stickerOn ? "check-square" : "square"}
                    size={16}
                    color="#9d0399"
                  />
                  <Text style={styles.stickerToggleText}>
                    Text sticker add karo (drag karke position karo)
                  </Text>
                </TouchableOpacity>

                {stickerOn && (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={styles.stickerInput}
                      placeholder="Sticker text likho..."
                      placeholderTextColor="#9CA3AF"
                      value={stickerText}
                      onChangeText={setStickerText}
                      maxLength={60}
                    />
                    <Text style={styles.colorLabel}>Sticker background</Text>
                    <View style={styles.colorRow}>
                      {STICKER_BG_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c },
                            stickerBg === c && styles.colorSwatchActive,
                          ]}
                          onPress={() => setStickerBg(c)}
                        />
                      ))}
                    </View>
                    <Text style={styles.colorLabel}>Sticker text color</Text>
                    <View style={styles.colorRow}>
                      {STICKER_TEXT_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c, borderWidth: 1, borderColor: "#E5E7EB" },
                            stickerTextColor === c && styles.colorSwatchActive,
                          ]}
                          onPress={() => setStickerTextColor(c)}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {mediaType === "VIDEO" && mediaUri && (
              <View style={styles.videoPreviewRow}>
                <Feather name="video" size={22} color="#9d0399" />
                <Text style={styles.videoPreviewText}>
                  Video selected · {videoDuration}s
                </Text>
                <TouchableOpacity onPress={removeMedia} hitSlop={8}>
                  <Feather name="x" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {mediaType === "TEXT" && !mediaUri && (
              <>
                <Text style={styles.colorLabel}>Background color</Text>
                <View style={styles.colorRow}>
                  {BG_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        bgColor === c && styles.colorSwatchActive,
                      ]}
                      onPress={() => setBgColor(c)}
                    />
                  ))}
                </View>
                <Text style={styles.colorLabel}>Text color</Text>
                <View style={styles.colorRow}>
                  {TEXT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c, borderWidth: 1, borderColor: "#E5E7EB" },
                        textColor === c && styles.colorSwatchActive,
                      ]}
                      onPress={() => setTextColor(c)}
                    />
                  ))}
                </View>
                {/* Live preview */}
                <View style={[styles.textPreview, { backgroundColor: bgColor }]}>
                  <Text
                    style={[styles.textPreviewContent, { color: textColor }]}
                    numberOfLines={4}
                  >
                    {postContent || "Preview yahan dikhega..."}
                  </Text>
                </View>
              </>
            )}

            <Text style={styles.tagsLabel}>
              Categories ({selectedTags.length}/3) — optional
            </Text>
            <View style={styles.tagsRow}>
              {categories.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, isSelected && styles.tagChipActive]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextActive,
                      ]}
                    >
                      {tag.emoji} {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.composerActions}>
              {!mediaUri && (
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={pickMedia}
                  disabled={pickingMedia}
                >
                  {pickingMedia ? (
                    <ActivityIndicator size="small" color="#9d0399" />
                  ) : (
                    <>
                      <Feather name="image" size={16} color="#9d0399" />
                      <Text style={styles.imagePickerText}>Add Media</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.publishBtn,
                  (!postContent.trim() || posting || uploading) &&
                    styles.publishBtnDisabled,
                  !mediaUri && { flex: 1 },
                ]}
                onPress={handlePublish}
                disabled={!postContent.trim() || posting || uploading}
              >
                {posting || uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.publishBtnText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: { padding: 16, gap: 12 },

  addBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    marginTop: 20,
  },
  emptyText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptySubtext: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  postCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 1,
  },
  postImage: { width: "100%", height: 200 },
  videoPlaceholder: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoPlaceholderText: { fontSize: 12, color: "#6B21A8", fontWeight: "600" },
  postContent: { fontSize: 14, color: "#374151", padding: 14, lineHeight: 20 },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  postDate: { fontSize: 12, color: "#9CA3AF" },
  deleteBtn: { fontSize: 13, color: "#EF4444", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  composerCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  composerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  composerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  composerInput: {
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A2E",
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginBottom: 8 },

  colorLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginTop: 8, marginBottom: 6 },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#1A1A2E",
  },

  textPreview: {
    borderRadius: 12,
    padding: 20,
    minHeight: 120,
    justifyContent: "center",
    marginTop: 10,
  },
  textPreviewContent: { fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24 },

  imagePreviewBox: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  imagePreview: { width: "100%", height: "100%" },
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#00000080",
    borderRadius: 14,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerChip: {
    position: "absolute",
    width: STICKER_W,
    height: STICKER_H,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  stickerChipText: { fontSize: 12, fontWeight: "700" },

  stickerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  stickerToggleText: { fontSize: 12.5, color: "#374151", fontWeight: "600" },
  stickerInput: {
    backgroundColor: "#F9F5FF",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },

  videoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  videoPreviewText: { flex: 1, fontSize: 13, color: "#6B21A8", fontWeight: "600" },

  tagsLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginTop: 14 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  tagChip: {
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    backgroundColor: "#F9F5FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  tagChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  tagChipTextActive: { color: "#FFF" },

  composerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F0FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  imagePickerText: { color: "#9d0399", fontWeight: "600", fontSize: 13 },
  publishBtn: {
    flex: 1,
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  publishBtnDisabled: {
    backgroundColor: "#D1D5DB",
    elevation: 0,
    shadowOpacity: 0,
  },
  publishBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
});
