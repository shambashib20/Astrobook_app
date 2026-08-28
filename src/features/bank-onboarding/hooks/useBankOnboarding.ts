import { useMutation } from "@tanstack/react-query";
import { bankOnboardingService } from "../services";
import type { BankOnboardingPayload } from "../types";

export function useSubmitBankOnboarding(onSuccess?: () => void) {
  const mutation = useMutation({
    mutationFn: (payload: BankOnboardingPayload) =>
      bankOnboardingService.submit(payload),
    onSuccess: () => onSuccess?.(),
  });

  return {
    submit: (payload: BankOnboardingPayload) =>
      mutation.mutateAsync(payload).catch(() => undefined),
    loading: mutation.isPending,
    error: mutation.error as any,
  };
}
