// ── Razorpay Route types (commented out during the Cashfree migration —
// kept, not deleted, for a quick rollback) ──
// export type BankOnboardingAddress = { street1: string; street2: string; city: string; state: string; postalCode: string; country: string };
// export type BankDocumentType = "business_proof_url" | "business_pan_url" | "cancelled_cheque" | "shop_establishment_certificate" | "gst_certificate" | "msme_certificate" | "form_12_a_url" | "form_80g_url";
// export type BankDocument = { url: string; type: BankDocumentType };
// export type BankOnboardingPayload = { email: string; phone: string; legalBusinessName: string; contactName: string; businessType: string; category: string; subcategory: string; address: BankOnboardingAddress; pan: string; documents?: BankDocument[] };
// export type RazorpayRequirement = { field_reference: string; resolution_url?: string; reason_code: string; status: string };
// export type RazorpayAccountResult = { id: string; status: string | null; referenceId: string | null; productId: string | null; productStatus: string | null; requirements?: RazorpayRequirement[]; stakeholderId?: string | null; documentsUploaded?: string[]; alreadyExists: boolean };
// export type BankDetailsPayload = { accountNumber: string; ifscCode: string; beneficiaryName: string };
// export type BankDetailsResult = { productId: string; status: string; requirements?: RazorpayRequirement[] };

// Mirrors CashfreeBusinessCategorySchema on the backend — Cashfree
// validates kyc_details.business_type against this FIXED enum (confirmed
// against the sandbox: free text like "Astrology Consulting" is rejected
// with INVALID_REQUEST_TYPE).
export type CashfreeBusinessCategory =
  | 'Grocery'
  | 'Jewellery'
  | 'Miscellaneous'
  | 'Web host/Domain seller'
  | 'E-commerce'
  | 'Online Gaming'
  | 'Society/Trust/Club/Association'
  | 'Mutual funds/Broking'
  | 'B2B'
  | 'Real Estate'
  | 'Housing'
  | 'Rentals'
  | 'Utilities'
  | 'Travel and Hospitality'
  | 'Education'
  | 'Food and Beverages'
  | 'NBFCs/Organizations into Lending'
  | 'Chit Funds'
  | 'Non Profit/NGO'
  | 'Financial Services'
  | 'Government'
  | 'Readymade'
  | 'SaaS'
  | 'Professional Services (Doctors, Lawyers, Architects, CAs, and other Professionals)'
  | 'Open and Semi Open Wallet'
  | 'Social Media and Entertainment'
  | 'Pan shop'
  | 'Telecom'
  | 'Digital Goods'
  | 'Insurance'
  | 'Pharmacy'
  | 'Healthcare'
  | 'Retail and Shopping'
  | 'Gaming'
  | 'Logistics';

// Mirrors CashfreeAccountTypeSchema on the backend.
export type CashfreeAccountType =
  | "Individual"
  | "Proprietorship"
  | "Partnership"
  | "LLP"
  | "Private Limited"
  | "Public Limited"
  | "Trust"
  | "NGO"
  | "Society"
  | "Other";

// Mirrors CashfreeDocumentTypeSchema on the backend.
export type BankDocumentType =
  | "pan_card"
  | "gst_certificate"
  | "cancelled_cheque"
  | "business_proof"
  | "id_proof";

export type BankDocument = {
  url: string;
  type: BankDocumentType;
};

export type CashfreeBankDetails = {
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
};

export type CashfreeUpiDetails = {
  vpa: string;
  beneficiaryName: string;
};

// Single call — business/KYC + bank-OR-UPI all together (Cashfree collapses
// what used to be Razorpay Route's 3-step wizard into one step).
export type BankOnboardingPayload = {
  email: string;
  phone: string;
  contactName: string;
  accountType: CashfreeAccountType;
  businessCategory: CashfreeBusinessCategory;
  pan: string;
  gst?: string;
  bank?: CashfreeBankDetails;
  upi?: CashfreeUpiDetails;
  // Optional — omit on the first call and re-submit once files are
  // uploaded; vendor creation itself doesn't need to wait on documents.
  documents?: BankDocument[];
};

// What Cashfree still needs before the vendor can activate.
export type CashfreeVendorRequirement = {
  field_reference: string;
  reason_code: string;
  status: string;
};

export type CashfreeVendorResult = {
  vendorId: string;
  status: string | null;
  requirements?: CashfreeVendorRequirement[];
  documentsUploaded?: string[];
  alreadyExists: boolean;
};
