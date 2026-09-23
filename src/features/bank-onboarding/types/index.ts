// Payout details — where the platform should send an astrologer's manual
// payout. No Razorpay Route / linked accounts: every customer payment lands
// in the platform's own Razorpay account and astrologers are paid out
// manually after reconciliation. Mirrors SavePayoutDetailsSchema on the backend.

export type PayoutBankDetails = {
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
};

export type PayoutUpiDetails = {
  vpa: string;
  beneficiaryName: string;
};

// Exactly one of `bank` / `upi`.
export type BankOnboardingPayload = {
  contactName: string;
  phone: string;
  pan: string;
  bank?: PayoutBankDetails;
  upi?: PayoutUpiDetails;
};

// Masked summary the backend sends back (account number / PAN show only
// their last 4 characters).
export type PayoutSummary = {
  method: "bank" | "upi";
  contactName: string;
  beneficiaryName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  vpa: string | null;
  pan: string;
  updatedAt: string | null;
};
