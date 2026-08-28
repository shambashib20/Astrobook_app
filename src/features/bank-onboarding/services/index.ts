import { apiClient } from "@/services/apiClient";
import type { BankOnboardingPayload } from "../types";

class BankOnboardingService {
  private readonly base = "/users/me/bank-onboarding";

  async submit(payload: BankOnboardingPayload): Promise<{ message?: string }> {
    const res = await apiClient.post<{ message?: string }>(this.base, payload);
    return res.data;
  }
}

export const bankOnboardingService = new BankOnboardingService();
