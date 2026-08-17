import { apiClient } from "@/services/apiClient";
import type { AppNotification } from "../types";

class NotificationsService {
  private readonly base = "/notifications";

  async getList(): Promise<AppNotification[]> {
    const res = await apiClient.get<{ notifications: AppNotification[] }>(
      this.base,
    );
    return res.data.notifications;
  }

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>(
      `${this.base}/unread-count`,
    );
    return res.data.count;
  }

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`${this.base}/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await apiClient.patch(`${this.base}/read-all`);
  }
}

export const notificationsService = new NotificationsService();
