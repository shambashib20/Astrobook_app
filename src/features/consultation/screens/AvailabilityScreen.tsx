import { toast } from "@/components/toast";
import { AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddSlotSheet from "../components/availability/AddSlotSheet";
import DaySlotSheet from "../components/availability/DaySlotSheet";
import MonthCalendar, { type DayMark } from "../components/availability/MonthCalendar";
import { useAvailabilityManager } from "../hooks/useAvailabilityManager";
import type { AvailabilityWindow, RecurringAvailability } from "../types";
import { displayTime, groupUpcoming } from "../utils/availability";

/** YYYY-MM-DD for a date offset from today */
function offsetDate(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** YYYY-MM-DD → day of week number */
function dow(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

/** Build markedDates map for the calendar */
function buildMarkedDates(
  recurringPatterns: RecurringAvailability[],
  windows: AvailabilityWindow[],
  year: number,
  month: number, // 0-indexed, current viewed month context irrelevant — we cover ±2 months
): Map<string, DayMark> {
  const map = new Map<string, DayMark>();

  // Mark specific override windows
  for (const w of windows) {
    if (w.date) {
      const existing = map.get(w.date);
      map.set(w.date, existing === "recurring" ? "both" : "override");
    }
  }

  // Mark recurring days across a 3-month window so calendar always looks populated
  const recurringDows = new Set(recurringPatterns.map((r) => r.dayOfWeek));
  for (let mOffset = -1; mOffset <= 2; mOffset++) {
    let m = month + mOffset;
    let y = year;
    while (m < 0) { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m, d);
      if (recurringDows.has(dateObj.getDay())) {
        const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const existing = map.get(key);
        map.set(key, existing === "override" ? "both" : "recurring");
      }
    }
  }

  return map;
}

export default function AvailabilityScreen() {
  const {
    windows, loading, refreshing, error, refetch, create, remove,
    recurringPatterns, recurringLoading, createRecurring, removeRecurring,
  } = useAvailabilityManager();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Track viewed month so markedDates covers it
  const today = new Date();
  const [viewYear] = useState(today.getFullYear());
  const [viewMonth] = useState(today.getMonth());

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const groups = useMemo(() => groupUpcoming(windows), [windows]);
  const slotCount = groups.reduce((n, g) => n + g.windows.length, 0);

  const markedDates = useMemo(
    () => buildMarkedDates(recurringPatterns, windows, viewYear, viewMonth),
    [recurringPatterns, windows, viewYear, viewMonth],
  );

  // Slots for the selected date
  const selectedDow = selectedDate ? dow(selectedDate) : null;
  const selectedRecurring = useMemo(
    () => (selectedDow !== null ? recurringPatterns.filter((r) => r.dayOfWeek === selectedDow) : []),
    [recurringPatterns, selectedDow],
  );
  const selectedOverrides = useMemo(
    () => (selectedDate ? windows.filter((w) => w.date === selectedDate) : []),
    [windows, selectedDate],
  );

  // ── Edit handlers (delete old + create new) ─────────────────
  const handleEditRecurring = async (r: RecurringAvailability, newStart: string, newEnd: string) => {
    try {
      await removeRecurring.mutateAsync(r.id);
      await createRecurring.mutateAsync({ daysOfWeek: [r.dayOfWeek], startTime: newStart, endTime: newEnd });
      toast.show("Slot updated", "success");
    } catch {
      toast.show("Failed to update slot. Please try again.", "error");
    }
  };

  const handleEditOverride = async (w: AvailabilityWindow, newStart: string, newEnd: string) => {
    if (!w.date) return;
    try {
      await remove.mutateAsync(w.id);
      await create.mutateAsync({ dates: [w.date], startTime: newStart, endTime: newEnd });
      toast.show("Slot updated", "success");
    } catch {
      toast.show("Failed to update slot. Please try again.", "error");
    }
  };

  // ── Clear all ────────────────────────────────────────────────
  const handleClearAll = () => {
    const total = windows.length + recurringPatterns.length;
    if (total === 0) return;
    Alert.alert(
      "Remove All Slots?",
      `${total} slots will be removed — both specific and recurring. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove All",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.allSettled([
                ...windows.map((w) => remove.mutateAsync(w.id)),
                ...recurringPatterns.map((r) => removeRecurring.mutateAsync(r.id)),
              ]);
              toast.show("All slots removed", "success");
            } catch {
              toast.show("Some slots could not be removed. Please try again.", "error");
            }
          },
        },
      ],
    );
  };

  // ── Delete handlers ──────────────────────────────────────────
  const confirmDeleteRecurring = (r: RecurringAvailability) =>
    Alert.alert(
      "Remove Recurring Slot?",
      `${DOW_LABEL[r.dayOfWeek]} · ${displayTime(r.startTime)} – ${displayTime(r.endTime)} will be removed from your weekly schedule.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeRecurring.mutate(r.id, {
              onError: () => toast.show("Failed to remove slot. Please try again.", "error"),
            }),
        },
      ],
    );

  const confirmDeleteOverride = (w: AvailabilityWindow) =>
    Alert.alert(
      "Remove Slot?",
      `The slot from ${displayTime(w.startTime ?? "")} – ${displayTime(w.endTime ?? "")} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            remove.mutate(w.id, {
              onError: () => toast.show("Failed to remove slot. Please try again.", "error"),
            }),
        },
      ],
    );

  // ── Create handlers ──────────────────────────────────────────
  const submit = async (dates: string[], startTime: string, endTime: string) => {
    try {
      const { created, failed } = await create.mutateAsync({ dates, startTime, endTime });
      if (created > 0) {
        toast.show(failed ? `${created} slots added, ${failed} failed` : "Slot added", failed ? "error" : "success");
        return true;
      }
      toast.show("Failed to save slot. Please try again.", "error");
    } catch {
      toast.show("Failed to save slot. Please try again.", "error");
    }
    return false;
  };

  const submitRecurring = async (daysOfWeek: number[], startTime: string, endTime: string) => {
    try {
      const { created, failed } = await createRecurring.mutateAsync({ daysOfWeek, startTime, endTime });
      if (created > 0) {
        toast.show(
          failed ? `${created} recurring slots added, ${failed} failed` : "Recurring slot added",
          failed ? "error" : "success",
        );
        return true;
      }
      toast.show("Failed to save recurring slot. Please try again.", "error");
    } catch {
      toast.show("Failed to save recurring slot. Please try again.", "error");
    }
    return false;
  };

  const isEmpty = groups.length === 0 && recurringPatterns.length === 0;

  // ── Quick-glance data (yesterday / today / tomorrow) ────────
  const quickDays = useMemo(() => {
    return [-1, 0, 1].map((delta) => {
      const dateStr = offsetDate(delta);
      const d = new Date(`${dateStr}T00:00:00`);
      const dowNum = d.getDay();
      const label = delta === -1 ? "Kal" : delta === 0 ? "Aaj" : "Kal";
      const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dowNum]!;
      const dateNum = d.getDate();

      const recurringSlots = recurringPatterns.filter((r) => r.dayOfWeek === dowNum);
      const overrideSlots = windows.filter((w) => w.date === dateStr);

      return { dateStr, label, dayLabel, dateNum, recurringSlots, overrideSlots, delta };
    });
  }, [recurringPatterns, windows]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={[AstroColors.canvasHeader, AstroColors.canvas]} style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Availability</Text>
          <View style={styles.badgeRow}>
            {slotCount > 0 && (
              <View style={styles.badge}>
                <Feather name="calendar" size={10} color={AstroColors.brand} />
                <Text style={styles.badgeText}>{slotCount} specific</Text>
              </View>
            )}
            {recurringPatterns.length > 0 && (
              <View style={styles.badge}>
                <Feather name="repeat" size={10} color={AstroColors.brand} />
                <Text style={styles.badgeText}>{recurringPatterns.length} recurring</Text>
              </View>
            )}
            {slotCount === 0 && recurringPatterns.length === 0 && (
              <Text style={styles.sub}>Users inhi ghanton mein book karenge</Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          {(windows.length > 0 || recurringPatterns.length > 0) && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={styles.clearBtn}
              hitSlop={8}
              accessibilityLabel="Remove all slots"
            >
              <Feather name="trash-2" size={16} color={AstroColors.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addWrap} onPress={() => setSheetOpen(true)} activeOpacity={0.85} accessibilityLabel="Add slot">
            <LinearGradient colors={[AstroColors.brandLight, AstroColors.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.add}>
              <Feather name="plus" size={16} color={AstroColors.onBrand} />
              <Text style={styles.addText}>Slot</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading || recurringLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AstroColors.brand} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              tintColor={AstroColors.brand}
              colors={[AstroColors.brand]}
            />
          }
        >
          {error ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: AstroColors.dangerTint }]}>
                <Feather name="wifi-off" size={22} color={AstroColors.danger} />
              </View>
              <Text style={styles.emptyTitle}>Failed to Load Availability</Text>
              <Text style={styles.emptyText}>Please check your internet and try again.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => refetch()}>
                <Text style={styles.emptyBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isEmpty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="calendar" size={22} color={AstroColors.brand} />
              </View>
              <Text style={styles.emptyTitle}>No Open Slots</Text>
              <Text style={styles.emptyText}>
                Add the hours you're available — users can only book within those times.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setSheetOpen(true)}>
                <Text style={styles.emptyBtnText}>Add Slot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Quick glance strip ───────────────────────────── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="clock" size={12} color={AstroColors.textMuted} />
                  <Text style={styles.sectionTitle}>Next 3 Days</Text>
                </View>
                <View style={styles.quickRow}>
                  {quickDays.map(({ dateStr, label, dayLabel, dateNum, recurringSlots, overrideSlots, delta }) => {
                    const isSelected = selectedDate === dateStr;
                    const isToday = delta === 0;
                    const totalSlots = recurringSlots.length + overrideSlots.length;

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[
                          styles.quickCell,
                          isToday && styles.quickCellToday,
                          isSelected && styles.quickCellSelected,
                        ]}
                        onPress={() => setSelectedDate((prev) => prev === dateStr ? null : dateStr)}
                        activeOpacity={0.7}
                      >
                        {/* Top: label + today indicator */}
                        <View style={styles.quickTop}>
                          <Text style={[styles.quickLabel, isToday && styles.quickLabelToday, isSelected && styles.quickLabelSelected]}>
                            {label}
                          </Text>
                          {isToday && !isSelected && (
                            <View style={styles.todayDot} />
                          )}
                        </View>

                        {/* Date number + day */}
                        <Text style={[styles.quickDateNum, isSelected && styles.quickTextSelected]}>
                          {dateNum}
                        </Text>
                        <Text style={[styles.quickDayName, isSelected && styles.quickTextMuted]}>
                          {dayLabel}
                        </Text>

                        {/* Divider */}
                        <View style={[styles.quickDivider, isSelected && styles.quickDividerSelected]} />

                        {/* Slot times */}
                        {totalSlots === 0 ? (
                          <View style={styles.quickEmptyRow}>
                            <Feather name="minus" size={12} color={isSelected ? "rgba(255,255,255,0.5)" : AstroColors.textMuted} />
                          </View>
                        ) : (
                          <>
                            {recurringSlots.slice(0, 2).map((r, i) => (
                              <View key={`r${i}`} style={styles.quickTimeRow}>
                                <View style={[styles.quickDot, isSelected ? styles.quickDotSelected : styles.quickDotRecurring]} />
                                <Text style={[styles.quickTime, isSelected && styles.quickTextSelected]} numberOfLines={1}>
                                  {displayTime(r.startTime)}
                                </Text>
                              </View>
                            ))}
                            {overrideSlots.slice(0, Math.max(0, 2 - recurringSlots.length)).map((w, i) => (
                              <View key={`o${i}`} style={styles.quickTimeRow}>
                                <View style={[styles.quickDot, isSelected ? styles.quickDotSelected : styles.quickDotOverride]} />
                                <Text style={[styles.quickTime, isSelected && styles.quickTextSelected]} numberOfLines={1}>
                                  {displayTime(w.startTime ?? "")}
                                </Text>
                              </View>
                            ))}
                            {totalSlots > 2 && (
                              <Text style={[styles.quickMore, isSelected && styles.quickTextSelected]}>
                                +{totalSlots - 2}
                              </Text>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Calendar ─────────────────────────────────────── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="calendar" size={12} color={AstroColors.textMuted} />
                  <Text style={styles.sectionTitle}>Is mahine ki availability</Text>
                </View>
                <MonthCalendar
                  markedDates={markedDates}
                  selected={selectedDate}
                  onSelect={(d) => setSelectedDate(prev => prev === d ? null : d)}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Day slot detail sheet */}
      <DaySlotSheet
        visible={!!selectedDate}
        date={selectedDate}
        recurringSlots={selectedRecurring}
        overrideSlots={selectedOverrides}
        onDeleteRecurring={confirmDeleteRecurring}
        onDeleteOverride={confirmDeleteOverride}
        onEditRecurring={handleEditRecurring}
        onEditOverride={handleEditOverride}
        onAddSlot={() => {
          setSelectedDate(null);
          setSheetOpen(true);
        }}
        onClose={() => setSelectedDate(null)}
      />

      {/* Add slot sheet */}
      {sheetOpen ? (
        <AddSlotSheet
          visible
          existing={windows}
          onClose={() => setSheetOpen(false)}
          onSubmit={submit}
          onSubmitRecurring={submitRecurring}
          saving={create.isPending}
          savingRecurring={createRecurring.isPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  flex: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 10,
  },
  title: { ...AstroType.title, color: AstroColors.ink },
  sub: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: AstroColors.brandTint,
    borderRadius: AstroRadius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { ...AstroType.micro, color: AstroColors.brand, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: AstroColors.dangerTint,
    alignItems: "center", justifyContent: "center",
  },
  addWrap: { borderRadius: AstroRadius.pill, overflow: "hidden", ...AstroShadow.soft },
  add: { height: 36, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 4 },
  addText: { ...AstroType.button, fontSize: 13, color: AstroColors.onBrand },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },

  // ── Section ───────────────────────────────────────────────────
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { ...AstroType.micro, color: AstroColors.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },

  // ── Quick-glance cards ────────────────────────────────────────
  quickRow: { flexDirection: "row", gap: 8 },
  quickCell: {
    flex: 1,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg ?? 14,
    borderWidth: 1,
    borderColor: AstroColors.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 0,
  },
  quickCellToday: {
    backgroundColor: AstroColors.brandTint,
    borderColor: AstroColors.brand,
    borderWidth: 1.5,
  },
  quickCellSelected: {
    backgroundColor: AstroColors.brand,
    borderColor: AstroColors.brand,
    borderWidth: 1.5,
  },
  quickTop: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  quickLabel: { ...AstroType.micro, color: AstroColors.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  quickLabelToday: { color: AstroColors.brand },
  quickLabelSelected: { color: "rgba(255,255,255,0.65)" },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: AstroColors.brand },
  quickDateNum: { ...AstroType.heading, color: AstroColors.ink, fontWeight: "800", lineHeight: 24 },
  quickDayName: { ...AstroType.micro, color: AstroColors.textMuted, marginBottom: 8 },
  quickTextSelected: { color: "#fff" },
  quickTextMuted: { color: "rgba(255,255,255,0.6)" },
  quickDivider: { width: "100%", height: 1, backgroundColor: AstroColors.border, marginBottom: 8 },
  quickDividerSelected: { backgroundColor: "rgba(255,255,255,0.2)" },
  quickEmptyRow: { paddingVertical: 2 },
  quickTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  quickDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  quickDotRecurring: { backgroundColor: AstroColors.brand },
  quickDotOverride: { backgroundColor: "#F59E0B" },
  quickDotSelected: { backgroundColor: "rgba(255,255,255,0.7)" },
  quickTime: { ...AstroType.micro, color: AstroColors.textSecondary, flex: 1 },
  quickMore: { ...AstroType.micro, color: AstroColors.brand, fontWeight: "700", marginTop: 2 },

  // ── Empty state ───────────────────────────────────────────────
  empty: {
    alignItems: "center", backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg, padding: 32, gap: 8, marginTop: 8, ...AstroShadow.soft,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { ...AstroType.body, fontWeight: "800", color: AstroColors.text },
  emptyText: { ...AstroType.caption, color: AstroColors.textSecondary, textAlign: "center", lineHeight: 18 },
  emptyBtn: {
    minHeight: MIN_TOUCH, paddingHorizontal: 24, marginTop: 8,
    borderRadius: AstroRadius.pill, borderWidth: 1.5, borderColor: AstroColors.brand,
    alignItems: "center", justifyContent: "center",
  },
  emptyBtnText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },
});