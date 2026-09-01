export type BankOnboardingAddress = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type BankOnboardingPayload = {
  email: string;
  phone: string;
  legalBusinessName: string;
  contactName: string;
  businessType: string;
  category: string;
  subcategory: string;
  address: BankOnboardingAddress;
};

export type RazorpayAccountResult = {
  id: string;
  status: string | null;
  referenceId: string | null;
  productId: string | null;
  productStatus: string | null;
  requirements?: unknown[];
  alreadyExists: boolean;
};

export type BankDetailsPayload = {
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
};

export type BankDetailsResult = {
  productId: string;
  status: string;
  requirements?: unknown[];
};
