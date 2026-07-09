import { useState } from "react";
import { Alert } from "react-native";
import { consultationService } from "../service";
import type { GroupedAppointments } from "../types";

const EMPTY: GroupedAppointments = {
  upcoming: [],
  ongoing: [],
  completed: [],
  cancelled: [],
};

// ─── useMyAppointments ───────────────────────────────────────────────────────
// Grouped by status — same endpoint works for both user aur astrologer
// (backend matches either userId ya astrologerId = current user)

export function useMyAppointments() {
  const [appointments, setAppointments] = useState<GroupedAppointments>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await consultationService.getMyAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.log(
        "getMyAppointments error:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Appointments load nahi hue",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return { appointments, loading, refreshing, fetchAppointments };
}
