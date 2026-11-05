import { useState } from "react";
import { Alert } from "react-native";
import { usersService } from "../services";

// ─── usePhoneVerification ──────────────────────────────────────────────────
// Sirf Google-login users ke liye — jinke account mein abhi phone nahi hai.
// Onboarding ke General Details step ke andar hi inline verify hota hai:
// phone type karo → "Verify" dabao → OTP box appear → OTP daalke verify
// karo → phone current account se attach ho jaata hai (naya login/session
// nahi banta, see backend POST /users/me/phone/*).

export function usePhoneVerification() {
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);

  const sendOtp = async (phone: string) => {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Error", "Please enter a valid phone number.");
      return { success: false } as const;
    }
    setSending(true);
    try {
      const { debugOtp } = await usersService.sendPhoneOtp(phone.trim());
      setDebugOtp(debugOtp);
      setOtpSent(true);
      return { success: true } as const;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          "Number Already Linked",
          "This number is already associated with another account. Please try a different number.",
        );
      } else if (status === 429) {
        Alert.alert("Too Many Requests", "Please wait 10 minutes before trying again.");
      } else {
        Alert.alert("Error", err?.response?.data?.message || "Failed to send OTP.");
      }
      return { success: false } as const;
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    if (otp.length !== 4) return { success: false } as const;
    setVerifying(true);
    try {
      await usersService.verifyPhoneOtp(phone.trim(), otp);
      setVerified(true);
      return { success: true } as const;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          "Number Already Linked",
          "This number is already associated with another account. Please try a different number.",
        );
      } else if (status === 429) {
        Alert.alert("Too Many Attempts", "Please request a new OTP.");
      } else {
        Alert.alert("Incorrect OTP", "The OTP you entered is wrong. Please try again.");
      }
      return { success: false } as const;
    } finally {
      setVerifying(false);
    }
  };

  // Number badalne pe verification state reset karo — purana OTP naye
  // number ke liye valid nahi hota
  const reset = () => {
    setOtpSent(false);
    setVerified(false);
    setDebugOtp(undefined);
  };

  return {
    otpSent,
    verified,
    sending,
    verifying,
    debugOtp,
    sendOtp,
    verifyOtp,
    reset,
  };
}
