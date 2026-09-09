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

// ─── Single step — creates/updates the Cashfree Easy Split vendor ────────────
// Replaces the old two-hook Razorpay Route flow (useSubmitBankOnboarding +
// useSubmitBankDetails, commented out below) — Cashfree collects
// business/KYC + bank-or-UPI in one call, so there's only one step now.

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
            cashfreeVendorId: account.vendorId,
            cashfreeVendorStatus: account.status,
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

// ── useSubmitBankDetails (Razorpay Route's second step) — commented out
// during the Cashfree migration, kept for rollback:
// export function useSubmitBankDetails(onSuccess?: () => void) { ... }
