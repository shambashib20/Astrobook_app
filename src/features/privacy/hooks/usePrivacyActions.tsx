import { useLogout } from "@/features/auth/hooks/useAuth";
import { authService } from "@/features/auth/services/auth.service";
import { usersService } from "@/features/users/services";
import { useState } from "react";
import { Alert } from "react-native";

type Busy = "logoutAll" | "delete" | null;

// Dono actions ke baad session khatam hota hai, isliye success pe local
// logout (tokens + cache clear + login screen) chalate hain. Screen us waqt
// unmount ho jaati hai, isliye success path mein setBusy(null) nahi karte.
export function usePrivacyActions() {
  const { handleLogout } = useLogout();
  const [busy, setBusy] = useState<Busy>(null);

  const logoutAllDevices = async () => {
    setBusy("logoutAll");
    try {
      await authService.logoutAll();
    } catch (err: any) {
      setBusy(null);
      Alert.alert(
        "Logout failed",
        err?.response?.data?.message || "Please try again in a moment.",
      );
      return;
    }
    await handleLogout();
  };

  const deleteAccount = async () => {
    setBusy("delete");
    try {
      await usersService.deleteAccount();
    } catch (err: any) {
      setBusy(null);
      Alert.alert(
        "Account deletion failed",
        err?.response?.data?.message || "Please try again in a moment.",
      );
      return;
    }
    await handleLogout();
  };

  return { busy, logoutAllDevices, deleteAccount };
}