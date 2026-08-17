import { useState } from "react";
import { notificationsService } from "../services";
import type { AppNotification } from "../types";

// ─── useNotifications ────────────────────────────────────────────────────────
// Notifications list screen ke liye — fetch, tap-to-mark-read (optimistic),
// mark-all-read.

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getList();
      setNotifications(data);
    } catch {
      setError("Notifications load nahi hui");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markRead = async (id: string) => {
    // Optimistic — turant UI mein read dikha do, backend background mein
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await notificationsService.markRead(id);
    } catch {
      // silent — worst case agli baar list refresh pe sahi state aa jaayegi
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsService.markAllRead();
    } catch {
      // silent
    }
  };

  return {
    notifications,
    loading,
    refreshing,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}

// ─── useUnreadCount ───────────────────────────────────────────────────────────
// Header ke bell badge ke liye — lightweight, sirf count

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const c = await notificationsService.getUnreadCount();
      setCount(c);
    } catch {
      // silent — badge sirf cosmetic hai, fail hone pe bas 0 dikhega
    }
  };

  return { count, fetchCount };
}
