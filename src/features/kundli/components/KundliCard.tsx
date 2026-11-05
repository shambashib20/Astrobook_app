// ─── KundliCard ───────────────────────────────────────────────────────────────
// Profile page pe dikhta hai — sirf key signs + "View Full Chart" button.
// Full experience Astroverse tab mein hai.

import {
  AstroColors,
  AstroRadius,
  AstroType,
} from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { KundliData } from "../services";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KundliCard({
  kundli,
  hasBirthDetails,
  loading,
  onGenerate,
  onViewFullChart,
}: {
  kundli: KundliData | null;
  hasBirthDetails: boolean;
  loading: boolean;
  onGenerate: () => void;
  onViewFullChart?: () => void;
}) {
  // ── State 1: Birth details nahi hain ────────────────────────────────────────
  if (!hasBirthDetails) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔮</Text>
        <Text style={styles.emptyTitle}>View Your Kundli</Text>
        <Text style={styles.emptySubtitle}>
          Add your birth time and place in "Edit Profile" — then view your
          Kundli for free.
        </Text>
      </View>
    );
  }

  // ── State 2: Birth details hain lekin Kundli generate nahi ─────────────────
  if (!kundli) {
    return (
      <View style={styles.generateWrapper}>
        <Text style={styles.headerTitle}>✨ Vedic Kundli</Text>
        <Text style={styles.generateText}>
          Birth details saved. Generate your Kundli now!
        </Text>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={onGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Feather name="zap" size={16} color="#FFF" />
              <Text style={styles.generateBtnText}>Generate My Kundli</Text>
            </>
          )}
        </TouchableOpacity>
        {loading && (
          <Text style={styles.loadingHint}>
            Fetching your Kundli — this takes 5–10 seconds…
          </Text>
        )}
      </View>
    );
  }

  // ── State 3: Kundli ready — sirf key signs ──────────────────────────────────
  const { chart, birth } = kundli;

  const signs = [
    chart.lagna   ? { icon: "♈", label: "LAGNA",    value: chart.lagna }   : null,
    chart.rashi   ? { icon: "🌙", label: "RASHI",    value: chart.rashi }   : null,
    chart.sunSign ? { icon: "☀️", label: "SUN SIGN", value: chart.sunSign } : null,
    chart.nakshatra
      ? {
          icon: "⭐",
          label: "NAKSHATRA",
          value: chart.nakshatra + (chart.nakshatraPada ? ` P${chart.nakshatraPada}` : ""),
        }
      : null,
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <View style={styles.readyWrapper}>
      {/* Gradient header */}
      <LinearGradient
        colors={["#4F0080", "#9D0399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <Text style={styles.gradientTitle}>✨ Vedic Kundli</Text>
        {birth.place ? (
          <Text style={styles.gradientSubtitle}>
            {birth.place}
            {birth.date ? `  ·  ${formatDate(birth.date)}` : ""}
          </Text>
        ) : null}
      </LinearGradient>

      <View style={styles.body}>
        {/* Key signs */}
        <View style={styles.signsGrid}>
          {signs.map((s) => (
            <View key={s.label} style={styles.signChip}>
              <Text style={styles.signIcon}>{s.icon}</Text>
              <View>
                <Text style={styles.signLabel}>{s.label}</Text>
                <Text style={styles.signValue}>{s.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* View full chart button */}
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={onViewFullChart}
          activeOpacity={0.75}
        >
          <Text style={styles.viewBtnText}>View Full Chart</Text>
          <Feather name="arrow-right" size={14} color={AstroColors.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // State 1: Empty
  emptyState: { alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { ...AstroType.heading, color: AstroColors.ink, textAlign: "center" },
  emptySubtitle: {
    ...AstroType.body,
    color: AstroColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // State 2: Generate
  generateWrapper: { gap: 12 },
  headerTitle: { ...AstroType.heading, color: AstroColors.ink },
  generateText: { ...AstroType.body, color: AstroColors.textSecondary, lineHeight: 20 },
  generateBtn: {
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
    shadowColor: AstroColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  loadingHint: {
    ...AstroType.caption,
    color: AstroColors.textMuted,
    textAlign: "center",
  },

  // State 3: Ready
  readyWrapper: {
    marginHorizontal: -20,
    overflow: "hidden",
    borderRadius: AstroRadius.lg,
  },
  gradientHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
  },
  gradientTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  gradientSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)" },

  body: { padding: 18, gap: 14 },

  signsGrid: { gap: 12 },
  signChip: { flexDirection: "row", alignItems: "center", gap: 10 },
  signIcon: { fontSize: 18, width: 24, textAlign: "center" },
  signLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AstroColors.textMuted,
    letterSpacing: 0.4,
  },
  signValue: { fontSize: 15, color: AstroColors.ink, fontWeight: "700", marginTop: 1 },

  // "View Full Chart →" button
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.border,
    marginTop: 2,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: AstroColors.brand,
  },
});