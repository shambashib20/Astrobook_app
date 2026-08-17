export type FollowUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: "user" | "astrologer" | "admin";
  followedAt: string;
};

export type FollowCounts = {
  followers: number;
  following: number;
};
