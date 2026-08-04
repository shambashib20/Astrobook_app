import { astrologersService } from "@/features/astrologer/services";
import { useRef, useState } from "react";
import { postsService } from "../services/posts.service";
import type { Post } from "../types/post.types";

const PAGE_SIZE = 10;

// Backend ab `posts` feed/detail query mein `users` table join karke
// astrologerName + astrologerAvatar (real photo URL) seedha bhej deta hai —
// yeh function ab SIRF basicServiceId ke liye zaroori hai (Feed ke "Book
// Now" button ke liye, kyunki post.linkedServiceId kabhi set nahi hota).
// Naam/avatar ko yahan se overwrite NAHI karna — backend ka data hi sahi/
// fresh hai, cache wala emoji purana tha aur real photo ko clobber kar
// deta tha.
const astrologerCache = new Map<
  string,
  { name: string; basicServiceId: string | null }
>();

async function enrichWithAstrologers(posts: Post[]): Promise<Post[]> {
  const uniqueIds = Array.from(
    new Set(
      posts.map((p) => p.astrologerId).filter((id) => !astrologerCache.has(id)),
    ),
  );
  if (uniqueIds.length > 0) {
    const fetched = await Promise.all(
      uniqueIds.map((id) =>
        Promise.all([
          astrologersService.getById(id).catch(() => null),
          astrologersService.getServices(id).catch(() => []),
        ]),
      ),
    );
    fetched.forEach(([a, services], i) => {
      const basic = services?.find((s) => s.isBasic) ?? null;
      astrologerCache.set(uniqueIds[i]!, {
        name: a?.name ?? "Astrologer",
        basicServiceId: basic?.id ?? null,
      });
    });
  }
  return posts.map((p) => ({
    ...p,
    // Backend se already aaya naam/avatar hi priority — cache sirf fallback
    astrologerName:
      p.astrologerName ?? astrologerCache.get(p.astrologerId)?.name ?? "Astrologer",
    astrologerAvatar: p.astrologerAvatar,
    basicServiceId: astrologerCache.get(p.astrologerId)?.basicServiceId ?? null,
  }));
}

// ─── useFeedPosts ────────────────────────────────────────────────────────────
// Home feed — sabke posts, infinite scroll ke saath, astrologer info enriched

export function useFeedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    offsetRef.current = 0;
    try {
      const { posts: data, hasMore: more } = await postsService.getAll(
        PAGE_SIZE,
        0,
      );
      const enriched = await enrichWithAstrologers(data);
      setPosts(enriched);
      setHasMore(more);
      offsetRef.current = data.length;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Feed load nahi hua");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // FlatList ke onEndReached se call hota hai — agla page laata hai
  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const { posts: data, hasMore: more } = await postsService.getAll(
        PAGE_SIZE,
        offsetRef.current,
      );
      const enriched = await enrichWithAstrologers(data);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...enriched.filter((p) => !existingIds.has(p.id))];
      });
      setHasMore(more);
      offsetRef.current += data.length;
    } catch {
      // Silent fail on load-more — user scroll ruk jayega, refresh se retry
    } finally {
      setLoadingMore(false);
    }
  };

  // Single post ko locally update karo (jaise like/unlike ke baad) — bina
  // poora feed refetch kiye
  const updatePost = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
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
      const enriched = await enrichWithAstrologers(data);
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
      const enriched = await enrichWithAstrologers(data);
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
      const enrichedDetail = (await enrichWithAstrologers([detail]))[0]!;
      setPost(enrichedDetail);

      // "More posts by same astrologer" — pehle generic getAll se aa raha
      // tha (random posts), ab specifically usi astrologer ke posts
      const sameAstrologer = await postsService.getByAstrologer(
        detail.astrologerId,
      );
      const related = sameAstrologer.filter((p) => p.id !== id).slice(0, 6);
      const enrichedRelated = await enrichWithAstrologers(related);
      setRelatedPosts(enrichedRelated);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Post load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  return { post, relatedPosts, loading, error, fetchPost };
}
