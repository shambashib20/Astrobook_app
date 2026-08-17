export type NotificationType = "new_follower" | "post_liked" | "post_commented";

export type AppNotification = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  postId: string | null;
  actorId: string;
  actorName: string | null;
  actorAvatar: string | null;
  actorRole: "user" | "astrologer" | "admin";
  postContent: string | null;
};
