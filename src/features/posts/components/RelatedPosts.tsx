import { AstroColors, AstroType } from "@/constants/astro-theme";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Post } from "../types/post.types";
import ProfilePostTile from "./ProfilePostTile";

const H_PAD = 16;
const GAP = 12;

// "Aur posts" — max 3 tiles ek row me (backend se already same-category + limit 3)
export default function RelatedPosts({
  posts,
  onOpen,
}: {
  posts: Post[];
  onOpen: (post: Post) => void;
}) {
  const { width } = useWindowDimensions();
  if (posts.length === 0) return null;

  const tile = Math.floor((width - H_PAD * 2 - GAP * 2) / 3);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>View more posts</Text>
      <View style={styles.row}>
        {posts.slice(0, 3).map((p) => (
          <ProfilePostTile
            key={p.id}
            post={p}
            width={tile}
            showAuthor
            onPress={() => onOpen(p)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24, paddingHorizontal: H_PAD },
  title: { ...AstroType.heading, color: AstroColors.ink, marginBottom: 12 },
  row: { flexDirection: "row", gap: GAP },
});
