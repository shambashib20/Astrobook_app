import ScreenHeader from "@/components/ScreenHeader";
import {
  useMyAvailability,
  useSetAvailability,
} from "@/features/consultation/hooks/useAvailability";
import type { AvailabilityWindow } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Date / Time helpers ─────────────────────────────────────────────────────

// IMPORTANT: kabhi bhi `new Date(0, 0, 0, h, m)` mat use karo time-picker ke
// liye — year 0 → JS ise 1900 treat karta hai, aur pre-1906 India ka timezone
// offset UTC+5:30 nahi tha (Calcutta/Madras time, odd offset). Isse native
// DateTimePicker mein ~8 min ka historical shift aa jaata hai (12:08 AM,
// 1:08 AM jaisi ajeeb values). Hamesha AAJ ki date pe setHours() karo.
function makeTime(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function toApiDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toApiTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(t: string): number {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

function displayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayTime(timeStr: string): string {
  const [h = 0, m = 0] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(bStart) < timeToMinutes(aEnd)
  );
}

type DayGroup = { date: string; windows: AvailabilityWindow[] };

// ─── Screen ───────────────────────────────────────────────────────────────

export default function AvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const { availability, loading, fetchAvailability, deleteAvailability } =
    useMyAvailability();
  const { setAvailability, loading: saving } = useSetAvailability(() => {
    setShowAddModal(false);
    fetchAvailability();
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState(makeTime(11, 0));
  const [endTime, setEndTime] = useState(makeTime(13, 0));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAvailability();
  }, []);

  const openAddModal = () => {
    setSelectedDate(new Date());
    setStartTime(makeTime(11, 0));
    setEndTime(makeTime(13, 0));
    setShowAddModal(true);
  };

  const toggleDay = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Date ke hisaab se grouped, sorted — har group ke andar time-wise sorted
  const groupedByDate: DayGroup[] = useMemo(() => {
    const map = new Map<string, AvailabilityWindow[]>();
    for (const win of availability) {
      if (!map.has(win.date)) map.set(win.date, []);
      map.get(win.date)!.push(win);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, windows]) => ({
        date,
        windows: windows.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [availability]);

  const handleSave = async () => {
    const dateStr = toApiDate(selectedDate);
    const newStart = toApiTime(startTime);
    const newEnd = toApiTime(endTime);

    if (timeToMinutes(newStart) >= timeToMinutes(newEnd)) {
      Alert.alert("Invalid", "End time, start time ke baad hona chahiye");
      return;
    }

    // Aaj ke liye past time slot allow nahi
    const now = new Date();
    if (dateStr === toApiDate(now)) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (timeToMinutes(newStart) <= nowMinutes) {
        Alert.alert(
          "Invalid",
          "Aaj ke liye jo time nikal chuka hai, uska slot nahi bana sakte",
        );
        return;
      }
    }

    // Same date ke existing slots se overlap check
    const sameDateWindows = availability.filter((w) => w.date === dateStr);
    const overlapping = sameDateWindows.find((w) =>
      rangesOverlap(newStart, newEnd, w.startTime, w.endTime),
    );
    if (overlapping) {
      Alert.alert(
        "Overlap",
        `Yeh time "${displayTime(overlapping.startTime)} → ${displayTime(
          overlapping.endTime,
        )}" wale existing slot se overlap kar raha hai`,
      );
      return;
    }

    await setAvailability({
      date: dateStr,
      startTime: newStart,
      endTime: newEnd,
    });
  };

  const confirmDelete = (win: AvailabilityWindow) => {
    Alert.alert(
      "Delete Availability",
      `${displayTime(win.startTime)} → ${displayTime(
        win.endTime,
      )} ka slot delete karna chahte ho?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteAvailability(win.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Header ── */}
      <ScreenHeader
        title="My Availability"
        subtitle="Users apni inhi hours mein book karenge"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator
            color="#9d0399"
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : groupedByDate.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Feather name="calendar" size={30} color="#9d0399" />
            </View>
            <Text style={styles.emptyText}>Koi availability set nahi hai</Text>
            <Text style={styles.emptySubtext}>
              Neeche "Add Slot" se apna pehla time window add karo
            </Text>
          </View>
        ) : (
          groupedByDate.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            return (
              <View key={group.date} style={styles.dayGroup}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => toggleDay(group.date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeaderIconBox}>
                    <Feather name="calendar" size={16} color="#9d0399" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayHeaderDate}>
                      {displayDate(group.date)}
                    </Text>
                    <Text style={styles.dayHeaderCount}>
                      {group.windows.length} slot
                      {group.windows.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.slotsWrap}>
                    {group.windows.map((win) => (
                      <View key={win.id} style={styles.slotPill}>
                        <Feather name="clock" size={12} color="#6B21A8" />
                        <Text style={styles.slotTime}>
                          {displayTime(win.startTime)} –{" "}
                          {displayTime(win.endTime)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => confirmDelete(win)}
                          hitSlop={8}
                        >
                          <Feather name="trash-2" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Slot FAB ── */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={openAddModal}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#FFF" />
        <Text style={styles.addBtnText}>Add Slot</Text>
      </TouchableOpacity>

      {/* ── Add Availability Modal ── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Availability</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={8}
              >
                <Feather name="x" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Date */}
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerFieldText}>
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {/* Time range */}
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.pickerFieldText}>
                    {displayTime(toApiTime(startTime))}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.pickerFieldText}>
                    {displayTime(toApiTime(endTime))}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (date) setStartTime(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  setShowEndPicker(Platform.OS === "ios");
                  if (date) setEndTime(date);
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Availability</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },

  content: { padding: 16, gap: 12 },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  emptySubtext: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

  dayGroup: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  dayHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderDate: { fontSize: 14.5, fontWeight: "700", color: "#1A1A2E" },
  dayHeaderCount: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  slotsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9F5FF",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  slotTime: { fontSize: 12.5, fontWeight: "600", color: "#6B21A8" },

  addBtn: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#9d0399",
    borderRadius: 14,
    paddingHorizontal: 26,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  addBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  pickerField: {
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerFieldText: { fontSize: 15, color: "#1A1A2E", fontWeight: "600" },

  timeRow: { flexDirection: "row", gap: 12, marginTop: 4 },

  saveBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});
