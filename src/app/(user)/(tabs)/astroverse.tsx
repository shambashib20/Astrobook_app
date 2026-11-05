// ─── AstroVerse ───────────────────────────────────────────────────────────────
// User ki full Kundli experience — planets, dashas, doshas, daily horoscope.
// Profile page pe sirf summary hai; sab kuch yahin milega.

import Header from "@/components/header";
import { AstroColors, AstroRadius, AstroShadow, AstroType } from "@/constants/astro-theme";
import { useUser } from "@/features/auth/store/auth.store";
import { useGenerateKundli, useMyKundli } from "@/features/kundli/hooks/useKundli";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Planet display order ─────────────────────────────────────────────────────
const PLANET_ORDER = [
  { key: "Sun",     icon: "☀️", label: "Sun" },
  { key: "Moon",    icon: "🌙", label: "Moon" },
  { key: "Mars",    icon: "🔴", label: "Mars" },
  { key: "Mercury", icon: "🟢", label: "Mercury" },
  { key: "Jupiter", icon: "🟡", label: "Jupiter" },
  { key: "Venus",   icon: "🩷", label: "Venus" },
  { key: "Saturn",  icon: "🪐", label: "Saturn" },
  { key: "Rahu",    icon: "☊",  label: "Rahu" },
  { key: "Ketu",    icon: "☋",  label: "Ketu" },
];

// ─── Daily insight by rashi ───────────────────────────────────────────────────
const RASHI_INSIGHTS: Record<string, string[]> = {
  Aries:       ["Today is a great day to start something new.", "Keep your energy focused — your goal is clear.", "Don't dwell on the past, move forward."],
  Taurus:      ["Be patient today — things will work out at their own pace.", "Focus on home and family.", "Avoid starting a new project today."],
  Gemini:      ["Your communication is very strong today.", "Talking to a friend or colleague will be beneficial.", "It's a good time to share a new idea."],
  Cancer:      ["Pay attention to your emotions — help someone in need.", "Get involved in household tasks.", "Trusting your intuition will be the right call today."],
  Leo:         ["Today the spotlight is on you — be bold.", "You'll have great energy for creative work.", "Show leadership and others will follow."],
  Virgo:       ["Pay attention to details — don't miss a thing.", "Focus on health and routine.", "Plan first, then execute."],
  Libra:       ["Relationships are important today.", "Find balance — listen to everyone before deciding.", "Art or design will captivate you today."],
  Scorpio:     ["Today is a day for deep thinking.", "Keep secrets to yourself.", "You'll find great success in research and analysis."],
  Sagittarius: ["Explore a new place or idea.", "Optimism is high — inspire those around you.", "Study or spiritual work will be rewarding today."],
  Capricorn:   ["Put full dedication into your work — your efforts will pay off.", "Stay focused on long-term goals.", "Discipline is your greatest asset today."],
  Aquarius:    ["Brainstorm something new with friends.", "An innovative idea will be quite powerful.", "Do something for others — it will feel rewarding."],
  Pisces:      ["The day will be wonderful for creativity and spirituality.", "Dream big, but stay realistic.", "Help someone who needs it."],
};

const DOSHA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Manglik Dosha":   { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5" },
  "Kaal Sarp Dosha": { bg: "#FFF7E0", text: "#B7791F", border: "#F6DFA4" },
  "Shani Sade Sati": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

function getDailyInsight(rashi: string | null): string {
  if (!rashi) return "Generate your Kundli to get today's cosmic insight.";
  const options = RASHI_INSIGHTS[rashi] ?? RASHI_INSIGHTS["Aries"]!;
  const idx = new Date().getDay() % options.length;
  return options[idx]!;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={sc.title}>{title}</Text>;
}
const sc = StyleSheet.create({
  title: { fontSize: 13, fontWeight: "800", color: AstroColors.textMuted, letterSpacing: 0.6, marginBottom: 4 },
});

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[card.root, style]}>{children}</View>;
}
const card = StyleSheet.create({
  root: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: 16,
    ...AstroShadow.card,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AstroVerse() {
  const router = useRouter();
  const sessionUser = useUser();
  const { profile } = useMyProfile();
  const { kundli, loading: kundliLoading } = useMyKundli();
  const { generate, loading: generating } = useGenerateKundli();

  const user = profile ?? sessionUser;
  const hasBirthDetails = Boolean(
    user?.dateOfBirth && (user as any)?.birthTime && (user as any)?.birthPlace,
  );

  // ── No birth details ─────────────────────────────────────────────────────────
  if (!hasBirthDetails) {
    return (
      <View style={styles.root}>
        <Header />
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyGradientIcon}>🔮</Text>
          <Text style={styles.emptyGradientTitle}>AstroVerse</Text>
          <Text style={styles.emptyGradientSub}>
            Add your full birth details to unlock your cosmic blueprint.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(user)/edit-profile" as any)}
            activeOpacity={0.85}
          >
            <Feather name="edit-2" size={15} color="#FFF" />
            <Text style={styles.emptyBtnText}>Add Birth Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (kundliLoading) {
    return (
      <View style={styles.root}>
        <Header />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={AstroColors.brand} />
          <Text style={{ color: AstroColors.textMuted, marginTop: 12 }}>Loading your Kundli...</Text>
        </View>
      </View>
    );
  }

  // ── No kundli yet — Generate CTA ─────────────────────────────────────────────
  if (!kundli) {
    return (
      <View style={styles.root}>
        <Header />
        <ScrollView contentContainerStyle={styles.generateContainer}>
          <LinearGradient colors={["#4F0080", "#9D0399"]} style={styles.generateGradient}>
            <Text style={styles.generateGradIcon}>✨</Text>
            <Text style={styles.generateGradTitle}>Vedic Kundli</Text>
            <Text style={styles.generateGradSub}>
              {(user as any)?.birthPlace} · {user?.dateOfBirth ? formatDate(user.dateOfBirth) : ""}
            </Text>
          </LinearGradient>
          <View style={styles.generateBody}>
            <Text style={styles.generateHeading}>Generate Your Kundli</Text>
            <Text style={styles.generateDesc}>
              According to Vedic astrology, the position of planets at the time of your birth
              reveals your destiny and personality. Discover it in just one click!
            </Text>
            <View style={styles.benefitList}>
              {["Lagna, Rashi & Sun Sign", "9 planetary positions & signs", "Mahadasha & Antardasha", "Doshas like Manglik & Kaal Sarp"].map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <Feather name="check-circle" size={14} color={AstroColors.success} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => generate()}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="zap" size={17} color="#FFF" />
                  <Text style={styles.generateBtnText}>Generate My Kundli — Free</Text>
                </>
              )}
            </TouchableOpacity>
            {generating && (
              <Text style={styles.generatingHint}>
                Calculating planetary positions... this takes 5–10 seconds
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Kundli ready — Full view ──────────────────────────────────────────────────
  const { chart, dasha, doshas, hasDoshas, planets, birth } = kundli;

  const dailyInsight = getDailyInsight(chart.rashi ?? chart.sunSign);

  // Parse planet positions if available
  const planetRows = planets
    ? PLANET_ORDER
        .filter((p) => (planets as any)[p.key])
        .map((p) => {
          const data = (planets as any)[p.key];
          return {
            ...p,
            rashi: data?.rashi ?? data?.sign ?? "—",
            house: data?.house ?? data?.bhava ?? null,
            retro: data?.retrograde === true || data?.isRetrograde === true,
          };
        })
    : [];

  return (
    <View style={styles.root}>
      <Header />
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#4F0080", "#9D0399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>✨ Vedic Kundli</Text>
        {birth.place ? (
          <Text style={styles.heroSub}>
            {birth.place}{birth.date ? `  ·  ${formatDate(birth.date)}` : ""}
            {birth.time ? `  ·  ${birth.time.slice(0, 5)}` : ""}
          </Text>
        ) : null}
      </LinearGradient>

      <View style={styles.sections}>

        {/* ── Today's Insight ──────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="AAJ KA RASHIFAL" />
          <Card style={styles.insightCard}>
            <LinearGradient
              colors={[AstroColors.brandTint, "#FFF1FF"]}
              style={styles.insightGrad}
            >
              <Text style={styles.insightIcon}>🌟</Text>
              <Text style={styles.insightRashi}>{chart.rashi ?? chart.sunSign ?? "—"}</Text>
              <Text style={styles.insightText}>{dailyInsight}</Text>
            </LinearGradient>
          </Card>
        </View>

        {/* ── Key Signs ────────────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="JANM KUNDLI — MUKHYA RAASHIYAAN" />
          <Card>
            <View style={styles.signsGrid}>
              {[
                { icon: "♈", label: "Lagna (Ascendant)", value: chart.lagna },
                { icon: "🌙", label: "Rashi (Moon Sign)", value: chart.rashi },
                { icon: "☀️", label: "Sun Sign",          value: chart.sunSign },
                { icon: "⭐", label: "Nakshatra",
                  value: chart.nakshatra
                    ? `${chart.nakshatra}${chart.nakshatraPada ? ` Pada ${chart.nakshatraPada}` : ""}`
                    : null },
                { icon: "🔱", label: "Lagna Lord", value: chart.lagnaLord },
                { icon: "🌊", label: "Rashi Lord", value: chart.rashiLord },
              ]
                .filter((r) => r.value)
                .map((row) => (
                  <View key={row.label} style={styles.signRow}>
                    <Text style={styles.signIcon}>{row.icon}</Text>
                    <View style={styles.signInfo}>
                      <Text style={styles.signLabel}>{row.label}</Text>
                      <Text style={styles.signValue}>{row.value}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </Card>
        </View>

        {/* ── Planets ──────────────────────────────────────────────────────── */}
        {planetRows.length > 0 ? (
          <View>
            <SectionHeader title="GRAH STHITI (PLANETARY POSITIONS)" />
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {/* Table header */}
              <View style={[styles.planetRow, styles.planetHeader]}>
                <Text style={[styles.planetCell, { flex: 1.5, color: AstroColors.textMuted }]}>GRAH</Text>
                <Text style={[styles.planetCell, { flex: 2, color: AstroColors.textMuted }]}>RASHI</Text>
                <Text style={[styles.planetCell, { flex: 1, color: AstroColors.textMuted, textAlign: "center" }]}>GHAR</Text>
              </View>
              {planetRows.map((p, i) => (
                <View
                  key={p.key}
                  style={[
                    styles.planetRow,
                    i % 2 === 0 ? styles.planetRowEven : styles.planetRowOdd,
                    i === planetRows.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.planetCell, { flex: 1.5, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                    <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                    <Text style={styles.planetName}>{p.label}</Text>
                  </View>
                  <Text style={[styles.planetCell, { flex: 2, color: AstroColors.ink, fontWeight: "600" }]}>
                    {p.rashi}{p.retro ? " ℞" : ""}
                  </Text>
                  <Text style={[styles.planetCell, { flex: 1, textAlign: "center", color: AstroColors.brand, fontWeight: "700" }]}>
                    {p.house ?? "—"}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* ── Mahadasha ────────────────────────────────────────────────────── */}
        {dasha.mahadasha ? (
          <View>
            <SectionHeader title="VIMSHOTTARI DASHA" />
            <Card>
              <View style={styles.dashaMain}>
                <View style={styles.dashaLabelRow}>
                  <Text style={styles.dashaTag}>MAHADASHA</Text>
                  {dasha.antardasha ? <Text style={styles.dashaTag}>ANTARDASHA</Text> : null}
                </View>
                <View style={styles.dashaValueRow}>
                  <Text style={styles.dashaMainValue}>{dasha.mahadasha}</Text>
                  {dasha.antardasha ? (
                    <>
                      <Feather name="chevron-right" size={18} color={AstroColors.textMuted} />
                      <Text style={styles.dashaSubValue}>{dasha.antardasha}</Text>
                    </>
                  ) : null}
                  {dasha.pratyantar ? (
                    <>
                      <Feather name="chevron-right" size={14} color={AstroColors.textMuted} />
                      <Text style={styles.dasha3rdValue}>{dasha.pratyantar}</Text>
                    </>
                  ) : null}
                </View>
                {dasha.mahadashaEnds ? (
                  <Text style={styles.dashaEndsText}>
                    Mahadasha ends: {formatDate(dasha.mahadashaEnds)}
                  </Text>
                ) : null}
              </View>

              {/* Dasha timeline */}
              {Array.isArray(dasha.timeline) && dasha.timeline.length > 0 ? (
                <View style={styles.timeline}>
                  <Text style={styles.timelineHeader}>DASHA TIMELINE</Text>
                  {dasha.timeline.slice(0, 6).map((item: any, i: number) => (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timelineDot} />
                      <Text style={styles.timelineName}>{item.planet ?? item.name ?? "—"}</Text>
                      <Text style={styles.timelineDate}>
                        {item.start ? formatDate(item.start) : ""}
                        {item.end ? ` → ${formatDate(item.end)}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* ── Doshas ───────────────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="DOSHA VICHAR" />
          <Card>
            {hasDoshas && doshas.length > 0 ? (
              <View style={styles.doshaList}>
                {doshas.map((d) => {
                  const clr = DOSHA_COLORS[d.name] ?? {
                    bg: AstroColors.brandTint,
                    text: AstroColors.brand,
                    border: AstroColors.border,
                  };
                  return (
                    <View
                      key={d.name}
                      style={[styles.doshaBadge, { backgroundColor: clr.bg, borderColor: clr.border }]}
                    >
                      <View style={styles.doshaTopRow}>
                        <Text style={[styles.doshaBadgeName, { color: clr.text }]}>{d.name}</Text>
                        {d.type ? (
                          <Text style={[styles.doshaBadgeType, { color: clr.text }]}>({d.type})</Text>
                        ) : null}
                      </View>
                      {d.detail ? (
                        <Text style={[styles.doshaDetail, { color: clr.text }]}>{d.detail}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDoshaRow}>
                <View style={styles.noDoshaIcon}>
                  <Feather name="shield" size={20} color={AstroColors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noDoshaTitle}>No Major Doshas Found</Text>
                  <Text style={styles.noDoshaDesc}>
                    Your Kundli has no major doshas — that's a great sign!
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* ── Regenerate ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.regenBtn}
          onPress={() => generate()}
          disabled={generating}
          activeOpacity={0.7}
        >
          {generating ? (
            <ActivityIndicator size="small" color={AstroColors.brand} />
          ) : (
            <>
              <Feather name="refresh-cw" size={14} color={AstroColors.brand} />
              <Text style={styles.regenText}>Regenerate Kundli</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  content: { paddingBottom: 32 },

  // ── Empty / no birth details ──────────────────────────────────────────────
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyGradientIcon:  { fontSize: 56 },
  emptyGradientTitle: { fontSize: 28, fontWeight: "900", color: AstroColors.ink },
  emptyGradientSub:   { fontSize: 15, color: AstroColors.textSecondary, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.pill,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
  },
  emptyBtnText: { fontWeight: "800", fontSize: 15, color: "#FFF" },

  // ── Generate CTA ──────────────────────────────────────────────────────────
  generateContainer: { paddingBottom: 32 },
  generateGradient: {
    padding: 28,
    alignItems: "center",
    gap: 6,
  },
  generateGradIcon:  { fontSize: 36 },
  generateGradTitle: { fontSize: 22, fontWeight: "900", color: "#FFF" },
  generateGradSub:   { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  generateBody: { padding: 20, gap: 16 },
  generateHeading: { ...AstroType.title, color: AstroColors.ink },
  generateDesc: { ...AstroType.body, color: AstroColors.textSecondary, lineHeight: 22 },
  benefitList: { gap: 10 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { ...AstroType.body, color: AstroColors.ink },
  generateBtn: {
    backgroundColor: AstroColors.brand,
    borderRadius: AstroRadius.pill,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    elevation: 4,
    shadowColor: AstroColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 4,
  },
  generateBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  generatingHint: {
    ...AstroType.caption,
    color: AstroColors.textMuted,
    textAlign: "center",
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: { padding: 20, paddingTop: 28, gap: 6 },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "#FFF" },
  heroSub:   { fontSize: 13, color: "rgba(255,255,255,0.75)" },

  sections: { padding: 16, gap: 20 },

  // ── Insight card ─────────────────────────────────────────────────────────
  insightCard: { padding: 0, overflow: "hidden" },
  insightGrad: { padding: 18, gap: 4, alignItems: "center" },
  insightIcon:  { fontSize: 28 },
  insightRashi: { fontSize: 18, fontWeight: "800", color: AstroColors.brand },
  insightText:  { ...AstroType.body, color: AstroColors.ink, textAlign: "center", lineHeight: 22, marginTop: 4 },

  // ── Signs ─────────────────────────────────────────────────────────────────
  signsGrid: { gap: 14 },
  signRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  signIcon:  { fontSize: 18, width: 26, textAlign: "center" },
  signInfo:  { flex: 1 },
  signLabel: { fontSize: 10, fontWeight: "700", color: AstroColors.textMuted, letterSpacing: 0.4 },
  signValue: { fontSize: 16, fontWeight: "800", color: AstroColors.ink, marginTop: 2 },

  // ── Planets table ─────────────────────────────────────────────────────────
  planetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: AstroColors.border,
  },
  planetHeader: { backgroundColor: AstroColors.canvas },
  planetRowEven: { backgroundColor: "#FFFFFF" },
  planetRowOdd:  { backgroundColor: AstroColors.canvas },
  planetCell: { fontSize: 12, fontWeight: "600", color: AstroColors.textMuted, letterSpacing: 0.3 },
  planetName: { fontSize: 13, fontWeight: "700", color: AstroColors.ink },

  // ── Dasha ────────────────────────────────────────────────────────────────
  dashaMain:      { gap: 6 },
  dashaLabelRow:  { flexDirection: "row", gap: 12 },
  dashaTag:       { fontSize: 10, fontWeight: "700", color: AstroColors.textMuted, letterSpacing: 0.5 },
  dashaValueRow:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  dashaMainValue: { fontSize: 22, fontWeight: "900", color: AstroColors.ink },
  dashaSubValue:  { fontSize: 17, fontWeight: "800", color: AstroColors.brand },
  dasha3rdValue:  { fontSize: 14, fontWeight: "700", color: AstroColors.textSecondary },
  dashaEndsText:  { fontSize: 12, color: AstroColors.textMuted, marginTop: 2 },

  timeline: { marginTop: 14, gap: 0, borderTopWidth: 1, borderTopColor: AstroColors.border, paddingTop: 14 },
  timelineHeader: { fontSize: 10, fontWeight: "700", color: AstroColors.textMuted, letterSpacing: 0.5, marginBottom: 10 },
  timelineRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  timelineDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: AstroColors.brand },
  timelineName:   { fontSize: 14, fontWeight: "700", color: AstroColors.ink, flex: 1 },
  timelineDate:   { fontSize: 12, color: AstroColors.textMuted },

  // ── Doshas ───────────────────────────────────────────────────────────────
  doshaList: { gap: 10 },
  doshaBadge: {
    borderWidth: 1,
    borderRadius: AstroRadius.md,
    padding: 12,
    gap: 4,
  },
  doshaTopRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  doshaBadgeName: { fontSize: 14, fontWeight: "800" },
  doshaBadgeType: { fontSize: 12, fontWeight: "600", opacity: 0.8 },
  doshaDetail:    { fontSize: 12, lineHeight: 18, opacity: 0.85 },

  noDoshaRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  noDoshaIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: AstroColors.successTint,
    alignItems: "center", justifyContent: "center",
  },
  noDoshaTitle: { fontSize: 15, fontWeight: "800", color: AstroColors.ink },
  noDoshaDesc:  { fontSize: 13, color: AstroColors.textSecondary, marginTop: 3, lineHeight: 18 },

  // ── Regenerate ───────────────────────────────────────────────────────────
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.border,
    marginTop: 4,
  },
  regenText: { fontSize: 13, fontWeight: "700", color: AstroColors.brand },
});