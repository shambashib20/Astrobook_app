import { QueryClient } from "@tanstack/react-query";

// ─── React Query — server state ke liye single source of truth ───────────────
// Zustand (auth.store.ts) sirf CLIENT/session state ke liye hai (tokens,
// isLoggedIn, lightweight `user` jo turant chahiye hota hai UI ke liye).
// Server se aane wala har cheez (profiles, posts, services, bookings) React
// Query se guzarni chahiye — taaki ek jagah update hone par (mutation +
// invalidateQueries) sab jagah automatically refresh ho jaaye, bina manual
// "yahan bhi update karo, wahan bhi update karo" wiring ke.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 sec — turant refetch na ho baar baar
      retry: 1,
      refetchOnWindowFocus: false, // React Native mein irrelevant hai, but explicit rakha
    },
  },
});

// ─── Query Keys — sab jagah yahi consistent keys use karo ─────────────────────
// Naya resource add karte waqt yahin naya key group add karo, taaki
// invalidation ke time key spelling mismatch na ho.
export const queryKeys = {
  profile: {
    me: ["profile", "me"] as const,
  },
  astrologerApplication: {
    status: ["astrologerApplication", "status"] as const,
  },
  astrologer: {
    detail: (id: string) => ["astrologer", id] as const,
    services: (id: string) => ["astrologer", id, "services"] as const,
    posts: (id: string) => ["astrologer", id, "posts"] as const,
  },
  astrologers: {
    list: ["astrologers", "list"] as const,
  },
  posts: {
    feed: ["posts", "feed"] as const,
    byId: (id: string) => ["posts", id] as const,
    myPosts: ["posts", "my"] as const,
  },
  services: {
    mine: ["services", "mine"] as const,
  },
  bookings: {
    mine: ["bookings", "mine"] as const,
  },
};