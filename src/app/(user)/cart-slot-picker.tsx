import Header from "@/components/header";
import { cartService } from "@/features/cart/service";
import { consultationService } from "@/features/consultation/service";
import type { TimeSlot } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function displayTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CartSlotPickerScreen() {
  const router = useRouter();
  const { cartItemId, astroId, serviceId } = useLocalSearchParams<{
    cartItemId: string;
    astroId: string;
    serviceId: string;
  }>();

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!astroId) return;
    setDatesLoading(true);
    consultationService
      .getAvailableDates(astroId)
      .then((dates) => {
        setAvailableDates(dates);
        if (dates.length > 0) setSelectedDate(dates[0]!);
      })
      .catch(() => setAvailableDates([]))
      .finally(() => setDatesLoading(false));
  }, [astroId]);

  useEffect(() => {
    if (!astroId || !serviceId || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    consultationService
      .getSlots({ astrologerId: astroId, serviceId, date: selectedDate })
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [astroId, serviceId, selectedDate]);

  const handleConfirm = async () => {
    if (!selectedSlot || !cartItemId) return;
    setSaving(true);
    try {
      await cartService.setSlot(cartItemId, selectedSlot.startTime);
      router.back();
    } catch (err: any) {
      // Simple inline error — cart pe wapas jaake retry kar sakte hain
      console.log("cart setSlot error:", err?.response?.data ?? err?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          {datesLoading ? (
            <ActivityIndicator color="#9d0399" style={{ marginTop: 8 }} />
          ) : availableDates.length === 0 ? (
            <Text style={styles.noDatesText}>
              Is astrologer ne abhi koi availability set nahi ki hai
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateRow}
            >
              {availableDates.map((dateStr) => {
                const date = new Date(`${dateStr}T00:00:00`);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <Text style={[styles.dateDayText, isSelected && styles.dateTextActive]}>
                      {isToday ? "Today" : DAY_LABELS[date.getDay()]}
                    </Text>
                    <Text style={[styles.dateNumText, isSelected && styles.dateTextActive]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[styles.dateMonText, isSelected && styles.dateTextActive]}>
                      {MONTH_LABELS[date.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            {slotsLoading ? (
              <ActivityIndicator color="#9d0399" style={{ marginTop: 8 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.noDatesText}>Is din koi slot available nahi hai</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  const isUnavailable = !slot.available;
                  return (
                    <TouchableOpacity
                      key={slot.startTime}
                      style={[
                        styles.slotPill,
                        isUnavailable && styles.slotPillUnavailable,
                        isSelected && styles.slotPillActive,
                      ]}
                      disabled={isUnavailable}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotPillText,
                          isUnavailable && styles.slotPillTextUnavailable,
                          isSelected && styles.slotPillTextActive,
                        ]}
                      >
                        {displayTime(slot.startTime)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, !selectedSlot && styles.btnDisabled]}
          disabled={!selectedSlot || saving}
          onPress={handleConfirm}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Slot Confirm Karo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  noDatesText: { fontSize: 13, color: "#9CA3AF" },
  dateRow: { gap: 8, paddingVertical: 4 },
  dateCard: {
    alignItems: "center", paddingVertical: 10, paddingHorizontal: 13,
    borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1.5,
    borderColor: "#EDE9FF", minWidth: 60,
  },
  dateCardActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  dateDayText: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginBottom: 2 },
  dateNumText: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  dateMonText: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  dateTextActive: { color: "#FFF" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotPill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24,
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#EDE9FF",
  },
  slotPillUnavailable: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
  slotPillActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  slotPillText: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  slotPillTextUnavailable: { color: "#C4C4C4" },
  slotPillTextActive: { color: "#FFF" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: "#EDE9FF", elevation: 16,
  },
  confirmBtn: {
    backgroundColor: "#9d0399", borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#E5E7EB" },
  confirmBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
