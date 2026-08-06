import { apiClient } from "@/services/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
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

  loginSuccess: (data: AuthResult) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
  setLoading: (val: boolean) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLoggedIn: false,
  isNewUser: false,
  user: null,
  accessToken: null,
  isLoading: true,

  loginSuccess: async ({ accessToken, refreshToken, user, isNewUser }) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    await AsyncStorage.setItem("refreshToken", refreshToken);
    set({ isLoggedIn: true, isNewUser, user, accessToken, isLoading: false });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...updates } });
  },

  setLoading: (val) => set({ isLoading: val }),

  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
      }
    } catch {}
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    set({
      isLoggedIn: false,
      isNewUser: false,
      user: null,
      accessToken: null,
      isLoading: false,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) {
      set({ isLoading: false });
      return false;
    }

    // Server temporarily unreachable ho sakta hai (dev-server restart, wifi
    // hiccup, LAN IP change) — isse "refresh token invalid" jaisa treat
    // nahi karna chahiye, warna valid session bhi wipe ho jaati hai aur
    // user ko baar-baar OTP se login karna padta hai (naya session banta
    // hai har baar). Isliye network errors pe kuch retries karte hain aur
    // tokens ko tabhi clear karte hain jab backend GENUINELY reject kare
    // (401/400 response — matlab token sach mein invalid/expired hai).
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await axios.post(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        await AsyncStorage.setItem("accessToken", accessToken);
        await AsyncStorage.setItem("refreshToken", newRefreshToken);

        const meRes = await apiClient.get<{ user: AuthUser }>("/auth/me");
        const user = meRes.data.user;

        set({ isLoggedIn: true, accessToken, user, isLoading: false });
        return true;
      } catch (err: any) {
        const isAuthRejection =
          err?.response?.status === 401 || err?.response?.status === 400;

        if (isAuthRejection) {
          // Backend ne saaf mana kiya — refresh token genuinely invalid ya
          // expired hai. Ab yahan se recover nahi ho sakta, tokens clear
          // karke login pe bhejo.
          await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
          set({ isLoading: false });
          return false;
        }

        // Network/timeout/server-down jaisi transient error — retry karo,
        // tokens ko haath mat lagao
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200 * attempt));
          continue;
        }

        // Saare retries fail — tokens abhi bhi preserve karte hain (agla
        // app-open pe dobara try hoga), sirf is session ke liye logged-out
        // dikhate hain
        set({ isLoading: false });
        return false;
      }
    }

    set({ isLoading: false });
    return false;
  },
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useUser = () => useAuthStore((s) => s.user);
export const useIsLoggedIn = () => useAuthStore((s) => s.isLoggedIn);
export const useIsNewUser = () => useAuthStore((s) => s.isNewUser);
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useUserRole = () => useAuthStore((s) => s.user?.role);