import { apiClient } from "@/services/apiClient";
import type {
  BankDetailsPayload,
  BankDetailsResult,
  BankOnboardingPayload,
  RazorpayAccountResult,
} from "../types";

class BankOnboardingService {
  private readonly base = "/users/me/bank-onboarding";

  async submit(
    payload: BankOnboardingPayload,
  ): Promise<{ message?: string; account: RazorpayAccountResult }> {
    const res = await apiClient.post<{
      message?: string;
      account: RazorpayAccountResult;
    }>(this.base, payload);
    return res.data;
  }

  async submitBankDetails(
    payload: BankDetailsPayload,
  ): Promise<{ message?: string; product: BankDetailsResult }> {
    const res = await apiClient.post<{
      message?: string;
      product: BankDetailsResult;
    }>(`${this.base}/bank-details`, payload);
    return res.data;
  }
}

export const bankOnboardingService = new BankOnboardingService();
