import AppBottomSheet from "@/components/AppBottomSheet";
import { AstroColors, AstroType } from "@/constants/astro-theme";
import { useUser } from "@/features/auth/store/auth.store";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useAddComment,
  useDeleteComment,
  usePostComments,
} from "../hooks/usePostDetail";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";

// Post ke comments ka bottom sheet. Data tabhi fetch hota hai jab sheet khule.
export default function CommentsSheet({
  postId,
  visible,
  totalCount,
  focusInput,
  onClose,
}: {
  postId: string;
  visible: boolean;
  totalCount: number;
  /** "Comment likho" box se khola to input turant focus ho */
  focusInput: boolean;
  onClose: () => void;
}) {
  const me = useUser();
  const insets = useSafeAreaInsets();
  const { comments, loading, error, loadingMore, loadMore, refetch } =
    usePostComments(postId, visible);
  const addComment = useAddComment(postId);
  const deleteComment = useDeleteComment(postId);

  const submit = async (text: string) => {
    try {
      await addComment.mutateAsync(text);
      return true;
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to post comment",
      );
      return false;
    }
  };

  const remove = (id: string) =>
    deleteComment.mutate(id, {
      onError: (err: any) =>
        Alert.alert(
          "Error",
          err?.response?.data?.message || "Failed to remove comment",
        ),
    });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={totalCount > 0 ? `Comments · ${totalCount}` : "Comments"}
    >
      {(kb) => (
        <>
          <CommentComposer
            avatarUri={me?.avatarUrl}
            name={me?.name}
            userId={me?.id}
            posting={addComment.isPending}
            autoFocus={visible && focusInput}
            onSubmit={submit}
          />

          <FlatList
            style={styles.list}
            data={comments}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                canDelete={!!me && item.userId === me.id}
                onDelete={remove}
              />
            )}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator
                  color={AstroColors.brand}
                  style={styles.pad}
                />
              ) : error ? (
                <View style={styles.empty}>
                  <Feather
                    name="alert-circle"
                    size={26}
                    color={AstroColors.danger}
                  />
                  <Text style={styles.emptyText}>Comments load nahi hue</Text>
                  <Text style={styles.retry} onPress={() => refetch()}>
                    Try Again
                  </Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Feather
                    name="message-circle"
                    size={28}
                    color={AstroColors.offline}
                  />
                  <Text style={styles.emptyText}>
                    Sabse pehle comment karo!
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={AstroColors.brand}
                  style={styles.pad}
                />
              ) : null
            }
            contentContainerStyle={[
              styles.content,
              { paddingBottom: kb.open ? kb.height + 24 : insets.bottom + 16 },
            ]}
          />
        </>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingVertical: 6, flexGrow: 1 },
  pad: { paddingVertical: 24 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyText: { ...AstroType.body, color: AstroColors.textSecondary },
  retry: { ...AstroType.body, fontWeight: "800", color: AstroColors.brand },
});
