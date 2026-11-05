import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  copyForKind,
  isPaymentFailureKind,
  type PaymentFailureCopy,
} from "../utils/paymentFailure";

const TONES: Record<PaymentFailureCopy["tone"], { bg: string; fg: string; ring: string }> = {
  neutral: { bg: AstroColors.brandTint, fg: AstroColors.brand, ring: AstroColors.brandTintStrong },
  danger: { bg: AstroColors.dangerTint, fg: AstroColors.danger, ring: "#FECACA" },
  warning: { bg: AstroColors.goldTint, fg: AstroColors.goldDeep, ring: AstroColors.goldBorder },
};

export default function PaymentFailedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{
    kind?: string;
    detail?: string;
    source?: string;
    appointmentId?: string;
    astroId?: string;
    serviceId?: string;
    variantId?: string;
    scheduledAt?: string;
  }>();
  const [showDetail, setShowDetail] = useState(false);

  const copy = copyForKind(isPaymentFailureKind(p.kind) ? p.kind : "unknown");
  const tone = TONES[copy.tone];
  const fromCart = p.source === "cart";
  const canRebook = !!(p.astroId && p.serviceId && p.scheduledAt);

  const goBookings = () => router.replace("/(user)/my-bookings" as any);

  // Primary action reason ke hisaab se badalta hai
  let primary: { label: string; onPress: () => void } | null = null;
  if (copy.kind === "verify") {
    primary = { label: "View My Bookings", onPress: goBookings };
  } else if (copy.changeSlot) {
    primary = fromCart
      ? { label: "Back to Cart", onPress: () => router.replace("/(user)/cart" as any) }
      : canRebook
        ? {
            label: "Pick a Different Slot",
            onPress: () =>
              router.replace({
                pathname: "/(user)/book-slot" as any,
                params: { astroId: p.astroId, serviceId: p.serviceId, variantId: p.variantId },
              }),
          }
        : null;
  } else if (copy.canRetry) {
    primary = fromCart
      ? { label: "Back to Cart", onPress: () => router.replace("/(user)/cart" as any) }
      : canRebook
        ? {
            label: "Try Again",
            onPress: () =>
              router.replace({
                pathname: "/(user)/checkout" as any,
                params: {
                  astroId: p.astroId,
                  serviceId: p.serviceId,
                  variantId: p.variantId,
                  scheduledAt: p.scheduledAt,
                },
              }),
          }
        : null;
  }

  const showSupport = copy.kind === "server" || copy.kind === "verify" || copy.kind === "unknown";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LinearGradient
        colors={[AstroColors.canvasHeader, AstroColors.canvas]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Payment</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.iconRing, { backgroundColor: tone.ring }]}>
          <View style={[styles.iconCircle, { backgroundColor: tone.bg }]}>
            <Feather name={copy.icon} size={34} color={tone.fg} />
          </View>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.message}>{copy.message}</Text>

        <View style={styles.tips}>
          {copy.tips.map((t) => (
            <View key={t} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: tone.fg }]} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </View>

        {p.detail ? (
          <View style={styles.detailWrap}>
            <TouchableOpacity
              style={styles.detailToggle}
              onPress={() => setShowDetail((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.detailToggleText}>Technical details</Text>
              <Feather
                name={showDetail ? "chevron-up" : "chevron-down"}
                size={14}
                color={AstroColors.textMuted}
              />
            </TouchableOpacity>
            {showDetail ? (
              <Text style={styles.detailText} selectable>
                {p.detail}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        {primary ? (
          <TouchableOpacity activeOpacity={0.85} onPress={primary.onPress} style={styles.primaryWrap}>
            <LinearGradient
              colors={[AstroColors.brandLight, AstroColors.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{primary.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
        <View style={styles.secondaryRow}>
          {copy.kind !== "verify" ? (
            <TouchableOpacity style={styles.secondary} onPress={goBookings}>
              <Text style={styles.secondaryText}>My Bookings</Text>
            </TouchableOpacity>
          ) : null}
          {showSupport ? (
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => router.push("/(user)/help-support" as any)}
            >
              <Feather name="life-buoy" size={15} color={AstroColors.brand} />
              <Text style={styles.secondaryText}>Support</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  header: { alignItems: "center", paddingVertical: 14 },
  headerTitle: { ...AstroType.heading, color: AstroColors.ink },
  content: { alignItems: "center", paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, flexGrow: 1 },
  iconRing: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  title: { ...AstroType.title, color: AstroColors.ink, textAlign: "center", marginTop: 24 },
  message: {
    ...AstroType.body,
    fontWeight: "400",
    lineHeight: 22,
    color: AstroColors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  tips: {
    alignSelf: "stretch",
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: 16,
    gap: 10,
    marginTop: 24,
    ...AstroShadow.soft,
  },
  tipRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, ...AstroType.body, fontWeight: "400", lineHeight: 21, color: AstroColors.text },
  detailWrap: { alignSelf: "stretch", marginTop: 16, alignItems: "center" },
  detailToggle: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  detailToggleText: { ...AstroType.caption, color: AstroColors.textMuted },
  detailText: {
    ...AstroType.caption,
    color: AstroColors.textSecondary,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md,
    padding: 12,
    marginTop: 6,
    alignSelf: "stretch",
  },
  bar: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: AstroColors.surface,
    borderTopLeftRadius: AstroRadius.xl,
    borderTopRightRadius: AstroRadius.xl,
    ...AstroShadow.card,
  },
  primaryWrap: { borderRadius: AstroRadius.pill, overflow: "hidden" },
  primary: { height: 50, alignItems: "center", justifyContent: "center" },
  primaryText: { ...AstroType.button, color: AstroColors.onBrand },
  secondaryRow: { flexDirection: "row", gap: 10 },
  secondary: {
    flex: 1,
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
  },
  secondaryText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },
});
