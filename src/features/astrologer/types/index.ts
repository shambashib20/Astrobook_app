// Matches backend AstrologerResponseSchema
// (server/src/modules/astrologers/schemas/astrologer.schema.ts)

export type AstrologerMeta = {
  speciality: string;
  exp: string;
  rating: number;
  reviews: number;
  languages: string;
  emoji: string;
  online: boolean;
  price?: number;
  about?: string;
};

export type AstrologerProfile = {
  id: string;
  name: string;
  phone: string | null;
  // Real uploaded profile photo — pehle backend isko strip kar deta tha
  avatarUrl: string | null;
  interests: string[] | null;
  meta: AstrologerMeta | null;
  isOnboarded: boolean;
  createdAt: string;
};

export type AstrologerSlot = {
  date: string;
  startTime: string;
  endTime: string;
};
