import { AuthResult, useAuthStore } from "@/features/auth/store/auth.store";
import { queryKeys } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
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
  // Test/staging servers pe jahan SMS deliver nahi ho raha, server
  // SHOW_OTP_IN_RESPONSE=true hone par yeh field bhejta hai — screen isko
  // dikha dega taaki manually enter kiya ja sake. Production mein hamesha
  // undefined rahega.
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);

  const sendOtp = async (phone: string) => {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return { success: false } as const;
    }
    setSending(true);
    try {
      const { debugOtp } = await authService.getOtp(phone);
      setDebugOtp(debugOtp);
      return { success: true, debugOtp } as const;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        Alert.alert(
          "Too Many Requests",
          "Please wait 10 minutes before trying again.",
        );
      } else {
        Alert.alert("Error", err?.response?.data?.message || "Failed to send OTP");
      }
      return { success: false } as const;
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (phone: string, otp: string, rememberMe = true) => {
    if (otp.length !== 4) return;
    setVerifying(true);
    try {
      const data: AuthResult = await authService.verifyOtp(phone, otp);
      await loginSuccess(data, rememberMe);

      // isNewUser sirf account banne ki pehli baar true hota hai — doosri baar
      // login pe false aata, isliye adhoora onboarding (phone verify nahi hua)
      // feed mein ghus jaata tha. Asli source of truth: user.isOnboarded.
      if (data.isNewUser || !data.user.isOnboarded) {
        router.replace("/(auth)/onboarding");
      } else {
        redirectByRole(data.user.role, router);
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        Alert.alert("Too Many Attempts", "Please request a new OTP.");
      } else {
        Alert.alert("Incorrect OTP", "The OTP you entered is wrong. Please try again.");
      }
      throw err;
    } finally {
      setVerifying(false);
    }
  };

  const resendOtp = async (phone: string) => {
    try {
      const { debugOtp } = await authService.getOtp(phone);
      setDebugOtp(debugOtp);
    } catch {
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
    }
  };

  return { sendOtp, verifyOtp, resendOtp, sending, verifying, debugOtp };
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
      if (!idToken) throw new Error("Could not retrieve Google ID token");

      const data: AuthResult = await authService.googleLogin(idToken);
      await loginSuccess(data);

      // isNewUser sirf account banne ki pehli baar true hota hai — doosri baar
      // login pe false aata, isliye adhoora onboarding (phone verify nahi hua)
      // feed mein ghus jaata tha. Asli source of truth: user.isOnboarded.
      if (data.isNewUser || !data.user.isOnboarded) {
        router.replace("/(auth)/onboarding");
      } else {
        redirectByRole(data.user.role, router);
      }
    } catch (err: any) {
      console.log("Google login error:", JSON.stringify(err));
      console.log("Error code:", err.code);
      console.log("Error message:", err.message);
      if (err.code !== "SIGN_IN_CANCELLED") {
        // TEMP DEBUG: production mein adb access nahi tha, isliye error
        // detail seedha alert mein dikha rahe hain taaki exact code/message
        // dikh jaaye. Issue fix hone ke baad yeh wapas simple message pe
        // revert kar dena — end users ko raw error code dikhana theek nahi.
        Alert.alert(
          "Google Login Error (debug)",
          `code: ${err.code}\nmessage: ${err.message}`,
        );
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
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const onboard = async (payload: {
    name: string;
    email?: string;
    dateOfBirth?: string;
    interests?: string[];
  }) => {
    if (!payload.name.trim()) {
      Alert.alert("Required", "Please enter your name");
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
      // react-query ka profile.me cache 30s staleTime pe cached rehta hai —
      // isse ho sakta hai onboarding se pehle ka (khaali dob/bio wala)
      // snapshot cached mil jaaye. Invalidate karke turant fresh fetch
      // force karo, warna Edit Profile/Profile tab purana data dikhate
      // rehte hain jab tak koi manual save na ho.
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      redirectByRole(user?.role ?? "user", router);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "";

      // Already onboarded hai — toh bhi feed pe bhejo
      if (msg.includes("already onboarded") || err?.response?.status === 400) {
        updateUser({ name: payload.name.trim(), isOnboarded: true });
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
        redirectByRole(user?.role ?? "user", router);
        return;
      }

      Alert.alert("Error", msg || "Something went wrong. Please try again.");
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