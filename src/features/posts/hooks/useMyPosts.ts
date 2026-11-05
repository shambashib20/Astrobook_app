import { queryKeys } from "@/lib/queryClient";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { Alert } from "react-native";
import { postsService } from "../services/posts.service";
import type { Post } from "../types/post.types";

const PAGE = 12;

// Astrologer ke apne posts — infinite scroll (newest first).
export function useMyPostsList() {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.posts.myPosts,
    queryFn: ({ pageParam }) => postsService.getMyPosts(PAGE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.length === PAGE ? all.length * PAGE : undefined,
  });

  // Offset pagination + naye post ke beech duplicate ban sakta hai → id se dedupe
  const posts = useMemo(() => {
    const seen = new Set<string>();
    const out: Post[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const p of page) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
    }
    return out;
  }, [query.data]);

  const remove = useMutation({
    mutationFn: (id: string) => postsService.deletePost(id),
    onSuccess: (_d, id) => {
      qc.setQueryData<InfiniteData<Post[], number>>(
        queryKeys.posts.myPosts,
        (old) =>
          old
            ? { ...old, pages: old.pages.map((pg) => pg.filter((p) => p.id !== id)) }
            : old,
      );
      qc.invalidateQueries({ queryKey: queryKeys.posts.feed });
    },
    onError: () => Alert.alert("Error", "Failed to delete post"),
  });

  return {
    posts,
    loading: query.isPending,
    error: query.isError,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    loadingMore: query.isFetchingNextPage,
    refresh: () => query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    deletePost: (id: string) => remove.mutate(id),
  };
}

/** Naya post bana / badla — dono lists ko fresh karo */
export function useInvalidatePosts() {
  const qc = useQueryClient();
  return (postId?: string) => {
    if (postId) qc.invalidateQueries({ queryKey: queryKeys.posts.byId(postId) });
    qc.invalidateQueries({ queryKey: queryKeys.posts.myPosts });
    qc.invalidateQueries({ queryKey: queryKeys.posts.feed });
  };
}
