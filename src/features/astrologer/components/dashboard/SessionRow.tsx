import { AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH } from "@/constants/astro-theme";
import type { AppointmentDetailed } from "@/features/consultation/types";
import { formatPrice } from "../../utils/cardFormat";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SessionRow({
  appt,
  live,
  onPress,
}: {
  appt: AppointmentDetailed;
  live?: boolean;
  onPress: () => void;
}) {
  const d = new Date(appt.scheduledAt);
  const day = d.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const price = formatPrice(appt.price ?? appt.service.price);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityLabel={`${appt.service.title}, ${day} ${month} ${time}`}
    >
      <View style={[styles.date, live && styles.dateLive]}>
        <Text style={[styles.day, live && styles.liveText]}>{day}</Text>
        <Text style={[styles.month, live && styles.liveText]}>{month}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.title} numberOfLines={1}>
          {appt.userName ?? "Client"} · {appt.service.title}
        </Text>
        <Text style={styles.meta}>
          {live ? "Live now" : time} · {appt.durationMinutes} min
        </Text>
      </View>
      {price ? <Text style={styles.price}>{price}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: MIN_TOUCH + 20,
    padding: 12,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    ...AstroShadow.soft,
  },
  date: {
    width: 48,
    height: 52,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLive: { backgroundColor: AstroColors.brand },
  day: { fontSize: 17, fontWeight: "800", color: AstroColors.brand, lineHeight: 20 },
  month: { ...AstroType.micro, color: AstroColors.brand, textTransform: "uppercase" },
  liveText: { color: AstroColors.onBrand },
  title: { ...AstroType.body, fontWeight: "700", color: AstroColors.text },
  meta: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 2 },
  price: { ...AstroType.heading, color: AstroColors.ink },
});
