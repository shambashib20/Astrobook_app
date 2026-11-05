import UserAvatar from "@/components/UserAvatar";
import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { useUser } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MyPostRow from "../components/MyPostRow";
import PostComposer from "../components/PostComposer";
import { useMyPostsList } from "../hooks/useMyPosts";
import type { Post } from "../types/post.types";

// Astrologer ke apne posts: upar "Kuch share karo" prompt + "Naya" button
// (dono composer kholte hain), neeche infinite list.
export default function MyPostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useUser();
  const { profile } = useMyProfile();
  const list = useMyPostsList();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | undefined>();

  const openPost = useCallback(
    (p: Post) =>
      router.push({ pathname: "/(user)/post/[id]" as any, params: { id: p.id } }),
    [router],
  );

  const confirmDelete = useCallback(
    (p: Post) =>
      Alert.alert("Delete Post?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => list.deletePost(p.id) },
      ]),
    [list.deletePost],
  );

  const openComposer = () => {
    setEditing(undefined);
    setComposerOpen(true);
  };
  const openEdit = useCallback((p: Post) => {
    setEditing(p);
    setComposerOpen(true);
  }, []);

  const Prompt = (
    <TouchableOpacity
      style={[styles.prompt, AstroShadow.soft]}
      activeOpacity={0.85}
      onPress={openComposer}
      accessibilityLabel="Naya post banao"
    >
      <UserAvatar
        uri={profile?.avatarUrl ?? me?.avatarUrl}
        name={profile?.name ?? me?.name}
        id={me?.id}
        size={40}
      />
      <Text style={styles.promptText}>Kuch share karo…</Text>
      <Feather name="image" size={20} color={AstroColors.brand} />
      <Feather name="video" size={20} color={AstroColors.brand} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header — status bar ke neeche, light theme */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.back}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(astrologer)/dashboard" as any)
          }
          accessibilityLabel="Wapas"
        >
          <Feather name="arrow-left" size={20} color={AstroColors.brand} />
        </TouchableOpacity>
        <View style={styles.titles}>
          <Text style={styles.title}>My Posts</Text>
          <Text style={styles.subtitle}>Apni cosmic wisdom share karo</Text>
        </View>
        <TouchableOpacity onPress={openComposer} activeOpacity={0.85} accessibilityLabel="Naya post">
          <LinearGradient
            colors={[AstroColors.brandLight, AstroColors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newBtn}
          >
            <Feather name="plus" size={16} color={AstroColors.onBrand} />
            <Text style={styles.newText}>Naya</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {list.loading ? (
        <ActivityIndicator color={AstroColors.brand} style={styles.loader} />
      ) : list.error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={30} color={AstroColors.danger} />
          <Text style={styles.emptyText}>Posts load nahi hue</Text>
          <TouchableOpacity style={styles.retry} onPress={list.refresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={list.posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <MyPostRow
              post={item}
              onOpen={openPost}
              onEdit={openEdit}
              onDelete={confirmDelete}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHead}>
              {Prompt}
              {list.posts.length > 0 ? (
                <Text style={styles.sectionLabel}>Tumhare posts</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="edit-3" size={30} color={AstroColors.brand} />
              </View>
              <Text style={styles.emptyTitle}>Abhi koi post nahi hai</Text>
              <Text style={styles.emptyText}>
                Apna pehla post banao — followers ko tumhari baat milegi.
              </Text>
            </View>
          }
          ListFooterComponent={
            list.loadingMore ? (
              <ActivityIndicator color={AstroColors.brand} style={styles.footer} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              colors={[AstroColors.brand]}
              tintColor={AstroColors.brand}
            />
          }
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <PostComposer
        key={editing?.id ?? "new"}
        visible={composerOpen}
        editing={editing}
        onClose={() => setComposerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: AstroColors.canvasHeader,
  },
  back: {
    width: MIN_TOUCH - 4,
    height: MIN_TOUCH - 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.brandTint,
  },
  titles: { flex: 1 },
  title: { ...AstroType.title, color: AstroColors.ink },
  subtitle: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 2 },
  newBtn: {
    height: 40,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: AstroRadius.pill,
  },
  newText: { ...AstroType.button, color: AstroColors.onBrand },

  listHead: { paddingTop: 16, gap: 16 },
  prompt: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.surface,
  },
  promptText: { flex: 1, ...AstroType.body, color: AstroColors.textMuted },
  sectionLabel: {
    ...AstroType.heading,
    color: AstroColors.ink,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  loader: { marginTop: 48 },
  footer: { marginVertical: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  empty: { alignItems: "center", gap: 8, paddingHorizontal: 32, paddingTop: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.brandTint,
    marginBottom: 4,
  },
  emptyTitle: { ...AstroType.heading, color: AstroColors.ink },
  emptyText: { ...AstroType.body, color: AstroColors.textSecondary, textAlign: "center" },
  retry: {
    minHeight: MIN_TOUCH,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brand,
  },
  retryText: { ...AstroType.button, color: AstroColors.onBrand },
});
