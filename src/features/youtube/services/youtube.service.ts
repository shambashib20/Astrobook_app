import { apiClient } from "@/services/apiClient";
import type { YoutubeVideo } from "../types";

class YoutubeService {
  private readonly base = "/youtube";

  async getVideos(limit = 3): Promise<YoutubeVideo[]> {
    const res = await apiClient.get<{ videos: YoutubeVideo[] }>(
      `${this.base}/videos`,
      { params: { limit }, withToken: false },
    );
    return res.data.videos;
  }
}

export const youtubeService = new YoutubeService();
