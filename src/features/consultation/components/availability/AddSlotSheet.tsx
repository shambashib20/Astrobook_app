import { AstroColors, AstroRadius, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AvailabilityWindow } from "../../types";
import {
  TIME_PRESETS,
  dayName,
  displayTime,
  durationLabel,
  makeTime,
  shortDate,
  timeToMinutes,
  toApiDate,
  toApiTime,
  upcomingDays,
  validateSlot,
} from "../../utils/availability";

type Tab = "specific" | "recurring";

// Mon–Sun in display order (Mon first, Sun last)
const DOW_CHIPS: { label: string; day: number }[] = [
  { label: "Mon", day: 1 },
  { label: "Tue", day: 2 },
  { label: "Wed", day: 3 },
  { label: "Thu", day: 4 },
  { label: "Fri", day: 5 },
  { label: "Sat", day: 6 },
  { label: "Sun", day: 0 },
];

type Props = {
  visible: boolean;
  existing: AvailabilityWindow[];
  saving: boolean;
  savingRecurring: boolean;
  onClose: () => void;
  /** true = save ho gaya, sheet band hogi */
  onSubmit: (dates: string[], startTime: string, endTime: string) => Promise<boolean>;
  /** Recurring save — true = success, sheet band hogi */
  onSubmitRecurring: (daysOfWeek: number[], startTime: string, endTime: string) => Promise<boolean>;
};

const QUICK_DAYS = 7;

export default function AddSlotSheet({ visible, existing, saving, savingRecurring, onClose, onSubmit, onSubmitRecurring }: Props) {
  const insets = useSafeAreaInsets();
  const quick = upcomingDays(QUICK_DAYS);

  const [tab, setTab] = useState<Tab>("specific");

  // Specific-date state
  const [dates, setDates] = useState<string[]>([quick[0]!]);

  // Recurring state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Shared time state
  const [start, setStart] = useState(makeTime(11, 0));
  const [end, setEnd] = useState(makeTime(13, 0));
  const [picker, setPicker] = useState<null | "start" | "end" | "date">(null);
  const [error, setError] = useState<string | null>(null);

  const startStr = toApiTime(start);
  const endStr = toApiTime(end);
  const dur = durationLabel(startStr, endStr);

  // Hafte ke baahar ki chuni hui dates bhi chips mein dikhti hain
  const extraDates = dates.filter((d) => !quick.includes(d)).sort();

  const toggleDate = (d: string) => {
    setError(null);
    setDates((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const toggleDay = (day: number) => {
    setError(null);
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const isBusy = tab === "specific" ? saving : savingRecurring;

  const save = async () => {
    if (isBusy) return;
    setError(null);

    if (tab === "specific") {
      const problem = validateSlot(dates, startStr, endStr, existing);
      if (problem) { setError(problem); return; }
      if (await onSubmit(dates, startStr, endStr)) onClose();
    } else {
      if (selectedDays.length === 0) { setError("Select at least one day"); return; }
      if (timeToMinutes(startStr) >= timeToMinutes(endStr)) { setError("End time must be after start time"); return; }
      if (await onSubmitRecurring(selectedDays, startStr, endStr)) onClose();
    }
  };

  const onPick = (kind: "start" | "end" | "date") => (_: unknown, value?: Date) => {
    setPicker(Platform.OS === "ios" ? kind : null);
    if (!value) return;
    setError(null);
    if (kind === "start") setStart(value);
    else if (kind === "end") setEnd(value);
    else {
      const d = toApiDate(value);
      setDates((prev) => (prev.includes(d) ? prev : [...prev, d]));
    }
  };

  const specificSummary = dates.length > 0 && dur ? `${dates.length} day${dates.length !== 1 ? "s" : ""} · ${dur} each` : null;
  const recurringSummary = selectedDays.length > 0 && dur
    ? `${selectedDays.length} day${selectedDays.length !== 1 ? "s" : ""} · ${dur} every week`
    : null;

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grab} />

        {/* Header bar */}
        <View style={styles.bar}>
          <TouchableOpacity style={styles.barBtn} onPress={onClose} accessibilityLabel="Close">
            <Feather name="x" size={22} color={AstroColors.ink} />
          </TouchableOpacity>
          <Text style={styles.barTitle}>Add Slot</Text>
          <TouchableOpacity onPress={save} disabled={isBusy} activeOpacity={0.85} accessibilityLabel="Save">
            <LinearGradient colors={[AstroColors.brandLight, AstroColors.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.save}>
              {isBusy ? <ActivityIndicator size="small" color={AstroColors.onBrand} /> : <Text style={styles.saveText}>Save</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "specific" && styles.tabBtnOn]}
            onPress={() => switchTab("specific")}
            accessibilityState={{ selected: tab === "specific" }}
          >
            <Feather name="calendar" size={14} color={tab === "specific" ? AstroColors.brand : AstroColors.textMuted} />
            <Text style={[styles.tabText, tab === "specific" && styles.tabTextOn]}>Specific dates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "recurring" && styles.tabBtnOn]}
            onPress={() => switchTab("recurring")}
            accessibilityState={{ selected: tab === "recurring" }}
          >
            <Feather name="repeat" size={14} color={tab === "recurring" ? AstroColors.brand : AstroColors.textMuted} />
            <Text style={[styles.tabText, tab === "recurring" && styles.tabTextOn]}>Recurring</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {tab === "specific" ? (
            <>
              <Text style={styles.label}>Kin dino ke liye?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {quick.map((d) => (
                  <DayChip key={d} top={dayName(d)} bottom={shortDate(d)} on={dates.includes(d)} onPress={() => toggleDate(d)} />
                ))}
                {extraDates.map((d) => (
                  <DayChip key={d} top={dayName(d)} bottom={shortDate(d)} on onPress={() => toggleDate(d)} />
                ))}
                <TouchableOpacity style={[styles.chip, styles.chipMore]} onPress={() => setPicker("date")} accessibilityLabel="Aur date chuno">
                  <Feather name="calendar" size={16} color={AstroColors.brand} />
                  <Text style={styles.moreText}>Aur</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.label}>Which days? (every week)</Text>
              <View style={styles.dowRow}>
                {DOW_CHIPS.map(({ label, day }) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dowChip, selectedDays.includes(day) && styles.dowChipOn]}
                    onPress={() => toggleDay(day)}
                    accessibilityState={{ selected: selectedDays.includes(day) }}
                  >
                    <Text style={[styles.dowText, selectedDays.includes(day) && styles.dowTextOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.label, { marginTop: 18 }]}>Kitne baje?</Text>
          <View style={styles.timeRow}>
            <TimeField label="Shuru" value={displayTime(startStr)} onPress={() => setPicker("start")} />
            <Feather name="arrow-right" size={16} color={AstroColors.textMuted} />
            <TimeField label="Khatam" value={displayTime(endStr)} onPress={() => setPicker("end")} />
          </View>

          <View style={styles.presets}>
            {TIME_PRESETS.map((p) => {
              const on = startStr === toApiTime(makeTime(p.start[0], p.start[1])) && endStr === toApiTime(makeTime(p.end[0], p.end[1]));
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.preset, on && styles.presetOn]}
                  onPress={() => {
                    setError(null);
                    setStart(makeTime(p.start[0], p.start[1]));
                    setEnd(makeTime(p.end[0], p.end[1]));
                  }}
                >
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={AstroColors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (tab === "specific" ? specificSummary : recurringSummary) ? (
            <Text style={styles.summary}>{tab === "specific" ? specificSummary : recurringSummary}</Text>
          ) : null}
        </ScrollView>

        {picker === "start" || picker === "end" ? (
          <DateTimePicker
            value={picker === "start" ? start : end}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPick(picker)}
          />
        ) : null}
        {picker === "date" ? (
          <DateTimePicker value={new Date()} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} minimumDate={new Date()} onChange={onPick("date")} />
        ) : null}
      </View>
    </Modal>
  );
}

function DayChip({ top, bottom, on, onPress }: { top: string; bottom: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, on && styles.chipOn]} onPress={onPress} accessibilityState={{ selected: on }}>
      <Text style={[styles.chipTop, on && styles.chipTextOn]}>{top}</Text>
      <Text style={[styles.chipBottom, on && styles.chipTextOn]}>{bottom}</Text>
    </TouchableOpacity>
  );
}

function TimeField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.timeField} onPress={onPress} activeOpacity={0.8} accessibilityLabel={`${label} time`}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: AstroColors.scrim },
  sheet: { backgroundColor: AstroColors.surface, borderTopLeftRadius: AstroRadius.xl, borderTopRightRadius: AstroRadius.xl, maxHeight: "92%" },
  grab: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: AstroColors.border, marginTop: 8 },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  barBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  barTitle: { flex: 1, ...AstroType.heading, color: AstroColors.ink },
  save: { height: 38, minWidth: 76, paddingHorizontal: 18, borderRadius: AstroRadius.pill, alignItems: "center", justifyContent: "center", marginRight: 8 },
  saveText: { ...AstroType.button, fontSize: 13, color: AstroColors.onBrand },

  // Tab switcher
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 4, backgroundColor: AstroColors.canvas, borderRadius: AstroRadius.md, padding: 3 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: AstroRadius.sm },
  tabBtnOn: { backgroundColor: AstroColors.surface },
  tabText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textMuted },
  tabTextOn: { color: AstroColors.brand },

  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  label: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary, marginBottom: 8 },
  chips: { gap: 8, paddingRight: 8 },
  chip: { width: 62, height: 58, borderRadius: AstroRadius.md, borderWidth: 1.5, borderColor: AstroColors.border, backgroundColor: AstroColors.surface, alignItems: "center", justifyContent: "center", gap: 1 },
  chipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipMore: { borderStyle: "dashed", borderColor: AstroColors.brand, gap: 3 },
  chipTop: { ...AstroType.micro, color: AstroColors.textSecondary },
  chipBottom: { ...AstroType.body, fontWeight: "800", color: AstroColors.text },
  chipTextOn: { color: AstroColors.onBrand },
  moreText: { ...AstroType.micro, color: AstroColors.brand },

  // Day-of-week chips (recurring tab) — 7 fixed, wrap row
  dowRow: { flexDirection: "row", gap: 7 },
  dowChip: { flex: 1, height: 44, borderRadius: AstroRadius.md, borderWidth: 1.5, borderColor: AstroColors.border, backgroundColor: AstroColors.surface, alignItems: "center", justifyContent: "center" },
  dowChipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  dowText: { ...AstroType.micro, fontWeight: "700", color: AstroColors.textSecondary },
  dowTextOn: { color: AstroColors.onBrand },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeField: { flex: 1, minHeight: 60, borderRadius: AstroRadius.md, backgroundColor: AstroColors.canvas, borderWidth: 1.5, borderColor: AstroColors.border, paddingHorizontal: 14, paddingVertical: 8, justifyContent: "center" },
  timeLabel: { ...AstroType.micro, color: AstroColors.textMuted },
  timeValue: { ...AstroType.heading, color: AstroColors.text, marginTop: 1 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  preset: { minHeight: 36, paddingHorizontal: 14, borderRadius: AstroRadius.pill, backgroundColor: AstroColors.brandTint, alignItems: "center", justifyContent: "center" },
  presetOn: { backgroundColor: AstroColors.brand },
  presetText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.brand },
  presetTextOn: { color: AstroColors.onBrand },
  summary: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 16, textAlign: "center" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, padding: 12, borderRadius: AstroRadius.md, backgroundColor: AstroColors.dangerTint },
  errorText: { flex: 1, ...AstroType.caption, color: AstroColors.danger, lineHeight: 17 },
});