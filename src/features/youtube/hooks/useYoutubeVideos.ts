import { useEffect, useState } from "react";
import { youtubeService } from "../services/youtube.service";
import type { YoutubeVideo } from "../types";

export function useYoutubeVideos(limit = 3) {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await youtubeService.getVideos(limit);
        if (!cancelled) setVideos(data);
      } catch {
        // silent — carousel simply stays empty if the feed fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { videos, loading };
}
