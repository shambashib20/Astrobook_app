import { toast } from "@/components/toast";
import { queryKeys } from "@/lib/queryClient";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { reviewsService } from "../service";
import type { SubmitReviewInput } from "../types";

const PAGE_SIZE = 10;

// Astrologer profile ka reviews section — "Aur dikhao" pe agla page
export function useAstrologerReviews(astrologerId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.reviews.forAstrologer(astrologerId ?? "none"),
    queryFn: ({ pageParam }) =>
      reviewsService.listForAstrologer(astrologerId!, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.reviews.length, 0);
      return loaded < last.summary.total && last.reviews.length > 0
        ? loaded
        : undefined;
    },
    enabled: !!astrologerId,
  });

  const pages = query.data?.pages ?? [];
  return {
    summary: pages[0]?.summary ?? null,
    reviews: pages.flatMap((p) => p.reviews),
    loading: query.isLoading,
    error: query.isError,
    hasMore: !!query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => query.fetchNextPage(),
    refetch: query.refetch,
  };
}

// Meri reviews — appointmentId se map (sirf user ke liye enable karo)
export function useMyReviews(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.reviews.mine,
    queryFn: () => reviewsService.listMine(),
    enabled,
  });
  const byAppointment = new Map(
    (query.data ?? []).map((r) => [r.appointmentId, r] as const),
  );
  return { byAppointment, loading: query.isLoading };
}

// Rating badalte hi astrologer ki average/count badalti hai — isliye detail,
// list aur favourites (jisme astrologer card hai) sab refresh hote hain.
function useInvalidateAfterReview() {
  const qc = useQueryClient();
  return (astrologerId: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.reviews.mine });
    qc.invalidateQueries({
      queryKey: queryKeys.reviews.forAstrologer(astrologerId),
    });
    qc.invalidateQueries({ queryKey: queryKeys.astrologer.detail(astrologerId) });
    qc.invalidateQueries({ queryKey: queryKeys.astrologers.all });
    qc.invalidateQueries({ queryKey: ["favorites", "list", "astrologer"] });
  };
}

export function useSubmitReview() {
  const invalidate = useInvalidateAfterReview();
  return useMutation({
    mutationFn: (v: SubmitReviewInput) =>
      reviewsService.submit(v.appointmentId, v.rating, v.comment),
    onSuccess: (_r, v) => {
      invalidate(v.astrologerId);
      toast.show("Review submitted — thank you!", "success");
    },
    onError: (err: any) =>
      toast.show(
        err?.response?.data?.message || "Failed to submit review",
        "error",
      ),
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidateAfterReview();
  return useMutation({
    mutationFn: (v: { appointmentId: string; astrologerId: string }) =>
      reviewsService.remove(v.appointmentId),
    onSuccess: (_r, v) => {
      invalidate(v.astrologerId);
      toast.show("Review removed", "success");
    },
    onError: (err: any) =>
      toast.show(
        err?.response?.data?.message || "Failed to remove review",
        "error",
      ),
  });
}
