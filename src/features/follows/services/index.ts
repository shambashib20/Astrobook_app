import { apiClient } from "@/services/apiClient";
import type { FollowCounts, FollowUser } from "../types";

class FollowsService {
  private readonly base = "/follows";

  async follow(astrologerId: string): Promise<void> {
    await apiClient.post(`${this.base}/${astrologerId}`);
  }

  async unfollow(astrologerId: string): Promise<void> {
    await apiClient.delete(`${this.base}/${astrologerId}`);
  }

  async getStatus(astrologerId: string): Promise<boolean> {
    const res = await apiClient.get<{ isFollowing: boolean }>(
      `${this.base}/${astrologerId}/status`,
    );
    return res.data.isFollowing;
  }

  async getFollowers(userId: string): Promise<FollowUser[]> {
    const res = await apiClient.get<{ followers: FollowUser[] }>(
      `${this.base}/${userId}/followers`,
      { withToken: false },
    );
    return res.data.followers;
  }

  async getFollowing(userId: string): Promise<FollowUser[]> {
    const res = await apiClient.get<{ following: FollowUser[] }>(
      `${this.base}/${userId}/following`,
      { withToken: false },
    );
    return res.data.following;
  }

  async getCounts(userId: string): Promise<FollowCounts> {
    const res = await apiClient.get<FollowCounts>(
      `${this.base}/${userId}/counts`,
      { withToken: false },
    );
    return res.data;
  }
}

export const followsService = new FollowsService();
