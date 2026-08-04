import Header from "@/components/header";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { consultationService } from "@/features/consultation/service";
import type { ConsultationServiceVariant, TimeSlot } from "@/features/consultation/types";
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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function displayTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function groupSlots(slots: TimeSlot[]) {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];
  slots.forEach((slot) => {
    const hour = new Date(slot.startTime).getHours();
    if (hour < 12) morning.push(slot);
    else if (hour < 17) afternoon.push(slot);
    else evening.push(slot);
  });
  return { morning, afternoon, evening };
}

export default function BookSlotScreen() {
  const router = useRouter();
  const { astroId, serviceId, variantId } = useLocalSearchParams<{
    astroId: string;
    serviceId: string;
    variantId?: string;
  }>();

  const {
    astrologer,
    services,
    loading: profileLoading,
    fetchProfile,
  } = useAstrologerProfile(astroId);
  const service = services.find((s) => s.id === serviceId) ?? null;

  // Hook khud fetch trigger nahi karta — yeh missing tha, isi wajah se
  // yeh screen hamesha loading pe atki rehti thi
  useEffect(() => {
    fetchProfile();
  }, [astroId]);

  // Konsa duration/price variant select hua tha (service detail page se
  // aata hai) — booking summary strip aur slots yahi duration use karte hain
  const [variant, setVariant] = useState<ConsultationServiceVariant | null>(
    null,
  );
  useEffect(() => {
    if (!serviceId) return;
    consultationService
      .getServiceVariants(serviceId)
      .then((variants) => {
        const match = variantId
          ? variants.find((v) => v.id === variantId)
          : variants.find((v) => v.isDefault);
        setVariant(match ?? variants[0] ?? null);
      })
      .catch(() => setVariant(null));
  }, [serviceId, variantId]);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Astrologer ke saare upcoming available dates fetch karo
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

  // Date change hone pe uss din ke slots fetch karo — variant ki duration
  // se slot length decide hoti hai
  useEffect(() => {
    if (!astroId || !serviceId || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    consultationService
      .getSlots({
        astrologerId: astroId,
        serviceId,
        variantId: variant?.id,
        date: selectedDate,
      })
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [astroId, serviceId, selectedDate, variant?.id]);

  const { morning, afternoon, evening } = groupSlots(slots);

  const handleProceedToCheckout = () => {
    if (!selectedSlot || !astrologer || !service) return;
    router.push({
      pathname: "/(user)/checkout" as any,
      params: {
        astroId: astrologer.id,
        serviceId: service.id,
        variantId: variant?.id,
        scheduledAt: selectedSlot.startTime,
      },
    });
  };

  const renderSlotGroup = (label: string, icon: string, group: TimeSlot[]) => {
    if (group.length === 0) return null;
    const availableCount = group.filter((s) => s.available).length;

    return (
      <View style={styles.slotGroup}>
        <View style={styles.slotGroupHeader}>
          <Text style={styles.slotGroupIcon}>{icon}</Text>
          <Text style={styles.slotGroupLabel}>{label}</Text>
          <View
            style={
              availableCount > 0
                ? styles.availableBadge
                : styles.unavailableBadge
            }
          >
            <Text
              style={
                availableCount > 0
                  ? styles.availableBadgeText
                  : styles.unavailableBadgeText
              }
            >
              {availableCount > 0 ? `${availableCount} slots` : "Full"}
            </Text>
          </View>
        </View>

        <View style={styles.slotsGrid}>
          {group.map((slot) => {
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
                activeOpacity={0.7}
              >
                {isSelected && (
                  <Feather
                    name="check-circle"
                    size={12}
                    color="#FFF"
                    style={{ marginRight: 5 }}
                  />
                )}
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
      </View>
    );
  };

  if (profileLoading || !astrologer || !service) {
    return (
      <View style={[styles.root, styles.centerFill]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header />

      {/* ── Service Summary Strip ── */}
      <View style={styles.serviceStrip}>
        <View style={styles.stripAvatar}>
          <Text style={{ fontSize: 20 }}>{astrologer.meta?.emoji ?? "🔮"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripServiceName} numberOfLines={1}>
            {service.title}
          </Text>
          <Text style={styles.stripAstroName}>with {astrologer.name}</Text>
        </View>
        <View style={styles.stripRight}>
          <View style={styles.stripChip}>
            <Text style={styles.stripChipText}>
              ⏱ {variant?.durationMinutes ?? service.durationMinutes} min
            </Text>
          </View>
          <View style={styles.stripPriceChip}>
            <Text style={styles.stripPriceText}>
              ₹{variant?.price ?? service.price ?? "—"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Date Picker ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>

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
                const isToday =
                  dateStr === new Date().toISOString().split("T")[0];
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardActive,
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dateDayText,
                        isSelected && styles.dateTextActive,
                      ]}
                    >
                      {isToday ? "Today" : DAY_LABELS[date.getDay()]}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumText,
                        isSelected && styles.dateTextActive,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    <Text
                      style={[
                        styles.dateMonText,
                        isSelected && styles.dateTextActive,
                      ]}
                    >
                      {MONTH_LABELS[date.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {selectedDate && (
          <View style={styles.selectedDatePill}>
            <Feather name="calendar" size={12} color="#7C3AED" />
            <Text style={styles.selectedDateText}>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                "en-IN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </Text>
          </View>
        )}

        {/* ── Time Slots ── */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Select Time</Text>
            </View>

            {slotsLoading ? (
              <ActivityIndicator color="#9d0399" style={{ marginTop: 8 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.noDatesText}>
                Is din koi slot available nahi hai
              </Text>
            ) : (
              <>
                {renderSlotGroup("Morning", "🌅", morning)}
                {renderSlotGroup("Afternoon", "☀️", afternoon)}
                {renderSlotGroup("Evening", "🌙", evening)}
              </>
            )}
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Sticky Bottom ── */}
      <View style={styles.bottomBar}>
        {selectedSlot ? (
          <View style={styles.selectedSlotConfirm}>
            <Feather name="check-circle" size={14} color="#9d0399" />
            <Text style={styles.selectedSlotConfirmText}>
              {selectedDate &&
                new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                  },
                )}
              {" · "}
              {displayTime(selectedSlot.startTime)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noSlotHint}>👆 Pick a date & time slot</Text>
        )}

        <TouchableOpacity
          style={[styles.proceedBtn, !selectedSlot && styles.btnDisabledFilled]}
          disabled={!selectedSlot}
          onPress={handleProceedToCheckout}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.proceedBtnText,
              !selectedSlot && styles.btnTextDisabled,
            ]}
          >
            Proceed • ₹{variant?.price ?? service.price ?? "—"}
          </Text>
          {selectedSlot && (
            <Feather
              name="arrow-right"
              size={15}
              color="#FFF"
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { alignItems: "center", justifyContent: "center" },

  serviceStrip: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FF",
    elevation: 3,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  stripAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
  },
  stripServiceName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  stripAstroName: {
    fontSize: 11,
    color: "#9d0399",
    fontWeight: "500",
    marginTop: 1,
  },
  stripRight: { alignItems: "flex-end", gap: 4 },
  stripChip: {
    backgroundColor: "#F5F0FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stripChipText: { fontSize: 10, color: "#6B21A8", fontWeight: "600" },
  stripPriceChip: {
    backgroundColor: "#9d039912",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#9d039930",
  },
  stripPriceText: { fontSize: 12, fontWeight: "800", color: "#9d0399" },

  section: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  noDatesText: { fontSize: 13, color: "#9CA3AF" },

  dateRow: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  dateCard: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    minWidth: 60,
  },
  dateCardActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
    elevation: 6,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  dateDayText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  dateNumText: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  dateMonText: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  dateTextActive: { color: "#FFF" },

  selectedDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  selectedDateText: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },

  slotGroup: { gap: 10, marginBottom: 6 },
  slotGroupHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  slotGroupIcon: { fontSize: 15 },
  slotGroupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    flex: 1,
  },
  availableBadge: {
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  availableBadgeText: { fontSize: 10, color: "#15803D", fontWeight: "700" },
  unavailableBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  unavailableBadgeText: { fontSize: 10, color: "#DC2626", fontWeight: "700" },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  slotPillUnavailable: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
  slotPillActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
    elevation: 5,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  slotPillText: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  slotPillTextUnavailable: { color: "#C4C4C4" },
  slotPillTextActive: { color: "#FFF" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
    gap: 10,
    elevation: 16,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  selectedSlotConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9F0FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  selectedSlotConfirmText: {
    fontSize: 12,
    color: "#9d0399",
    fontWeight: "700",
  },
  noSlotHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 13,
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  proceedBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  btnDisabledFilled: {
    backgroundColor: "#E5E7EB",
    elevation: 0,
    shadowOpacity: 0,
  },
  btnTextDisabled: { color: "#C4C4C4" },
});
