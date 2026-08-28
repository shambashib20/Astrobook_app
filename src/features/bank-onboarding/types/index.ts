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
