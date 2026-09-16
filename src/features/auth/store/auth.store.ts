import { queryClient } from "@/lib/queryClient";
import { apiClient, isAuthRejection } from "@/services/apiClient";
import { tokenStorage } from "@/services/tokenStorage";
import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: "user" | "astrologer" | "admin";
  isOnboarded: boolean;
  isAstrologer: boolean; // ← added
  avatarUrl: string | null;
  bio: string | null;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
};

type AuthStore = {
  isLoggedIn: boolean;
  isNewUser: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  // Backend ne session reject kiya (token expire/invalid) — root layout isko
  // dekh ke login pe bhejta hai. Normal logout pe ye true NAHI hota.
  sessionExpired: boolean;

  loginSuccess: (data: AuthResult) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
  setLoading: (val: boolean) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  clearSessionExpired: () => void;
};

const LOGGED_OUT_STATE = {
  isLoggedIn: false,
  isNewUser: false,
  user: null,
  accessToken: null,
  isLoading: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLoggedIn: false,
  isNewUser: false,
  user: null,
  accessToken: null,
  isLoading: true,
  sessionExpired: false,

  loginSuccess: async ({ accessToken, refreshToken, user, isNewUser }) => {
    await tokenStorage.setTokens(accessToken, refreshToken);
    set({
      isLoggedIn: true,
      isNewUser,
      user,
      accessToken,
      isLoading: false,
      sessionExpired: false,
    });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...updates } });
  },

  setLoading: (val) => set({ isLoading: val }),

  logout: async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        // withToken: false — logout route ko auth nahi chahiye. Token ke saath
        // bhejte to expired accessToken pe refresh + rotation ho jaata aur
        // backend pe naya session bina logout ke bach jaata.
        await apiClient
          .post("/auth/logout", { refreshToken }, { withToken: false })
          .catch(() => {});
      }
    } catch {}
    await tokenStorage.clear();
    queryClient.clear(); // pichhle user ka cached data agle login mein na dikhe
    set({ ...LOGGED_OUT_STATE, sessionExpired: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const storedRefreshToken = await tokenStorage.getRefreshToken();
    if (!storedRefreshToken) {
      set({ isLoading: false });
      return false;
    }

    // Server temporarily unreachable ho sakta hai (Render cold start, wifi
    // hiccup, dev-server restart) — network errors pe retry karo, tokens
    // tabhi clear hote hain jab backend GENUINELY reject kare.
    //
    // Refresh sirf ek baar hota hai: pehle attempt mein naya token mil gaya
    // aur /auth/me network se fail hua, to retry mein dobara refresh NAHI
    // karte. (Pehle yahi bug tha — retry purana, rotate ho chuka token
    // bhejta tha, backend reject karta tha, aur user logout ho jaata tha.)
    const MAX_ATTEMPTS = 3;
    let accessToken: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (!accessToken) {
          accessToken = await apiClient.refreshSession();
        }

        const meRes = await apiClient.get<{ user: AuthUser }>("/auth/me");
        const user = meRes.data.user;

        set({
          isLoggedIn: true,
          accessToken,
          user,
          isLoading: false,
          sessionExpired: false,
        });
        return true;
      } catch (err: any) {
        if (isAuthRejection(err)) {
          // apiClient ne tokens already clear kar diye hain
          set({ isLoading: false, sessionExpired: false });
          return false;
        }

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200 * attempt));
          continue;
        }

        // Saare retries fail — tokens preserve rehte hain (agle app-open pe
        // dobara try hoga), sirf is session ke liye logged-out dikhate hain
        set({ isLoading: false });
        return false;
      }
    }

    set({ isLoading: false });
    return false;
  },

  clearSessionExpired: () => set({ sessionExpired: false }),
}));

// ─── Session expiry (apiClient se) ────────────────────────────────────────────
// Kisi bhi API call pe refresh token reject hua to apiClient tokens clear
// karke yahan batata hai. App ki state turant logged-out ho jaati hai aur
// root layout login pe redirect karta hai.
apiClient.setSessionExpiredHandler(() => {
  const wasLoggedIn = useAuthStore.getState().isLoggedIn;
  queryClient.clear();
  useAuthStore.setState({ ...LOGGED_OUT_STATE, sessionExpired: wasLoggedIn });
});

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useUser = () => useAuthStore((s) => s.user);
export const useIsLoggedIn = () => useAuthStore((s) => s.isLoggedIn);
export const useIsNewUser = () => useAuthStore((s) => s.isNewUser);
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useUserRole = () => useAuthStore((s) => s.user?.role);