import UserAvatar from "@/components/UserAvatar";
import { AstroColors, AstroType } from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Comment } from "../types/post.types";
import { timeAgo } from "../utils/time";

// Ek comment row — flat (Instagram jaisa). `onReply` abhi pass nahi hota;
// jab replies aayenge tab sirf yahi prop dena hoga, layout me jagah ready hai.
export default function CommentItem({
  comment,
  canDelete,
  onDelete,
  onReply,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onReply?: (comment: Comment) => void;
}) {
  const confirmDelete = () =>
    Alert.alert("Delete Comment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(comment.id) },
    ]);

  return (
    <View style={styles.row}>
      <UserAvatar
        uri={comment.userAvatar}
        name={comment.userName}
        id={comment.userId}
        size={34}
      />
      <View style={styles.main}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>
            {comment.userName}
          </Text>
          <Text style={styles.time}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{comment.content}</Text>
        {onReply ? (
          <TouchableOpacity onPress={() => onReply(comment)} hitSlop={8}>
            <Text style={styles.reply}>Reply</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {canDelete ? (
        <TouchableOpacity
          onPress={confirmDelete}
          hitSlop={10}
          style={styles.deleteBtn}
          accessibilityLabel="Delete comment"
        >
          <Feather name="trash-2" size={16} color={AstroColors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  main: { flex: 1, gap: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { ...AstroType.caption, fontWeight: "800", color: AstroColors.ink, flexShrink: 1 },
  time: { ...AstroType.micro, color: AstroColors.textMuted },
  text: { ...AstroType.body, color: AstroColors.text, lineHeight: 20 },
  reply: { ...AstroType.micro, color: AstroColors.textSecondary, marginTop: 4 },
  deleteBtn: { paddingTop: 4, paddingLeft: 4 },
});
