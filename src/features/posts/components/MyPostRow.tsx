import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Post } from "../types/post.types";
import { prettyTag } from "../utils/tags";
import { formatPostDate } from "../utils/time";

const THUMB = 88;

function Thumb({ post }: { post: Post }) {
  if (post.mediaType === "IMAGE" && post.mediaUrl) {
    return <Image source={{ uri: post.mediaUrl }} style={styles.thumb} />;
  }
  if (post.mediaType === "VIDEO") {
    return (
      <View style={[styles.thumb, styles.videoThumb]}>
        <Feather name="play" size={24} color={AstroColors.onBrand} />
        {post.durationSeconds ? (
          <Text style={styles.durText}>{post.durationSeconds}s</Text>
        ) : null}
      </View>
    );
  }
  return (
    <View
      style={[
        styles.thumb,
        styles.textThumb,
        { backgroundColor: post.bgColor ?? AstroColors.brand },
      ]}
    >
      <Text style={[styles.aa, { color: post.textColor ?? AstroColors.onBrand }]}>Aa</Text>
    </View>
  );
}

// Astrologer ki apni post list ka ek row — thumbnail, caption, likes/comments, delete.
function MyPostRowImpl({
  post,
  onOpen,
  onEdit,
  onDelete,
}: {
  post: Post;
  onOpen: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, AstroShadow.soft]}
      activeOpacity={0.85}
      onPress={() => onOpen(post)}
      accessibilityLabel="Open post"
    >
      <Thumb post={post} />

      <View style={styles.body}>
        <Text style={styles.content} numberOfLines={3}>
          {post.content}
        </Text>

        {post.tags?.length ? (
          <View style={styles.tags}>
            {post.tags.slice(0, 2).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{prettyTag(t)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.meta}>
          <Feather name="heart" size={13} color={AstroColors.textSecondary} />
          <Text style={styles.metaText}>{post.likesCount}</Text>
          <Feather name="message-circle" size={13} color={AstroColors.textSecondary} />
          <Text style={styles.metaText}>{post.commentsCount}</Text>
          <Text style={styles.date}>{formatPostDate(post.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.edit}
          onPress={() => onEdit(post)}
          hitSlop={6}
          accessibilityLabel="Edit post"
        >
          <Feather name="edit-2" size={17} color={AstroColors.brand} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.del}
          onPress={() => onDelete(post)}
          hitSlop={6}
          accessibilityLabel="Delete post"
        >
          <Feather name="trash-2" size={17} color={AstroColors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default memo(MyPostRowImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: AstroRadius.lg,
    backgroundColor: AstroColors.surface,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: AstroRadius.md },
  videoThumb: {
    backgroundColor: AstroColors.brandDark,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  durText: { ...AstroType.micro, color: AstroColors.onBrand },
  textThumb: { alignItems: "center", justifyContent: "center" },
  aa: { fontSize: 24, fontWeight: "800" },
  body: { flex: 1, justifyContent: "space-between", gap: 6 },
  content: { ...AstroType.body, color: AstroColors.text, lineHeight: 20 },
  tags: { flexDirection: "row", gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brandTint,
  },
  tagText: { ...AstroType.micro, color: AstroColors.brand },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary, marginRight: 6 },
  date: { ...AstroType.caption, color: AstroColors.textMuted, marginLeft: "auto" },
  actions: { justifyContent: "space-between" },
  edit: {
    width: MIN_TOUCH - 8,
    height: MIN_TOUCH - 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.brandTint,
  },
  del: {
    width: MIN_TOUCH - 8,
    height: MIN_TOUCH - 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.dangerTint,
  },
});
