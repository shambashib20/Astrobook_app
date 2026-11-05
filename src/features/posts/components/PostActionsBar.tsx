import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { Post } from "../types/post.types";

// Like / comment / share pills + Book Now. Comment pill sheet kholta hai.
export default function PostActionsBar({
  post,
  onLike,
  onComment,
  onShare,
  onBook,
  style,
}: {
  post: Post;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onBook: () => void;
  /** Container override (feed card me side padding nahi chahiye) */
  style?: StyleProp<ViewStyle>;
}) {
  const liked = post.isLikedByMe;

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.left}>
        <TouchableOpacity
          style={[styles.pill, liked && styles.pillLiked]}
          onPress={onLike}
          accessibilityLabel={liked ? "Unlike" : "Like"}
        >
          <MaterialCommunityIcons
            name={liked ? "heart" : "heart-outline"}
            size={21}
            color={liked ? AstroColors.danger : AstroColors.brand}
          />
          <Text style={[styles.count, liked && { color: AstroColors.danger }]}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={onComment}
          accessibilityLabel="View comments"
        >
          <MaterialCommunityIcons
            name="comment-outline"
            size={20}
            color={AstroColors.brand}
          />
          <Text style={styles.count}>{post.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={onShare}
          accessibilityLabel="Share"
        >
          <MaterialCommunityIcons
            name="share-outline"
            size={21}
            color={AstroColors.brand}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={onBook}>
        <LinearGradient
          colors={[AstroColors.brandLight, AstroColors.brandDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.book, AstroShadow.card]}
        >
          <Text style={styles.bookText}>Book Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    minHeight: MIN_TOUCH - 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  pillLiked: {
    backgroundColor: AstroColors.dangerTint,
    borderColor: AstroColors.dangerTint,
  },
  count: { ...AstroType.caption, fontWeight: "800", color: AstroColors.ink },
  book: {
    minHeight: MIN_TOUCH - 4,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: AstroRadius.pill,
  },
  bookText: { ...AstroType.button, color: AstroColors.onBrand },
});
