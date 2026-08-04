export type AstrologerApplicationStatus = {
  hasApplied: boolean;
  verificationStatus: "pending" | "approved" | "rejected" | null;
  rejectionReason: string | null;
};

export type SubmitAstrologerApplicationPayload = {
  bio: string;
  experience: number;
  languages: string[];
  specializations: string[];
  videoUrl: string;
  document1Url: string;
  document2Url: string;
};