export type MediaType = "IMAGE" | "VIDEO" | "TEXT";

export type Post = {
  id: string;
  astrologerId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: MediaType;
  linkedServiceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Joined fields (baad mein)
  astrologerName?: string;
  astrologerAvatar?: string;
  // Client-side enriched — astrologer ki Basic consultancy ka id, "Book Now"
  // button ke liye (linkedServiceId set nahi hota abhi post-creation UI se,
  // isliye Feed ka Book button hamesha Basic consultancy ko represent karta hai)
  basicServiceId?: string | null;
};

export type CreatePostPayload = {
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  linkedServiceId?: string;
  tags?: string[];
};

export type ImageKitAuthToken = {
  token: string;
  expire: number;
  signature: string;
};
