import { apiClient } from "@/services/apiClient";
import type { BankOnboardingPayload, PayoutSummary } from "../types";

class BankOnboardingService {
  private readonly base = "/users/me/bank-onboarding";

  // NOTE: /users/me/bank-onboarding returns a raw object — {message, payout}
  // — NOT the {success, data} envelope apiClient's generic type assumes.
  // apiClient already unwraps to the response body, so `res` here IS
  // {message, payout}. Same raw-response pattern as payment/service and
  // cart/service.
  async submit(
    payload: BankOnboardingPayload,
  ): Promise<{ message?: string; payout: PayoutSummary }> {
    const res = await apiClient.post<{
      message?: string;
      payout: PayoutSummary;
    }>(this.base, payload);
    return res as unknown as { message?: string; payout: PayoutSummary };
  }
}

export const bankOnboardingService = new BankOnboardingService();
