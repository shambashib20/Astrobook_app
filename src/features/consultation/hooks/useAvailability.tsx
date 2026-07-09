import { useState } from "react";
import { Alert } from "react-native";
import { consultationService } from "../service";
import type { AvailabilityWindow, CreateAvailabilityPayload } from "../types";

// ─── useMyAvailability ─────────────────────────────────────────────────────
// List + delete — astrologer ki apni availability windows

export function useMyAvailability() {
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailability = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await consultationService.getMyAvailability();
      setAvailability(data);
    } catch (err: any) {
      console.log(
        "getMyAvailability error:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      const msg =
        err?.response?.status === 403
          ? "Astrologer permission nahi hai (role check fail) — DB mein role='astrologer' hai ya nahi check karo"
          : err?.response?.data?.message || "Availability load nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      await consultationService.deleteAvailability(id);
      setAvailability((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Slot delete nahi hua",
      );
    }
  };

  return {
    availability,
    loading,
    refreshing,
    fetchAvailability,
    deleteAvailability,
  };
}

// ─── useSetAvailability ─────────────────────────────────────────────────────
// Create — naya availability window (specific date + time range)

export function useSetAvailability(
  onSuccess?: (window: AvailabilityWindow) => void,
) {
  const [loading, setLoading] = useState(false);

  const setAvailability = async (dto: CreateAvailabilityPayload) => {
    if (!dto.date || !dto.startTime || !dto.endTime) {
      Alert.alert("Required", "Date, start time aur end time daalo");
      return;
    }
    setLoading(true);
    try {
      const window = await consultationService.setAvailability(dto);
      onSuccess?.(window);
      return window;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Availability save nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return { setAvailability, loading };
}
