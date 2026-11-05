import { AstroColors, AstroRadius, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AvailabilityWindow, RecurringAvailability } from "../../types";
import { displayTime, durationLabel } from "../../utils/availability";
import EditSlotSheet from "./EditSlotSheet";

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateHeader(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${DOW_LABEL[d.getDay()]}, ${d.getDate()} ${MON_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

type EditTarget =
  | { kind: "recurring"; slot: RecurringAvailability }
  | { kind: "override"; slot: AvailabilityWindow };

type Props = {
  visible: boolean;
  date: string | null;
  recurringSlots: RecurringAvailability[];
  overrideSlots: AvailabilityWindow[];
  onDeleteRecurring: (r: RecurringAvailability) => void;
  onDeleteOverride: (w: AvailabilityWindow) => void;
  onEditRecurring: (r: RecurringAvailability, newStart: string, newEnd: string) => Promise<void>;
  onEditOverride: (w: AvailabilityWindow, newStart: string, newEnd: string) => Promise<void>;
  onAddSlot: () => void;
  onClose: () => void;
};

export default function DaySlotSheet({
  visible, date, recurringSlots, overrideSlots,
  onDeleteRecurring, onDeleteOverride,
  onEditRecurring, onEditOverride,
  onAddSlot, onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const hasAny = recurringSlots.length > 0 || overrideSlots.length > 0;
  const dayName = date ? DOW_LABEL[new Date(`${date}T00:00:00`).getDay()] ?? "" : "";

  const handleSaveEdit = async (newStart: string, newEnd: string) => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      if (editTarget.kind === "recurring") {
        await onEditRecurring(editTarget.slot, newStart, newEnd);
      } else {
        await onEditOverride(editTarget.slot, newStart, newEnd);
      }
      setEditTarget(null);
    } finally {
      setEditSaving(false);
    }
  };

  const editLabel = editTarget
    ? editTarget.kind === "recurring"
      ? `${dayName} · Recurring`
      : `${date ? formatDateHeader(date) : ""} · Override`
    : "";

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.dateLabel}>{date ? formatDateHeader(date) : ""}</Text>
              <Text style={styles.dateSub}>
                {hasAny ? `${recurringSlots.length + overrideSlots.length} slot${recurringSlots.length + overrideSlots.length !== 1 ? "s" : ""}` : "No slots"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Feather name="x" size={20} color={AstroColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Recurring slots */}
            {recurringSlots.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="repeat" size={12} color={AstroColors.brand} />
                  <Text style={styles.sectionTitle}>Recurring ({dayName})</Text>
                </View>
                {recurringSlots.map((r) => (
                  <View key={r.id} style={styles.slotRow}>
                    <View style={styles.slotLeft}>
                      <Text style={styles.slotTime}>
                        {displayTime(r.startTime)} – {displayTime(r.endTime)}
                      </Text>
                      <Text style={styles.slotDur}>{durationLabel(r.startTime, r.endTime)}</Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEditTarget({ kind: "recurring", slot: r })}
                        hitSlop={4}
                        accessibilityLabel="Edit slot"
                      >
                        <Feather name="edit-2" size={15} color={AstroColors.brand} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onDeleteRecurring(r)}
                        hitSlop={4}
                        accessibilityLabel="Remove slot"
                      >
                        <Feather name="trash-2" size={15} color={AstroColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Override slots */}
            {overrideSlots.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="calendar" size={12} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: "#F59E0B" }]}>This day only</Text>
                </View>
                {overrideSlots.map((w) => (
                  <View key={w.id} style={styles.slotRow}>
                    <View style={styles.slotLeft}>
                      <Text style={styles.slotTime}>
                        {displayTime(w.startTime ?? "")} – {displayTime(w.endTime ?? "")}
                      </Text>
                      <Text style={styles.slotDur}>{durationLabel(w.startTime ?? "", w.endTime ?? "")}</Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEditTarget({ kind: "override", slot: w })}
                        hitSlop={4}
                        accessibilityLabel="Edit slot"
                      >
                        <Feather name="edit-2" size={15} color={AstroColors.brand} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onDeleteOverride(w)}
                        hitSlop={4}
                        accessibilityLabel="Remove slot"
                      >
                        <Feather name="trash-2" size={15} color={AstroColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty */}
            {!hasAny && (
              <View style={styles.empty}>
                <Feather name="clock" size={28} color={AstroColors.textMuted} />
                <Text style={styles.emptyText}>Is din koi availability nahi hai</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={onAddSlot} activeOpacity={0.85}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Is din slot add karo</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit time sheet — slides over the day sheet */}
      {editTarget && (
        <EditSlotSheet
          visible
          initialStart={
            editTarget.kind === "recurring"
              ? editTarget.slot.startTime
              : editTarget.slot.startTime ?? "09:00"
          }
          initialEnd={
            editTarget.kind === "recurring"
              ? editTarget.slot.endTime
              : editTarget.slot.endTime ?? "10:00"
          }
          label={editLabel}
          saving={editSaving}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: AstroColors.canvas,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: AstroColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  dateLabel: { ...AstroType.heading, color: AstroColors.ink, fontWeight: "700" },
  dateSub: { ...AstroType.caption, color: AstroColors.textMuted, marginTop: 2 },
  closeBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", marginRight: -8 },

  body: { flexGrow: 0 },

  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  sectionTitle: { ...AstroType.micro, fontWeight: "700", color: AstroColors.brand, textTransform: "uppercase", letterSpacing: 0.5 },

  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md ?? 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  slotLeft: { flex: 1 },
  slotTime: { ...AstroType.body, color: AstroColors.text, fontWeight: "600" },
  slotDur: { ...AstroType.caption, color: AstroColors.textMuted, marginTop: 1 },

  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },

  empty: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyText: { ...AstroType.body, color: AstroColors.textMuted },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.pill,
    height: 48,
    marginTop: 12,
  },
  addBtnText: { ...AstroType.button, color: "#fff" },
});