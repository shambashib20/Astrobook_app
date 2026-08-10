import { queryKeys } from "@/lib/queryClient";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { postsService } from "../services/posts.service";
import type { Post } from "../types/post.types";

const PAGE_SIZE = 10;

// Backend ab `posts` query mein hi astrologerName/astrologerAvatar (users
// join) aur basicServiceId (correlated subquery) sab bhej deta hai — pehle
// yahan har unique astrologer ke liye alag getById()+getServices() call
// hota tha (N parallel Neon round trips per feed load), jo tab switch ko
// multiple seconds tak freeze kar deta tha. Ab kuch fetch hi nahi karna.
function enrichWithAstrologers(posts: Post[]): Post[] {
  return posts.map((p) => ({
    ...p,
    astrologerName: p.astrologerName ?? "Astrologer",
  }));
}

// ─── useFeedPosts ────────────────────────────────────────────────────────────
// Home feed — sabke posts, infinite scroll ke saath, astrologer info enriched
//
// Pehle plain useState+useEffect tha — har naye mount pe (chahe pehli baar ho
// ya screen kisi wajah se remount ho, jaise Fast Refresh) poora feed dobara
// fetch hota tha. Isliye tab-switch kabhi turant aata tha (screen mounted
// reh gaya) kabhi seconds leta tha (remount ho gaya) — same data, alag
// experience. React Query cache (queryKeys.posts.feed, 30s staleTime) ab
// component lifecycle se independent hai — revisit hamesha cache se turant
// aata hai, sirf pehli baar hi real network+DB round trip lagta hai.
export function useFeedPosts() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.posts.feed,
    queryFn: ({ pageParam }) => postsService.getAll(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
  });

  const posts = enrichWithAstrologers(
    query.data?.pages.flatMap((page) => page.posts) ?? [],
  );

  // Feed screen mount pe isse call karta hai — initial fetch useInfiniteQuery
  // khud handle karta hai, yahan sirf explicit pull-to-refresh ko forward
  // karna hai (warna mount pe double-fetch ho jaayega).
  const fetchFeed = (isRefresh = false) => {
    if (isRefresh) query.refetch();
  };

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  // Single post ko cache ke andar hi update karo (jaise like/unlike ke
  // baad) — bina poora feed refetch kiye
  const updatePost = (updated: Post) => {
    queryClient.setQueryData(queryKeys.posts.feed, (old: typeof query.data) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) => (p.id === updated.id ? updated : p)),
        })),
      };
    });
  };

  return {
    posts,
    loading: query.isPending,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    loadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ?? "Feed load nahi hua")
      : null,
    fetchFeed,
    loadMore,
    updatePost,
  };
}

// ─── useCategoryPosts ────────────────────────────────────────────────────────
// Explore category detail page — us tag ke posts, infinite scroll ke saath

export function useCategoryPosts(tag: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchPosts = async () => {
    if (!tag) return;
    setLoading(true);
    setError(null);
    offsetRef.current = 0;
    try {
      const { posts: data, hasMore: more } = await postsService.getByTag(
        tag,
        PAGE_SIZE,
        0,
      );
      const enriched = enrichWithAstrologers(data);
      setPosts(enriched);
      setHasMore(more);
      offsetRef.current = data.length;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Posts load nahi hue");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!tag || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const { posts: data, hasMore: more } = await postsService.getByTag(
        tag,
        PAGE_SIZE,
        offsetRef.current,
      );
      const enriched = enrichWithAstrologers(data);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...enriched.filter((p) => !existingIds.has(p.id))];
      });
      setHasMore(more);
      offsetRef.current += data.length;
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  return { posts, loading, loadingMore, hasMore, error, fetchPosts, loadMore };
}

// ─── useAstrologerPosts ──────────────────────────────────────────────────────
// Ek specific astrologer ke posts — profile page ke "Posts" section ke liye

export function useAstrologerPosts(astrologerId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    if (!astrologerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postsService.getByAstrologer(astrologerId);
      setPosts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Posts load nahi hue");
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, fetchPosts };
}

// ─── usePost ─────────────────────────────────────────────────────────────────
// Single post detail + kuch related posts (same feed se, current post chhodke)

export function usePost(id: string | undefined) {
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await postsService.getById(id);
      const enrichedDetail = enrichWithAstrologers([detail])[0]!;
      setPost(enrichedDetail);

      // "More posts by same astrologer" — pehle generic getAll se aa raha
      // tha (random posts), ab specifically usi astrologer ke posts
      const sameAstrologer = await postsService.getByAstrologer(
        detail.astrologerId,
      );
      const related = sameAstrologer.filter((p) => p.id !== id).slice(0, 6);
      const enrichedRelated = enrichWithAstrologers(related);
      setRelatedPosts(enrichedRelated);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Post load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  return { post, relatedPosts, loading, error, fetchPost };
}
