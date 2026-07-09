import { useState } from "react";
import { Alert } from "react-native";
import type { UpdateProfilePayload, UserProfile } from "../services";
import { usersService } from "../services";

// ─── useMyProfile ────────────────────────────────────────────────────────────
// Full profile fetch (dateOfBirth/interests bhi milte hain, jo slim
// AuthUser mein nahi hain) — Edit Profile screen ke initial load ke liye.

export function useMyProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await usersService.getMe();
      setProfile(data);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Profile load nahi hua",
      );
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, fetchProfile };
}

// ─── useUpdateProfile ────────────────────────────────────────────────────────

export function useUpdateProfile(onSuccess?: (user: UserProfile) => void) {
  const [loading, setLoading] = useState(false);

  const updateProfile = async (dto: UpdateProfilePayload) => {
    setLoading(true);
    try {
      const user = await usersService.updateProfile(dto);
      onSuccess?.(user);
      return user;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Profile update nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading };
}
