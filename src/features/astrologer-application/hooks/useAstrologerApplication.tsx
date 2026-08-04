import { queryKeys } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { astrologerApplicationService } from "../services";
import type { SubmitAstrologerApplicationPayload } from "../types";

// ─── useAstrologerApplicationStatus ────────────────────────────────────────
// Profile screen isse decide karta hai: "Upgrade to Astrologer" button
// dikhana hai, "Under review" dikhana hai, ya rejection reason ke saath
// dobara try karne dena hai.

export function useAstrologerApplicationStatus(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.astrologerApplication.status,
    queryFn: () => astrologerApplicationService.getStatus(),
    enabled,
  });

  return {
    status: query.data ?? null,
    loading: query.isLoading,
    refetch: () => query.refetch(),
  };
}

// ─── useSubmitAstrologerApplication ────────────────────────────────────────

export function useSubmitAstrologerApplication(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: SubmitAstrologerApplicationPayload) =>
      astrologerApplicationService.submit(payload),
    onSuccess: () => {
      // Status turant "pending" reflect ho jaaye — turant refetch karke
      // profile screen ka button/state consistent rahe.
      queryClient.invalidateQueries({
        queryKey: queryKeys.astrologerApplication.status,
      });
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Application submit nahi hui, dobara try karo";
      Alert.alert("Error", msg);
    },
  });

  return {
    submit: (payload: SubmitAstrologerApplicationPayload) =>
      mutation.mutateAsync(payload).catch(() => undefined),
    loading: mutation.isPending,
  };
}