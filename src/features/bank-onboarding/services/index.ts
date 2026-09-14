import { apiClient } from "@/services/apiClient";
import type { BankOnboardingPayload, CashfreeVendorResult } from "../types";

class BankOnboardingService {
  private readonly base = "/users/me/bank-onboarding";

  // NOTE: /users/me/bank-onboarding returns a raw object — {message,
  // account} — NOT the {success, data} envelope apiClient's generic type
  // assumes. apiClient.post() already unwraps to the response body itself
  // (see apiClient.ts: `return res.data` inside the client), so `res` HERE
  // already IS {message, account} — a further `.data` was reading a
  // property that doesn't exist, silently resolving to `undefined` on
  // every successful call. That undefined then blew up the `{ account }`
  // destructure in useSubmitBankOnboarding's onSuccess, which is what
  // actually produced the "Bank onboarding could not be started" alert —
  // even though the request had already succeeded server-side. Same
  // raw-response pattern as payment/service and cart/service.
  async submit(
    payload: BankOnboardingPayload,
  ): Promise<{ message?: string; account: CashfreeVendorResult }> {
    const res = await apiClient.post<{
      message?: string;
      account: CashfreeVendorResult;
    }>(this.base, payload);
    return res as unknown as { message?: string; account: CashfreeVendorResult };
  }

  // submitBankDetails (POST /users/me/bank-onboarding/bank-details) —
  // commented out: Cashfree collects bank/UPI in the same call as submit()
  // above, so this second step no longer exists. Kept for rollback:
  // async submitBankDetails(payload: BankDetailsPayload) { ... }
}

export const bankOnboardingService = new BankOnboardingService();
