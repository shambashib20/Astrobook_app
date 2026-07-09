import ScreenHeader from "@/components/ScreenHeader";
import { useCategories } from "@/features/categories/hooks/useCategories";
import {
  useCreatePost,
  useImageKitUpload,
  useMyPosts,
} from "@/features/posts/hooks/usePosts";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AstrologerPostsScreen() {
  const { posts, loading, fetchPosts, deletePost } = useMyPosts();
  const { uploadImage, uploading } = useImageKitUpload();
  const { categories, fetchCategories } = useCategories();

  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { createPost, loading: posting } = useCreatePost(() => {
    fetchPosts();
    setShowComposer(false);
    setPostContent("");
    setSelectedImage(null);
    setSelectedTags([]);
  });

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    let mediaUrl: string | undefined;

    if (selectedImage) {
      const url = await uploadImage(selectedImage, `post_${Date.now()}.jpg`);
      if (!url) return;
      mediaUrl = url;
    }

    await createPost({
      content: postContent,
      mediaUrl,
      mediaType: selectedImage ? "IMAGE" : "TEXT",
      tags: selectedTags,
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
        title="✍️ My Posts"
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
            <Text style={styles.emptyEmoji}>✍️</Text>
            <Text style={styles.emptyText}>Koi post nahi hai abhi</Text>
            <Text style={styles.emptySubtext}>
              "+ New" se apna pehla post likho!
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {post.mediaUrl && (
                <Image
                  source={{ uri: post.mediaUrl }}
                  style={styles.postImage}
                />
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
                  <Text style={styles.deleteBtn}>🗑️ Delete</Text>
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
          <View style={styles.composerCard}>
            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowComposer(false)}>
                <Text style={styles.composerClose}>✕</Text>
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

            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.composerActions}>
              <TouchableOpacity
                style={styles.imagePickerBtn}
                onPress={pickImage}
              >
                <Text style={styles.imagePickerIcon}>📷</Text>
                <Text style={styles.imagePickerText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.publishBtn,
                  (!postContent.trim() || posting || uploading) &&
                    styles.publishBtnDisabled,
                ]}
                onPress={handlePublish}
                disabled={!postContent.trim() || posting || uploading}
              >
                {posting || uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.publishBtnText}>Publish 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    borderWidth: 1,
    borderColor: "#EDE9FF",
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
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
    paddingBottom: 40,
    gap: 12,
  },
  composerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  composerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  composerClose: { fontSize: 18, color: "#9CA3AF", padding: 4 },
  composerInput: {
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A2E",
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right" },
  tagsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4,
  },
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
  imagePreviewContainer: { position: "relative" },
  imagePreview: { width: "100%", height: 180, borderRadius: 12 },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#00000080",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  composerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F0FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imagePickerIcon: { fontSize: 18 },
  imagePickerText: { color: "#9d0399", fontWeight: "600", fontSize: 13 },
  publishBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
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
