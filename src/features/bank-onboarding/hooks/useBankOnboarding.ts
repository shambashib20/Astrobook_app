import { queryKeys } from "@/lib/queryClient";
import type { UserProfile } from "@/features/users/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { bankOnboardingService } from "../services";
import type { BankDetailsPayload, BankOnboardingPayload } from "../types";

function extractErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.[0]?.message ||
    fallback
  );
}

// ─── Step 1 — creates the Razorpay account + Route product ───────────────────

export function useSubmitBankOnboarding(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: BankOnboardingPayload) =>
      bankOnboardingService.submit(payload),
    onSuccess: ({ account }) => {
      // Merge straight into the shared profile cache — the wizard reads its
      // resume step off this, so it advances immediately without a refetch,
      // and stays correct if the user backs out and reopens the screen later.
      queryClient.setQueryData<UserProfile | undefined>(
        queryKeys.profile.me,
        (prev) =>
          prev && {
            ...prev,
            razorpayAccountId: account.id,
            razorpayAccountStatus: account.status,
            razorpayProductId: account.productId,
            razorpayProductStatus: account.productStatus,
          },
      );
      onSuccess?.();
    },
    onError: (err: any) => {
      Alert.alert(
        "Error",
        extractErrorMessage(err, "Bank onboarding could not be started"),
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

// ─── Step 2 — submits payout (settlement) bank account details ──────────────

export function useSubmitBankDetails(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: BankDetailsPayload) =>
      bankOnboardingService.submitBankDetails(payload),
    onSuccess: ({ product }) => {
      queryClient.setQueryData<UserProfile | undefined>(
        queryKeys.profile.me,
        (prev) =>
          prev && {
            ...prev,
            razorpayProductId: product.productId,
            razorpayProductStatus: product.status,
          },
      );
      onSuccess?.();
    },
    onError: (err: any) => {
      Alert.alert(
        "Error",
        extractErrorMessage(err, "Bank details could not be saved"),
      );
    },
  });

  return {
    submit: (payload: BankDetailsPayload) =>
      mutation.mutateAsync(payload).catch(() => undefined),
    loading: mutation.isPending,
    error: mutation.error as any,
  };
}
