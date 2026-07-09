import { AuthResult, useAuthStore } from "@/features/auth/store/auth.store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { authService } from "../services/auth.service";

// ─── Helper — login/onboarding ke baad hamesha feed pe ───────────────────────
// Role se farak nahi padta — astrologer apni profile se explicitly
// Dashboard button dabaake (astrologer) layout mein jaata hai.

function redirectByRole(_role: string, router: any) {
  router.replace("/(user)/feed");
}

// ─── useOtpLogin ──────────────────────────────────────────────────────────────

export function useOtpLogin() {
  const router = useRouter();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async (phone: string) => {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Error", "Valid phone number daalo");
      return false;
    }
    setSending(true);
    try {
      await authService.getOtp(phone);
      return true;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        Alert.alert(
          "Ruko thoda",
          "Bahut zyada requests. 10 min baad try karo.",
        );
      } else {
        Alert.alert("Error", err?.response?.data?.message || "OTP nahi gaya");
      }
      return false;
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const data: AuthResult = await authService.verifyOtp(phone, otp);
      await loginSuccess(data);

      if (data.isNewUser) {
        router.replace("/(auth)/onboarding");
      } else {
        redirectByRole(data.user.role, router);
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        Alert.alert("Attempts khatam", "OTP dobara bhejo");
      } else {
        Alert.alert("Wrong OTP", "OTP galat hai, dobara try karo");
      }
      throw err;
    } finally {
      setVerifying(false);
    }
  };

  const resendOtp = async (phone: string) => {
    try {
      await authService.getOtp(phone);
    } catch {
      Alert.alert("Error", "Resend nahi hua, dobara try karo");
    }
  };

  return { sendOtp, verifyOtp, resendOtp, sending, verifying };
}

// ─── useGoogleLogin ───────────────────────────────────────────────────────────

export function useGoogleLogin() {
  const router = useRouter();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const [loading, setLoading] = useState(false);

  const googleLogin = async () => {
    setLoading(true);
    try {
      // Dynamic import — Google signin Dev build mein hi kaam karta hai
      const {
        GoogleSignin,
      } = require("@react-native-google-signin/google-signin");
      await GoogleSignin.signOut(); // ← yeh add karo
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) throw new Error("Token nahi mila");

      const data: AuthResult = await authService.googleLogin(idToken);
      await loginSuccess(data);

      if (data.isNewUser) {
        router.replace("/(auth)/onboarding");
      } else {
        redirectByRole(data.user.role, router);
      }
    } catch (err: any) {
      console.log("Google login error:", JSON.stringify(err));
      console.log("Error code:", err.code);
      console.log("Error message:", err.message);
      if (err.code !== "SIGN_IN_CANCELLED") {
        Alert.alert("Error", "Google login fail hua");
      }
    } finally {
      setLoading(false);
    }
  };

  return { googleLogin, loading };
}

// ─── useOnboarding ────────────────────────────────────────────────────────────

export function useOnboarding() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onboard = async (payload: {
    name: string;
    email?: string;
    dateOfBirth?: string;
    interests?: string[];
  }) => {
    if (!payload.name.trim()) {
      Alert.alert("Required", "Apna naam daalo");
      return;
    }
    setLoading(true);
    try {
      await authService.onboard({
        name: payload.name.trim(),
        email: payload.email?.trim() || undefined,
        dateOfBirth: payload.dateOfBirth,
        interests: payload.interests,
      });
      updateUser({ name: payload.name.trim(), isOnboarded: true });
      redirectByRole(user?.role ?? "user", router);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "";

      // Already onboarded hai — toh bhi feed pe bhejo
      if (msg.includes("already onboarded") || err?.response?.status === 400) {
        updateUser({ name: payload.name.trim(), isOnboarded: true });
        redirectByRole(user?.role ?? "user", router);
        return;
      }

      Alert.alert("Error", msg || "Kuch gadbad hui");
    } finally {
      setLoading(false);
    }
  };

  return { onboard, loading };
}

// ─── useLogout ────────────────────────────────────────────────────────────────

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return { handleLogout };
}
