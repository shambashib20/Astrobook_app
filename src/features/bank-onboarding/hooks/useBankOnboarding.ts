import { queryKeys } from "@/lib/queryClient";
import type { UserProfile } from "@/features/users/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { bankOnboardingService } from "../services";
import type { BankOnboardingPayload } from "../types";

function extractErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.[0]?.message ||
    fallback
  );
}

// ─── Save payout details (bank or UPI) ────────────────────────────────────────
// Stored in our own DB for manual payouts — no Razorpay Route involved.

export function useSubmitBankOnboarding(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: BankOnboardingPayload) =>
      bankOnboardingService.submit(payload),
    onSuccess: ({ payout }) => {
      // Merge straight into the shared profile cache — the screen shows the
      // "done" state off profile.payoutMethod, so it flips immediately
      // without a refetch.
      queryClient.setQueryData<UserProfile | undefined>(
        queryKeys.profile.me,
        (prev) => prev && { ...prev, payoutMethod: payout.method },
      );
      onSuccess?.();
    },
    onError: (err: any) => {
      Alert.alert(
        "Error",
        extractErrorMessage(err, "Payout details could not be saved"),
      );
    },
  });

  return {
    submit: (payload: BankOnboardingPayload) =>
      mutation.mutateAsync(payload).catch(() => undefined),
    loading: mutation.isPending,
    error: mutation.error as any,
  };
}
