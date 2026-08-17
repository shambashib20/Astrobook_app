import { useState } from "react";
import { followsService } from "../services";

// ─── useToggleFollow ─────────────────────────────────────────────────────────
// Generic follow toggle — likePost jaisa hi optimistic update pattern.
// Kisi bhi object pe kaam karta hai jisme astrologerId + isFollowedByMe ho
// (Post cards, astrologer-profile header) — caller apna onUpdate deta hai.

export function useToggleFollow() {
  const toggleFollow = async <T extends { isFollowedByMe?: boolean }>(
    astrologerId: string,
    current: T,
    onUpdate: (updated: T) => void,
  ) => {
    const wasFollowing = !!current.isFollowedByMe;
    onUpdate({ ...current, isFollowedByMe: !wasFollowing });
    try {
      if (wasFollowing) {
        await followsService.unfollow(astrologerId);
      } else {
        await followsService.follow(astrologerId);
      }
    } catch {
      onUpdate({ ...current, isFollowedByMe: wasFollowing }); // revert on fail
    }
  };

  return { toggleFollow };
}

// ─── useFollowCounts ─────────────────────────────────────────────────────────

export function useFollowCounts(userId: string | undefined) {
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const fetchCounts = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await followsService.getCounts(userId);
      setCounts(data);
    } catch {
      // silent — counts sirf display ke liye hain, block karne ki zaroorat nahi
    } finally {
      setLoading(false);
    }
  };

  return { counts, loading, fetchCounts };
}
// Astrologer profile page ke liye — jab post feed se nahi (jahan
// isFollowedByMe already batch mein aata hai) balki seedha profile pe
// pahunche ho, tab status alag se fetch karna padta hai

export function useFollowStatus(astrologerId: string | undefined) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!astrologerId) return;
    setLoading(true);
    try {
      const status = await followsService.getStatus(astrologerId);
      setIsFollowing(status);
    } catch {
      // silent — button bina initial state ke bhi kaam karega (default false)
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    if (!astrologerId || isFollowing === null) return;
    const was = isFollowing;
    setIsFollowing(!was);
    try {
      if (was) {
        await followsService.unfollow(astrologerId);
      } else {
        await followsService.follow(astrologerId);
      }
    } catch {
      setIsFollowing(was); // revert on fail
    }
  };

  return { isFollowing, loading, fetchStatus, toggle };
}
