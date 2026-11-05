import { queryKeys } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { kundliService, type GenerateKundliPayload } from "../services";

// ─── useMyKundli ─────────────────────────────────────────────────────────────
// User ka Kundli fetch karo — null aata hai agar abhi generate nahi hua.

export function useMyKundli() {
  const query = useQuery({
    queryKey: queryKeys.kundli.me,
    queryFn: () => kundliService.getMyKundli(),
    // Kundli rarely change hota hai — 10 min stale time
    staleTime: 10 * 60 * 1000,
    retry: (failCount, err: any) => {
      // 404 pe retry mat karo
      if (err?.response?.status === 404) return false;
      return failCount < 2;
    },
  });

  return {
    kundli: query.data ?? null,
    loading: query.isLoading,
    refetch: () => query.refetch(),
  };
}

// ─── useGenerateKundli ────────────────────────────────────────────────────────
// "Generate My Kundli" button — Kundlit API call trigger karta hai.
// Success pe cache update + onSuccess callback.

export function useGenerateKundli(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload?: GenerateKundliPayload) =>
      kundliService.generateKundli(payload),
    onSuccess: (kundli) => {
      // Cache mein fresh data daal do
      queryClient.setQueryData(queryKeys.kundli.me, kundli);
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to generate Kundli — please try again";
      Alert.alert("Error", msg);
    },
  });

  return {
    generate: (payload?: GenerateKundliPayload) =>
      mutation.mutateAsync(payload).catch(() => undefined),
    loading: mutation.isPending,
  };
}

// ─── useKundliVisibility ──────────────────────────────────────────────────────
// Public/private toggle

export function useKundliVisibility() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      kundliService.updateVisibility(isPublic),
    onSuccess: (result) => {
      // Cache mein visibility update karo
      queryClient.setQueryData(queryKeys.kundli.me, (old: any) =>
        old
          ? { ...old, isPublic: result.isPublic, shareToken: result.shareToken, shareUrl: result.shareUrl }
          : old,
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to update visibility";
      Alert.alert("Error", msg);
    },
  });

  return {
    updateVisibility: (isPublic: boolean) =>
      mutation.mutateAsync(isPublic).catch(() => undefined),
    loading: mutation.isPending,
  };
}
