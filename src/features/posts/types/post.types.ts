export type MediaType = "IMAGE" | "VIDEO" | "TEXT";

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
};

export type Post = {
  id: string;
  astrologerId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: MediaType;
  // TEXT posts ke liye — astrologer khud choose karta hai (auto-hash nahi hai ab)
  bgColor: string | null;
  textColor: string | null;
  // VIDEO posts ke liye
  durationSeconds: number | null;
  // IMAGE posts ke liye — optional SINGLE draggable text sticker
  stickerText: string | null;
  stickerX: string | null; // "0" se "1" tak, string kyunki numeric column hai
  stickerY: string | null;
  stickerTextColor: string | null;
  stickerBgColor: string | null;
  linkedServiceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Backend se enriched (ab real hai, mock nahi)
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isFollowedByMe?: boolean;
  // Joined fields (baad mein)
  astrologerName?: string;
  astrologerAvatar?: string;
  // Backend se seedha aata hai (correlated subquery) — astrologer ki Basic
  // consultancy ka id, "Book Now" button ke liye (linkedServiceId set nahi
  // hota abhi post-creation UI se, isliye Feed ka Book button hamesha Basic
  // consultancy ko represent karta hai)
  basicServiceId?: string | null;
};

export type CreatePostPayload = {
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  bgColor?: string;
  textColor?: string;
  durationSeconds?: number;
  stickerText?: string;
  stickerX?: number;
  stickerY?: number;
  stickerTextColor?: string;
  stickerBgColor?: string;
  linkedServiceId?: string;
  tags?: string[];
};

export type ImageKitAuthToken = {
  token: string;
  expire: number;
  signature: string;
};
