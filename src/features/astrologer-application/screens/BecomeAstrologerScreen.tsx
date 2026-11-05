import {
  AstroColors, AstroRadius, AstroShadow, AstroType, MIN_TOUCH,
} from "@/constants/astro-theme";
import { useKeyboardHeight } from "@/features/posts/hooks/useKeyboardHeight";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MediaPickCard from "../components/MediaPickCard";
import {
  LANGUAGE_OPTIONS, MAX_VIDEO_MB, MAX_VIDEO_SEC, MIN_BIO, useBecomeAstrologerForm,
} from "../hooks/useBecomeAstrologerForm";

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, on && styles.chipOn]}
      onPress={onPress}
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function BecomeAstrologerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const f = useBecomeAstrologerForm();

  const exit = () => (router.canGoBack() ? router.back() : router.replace("/(user)/(tabs)/profile" as any));

  const back = () => {
    if (f.busy) return;
    if (f.step === 2) return f.setStep(1);
    if (!f.isDirty) return exit();
    Alert.alert("Discard Application?", "Your progress will not be saved.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: exit },
    ]);
  };

  if (f.done) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.doneWrap}>
          <View style={styles.doneRing}>
            <View style={styles.doneCircle}>
              <Feather name="check" size={34} color={AstroColors.successDark} />
            </View>
          </View>
          <Text style={styles.doneTitle}>Application Submitted</Text>
          <Text style={styles.doneText}>
            Our team will review your details. You'll get an update once verified.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={exit} activeOpacity={0.85}>
            <LinearGradient colors={[AstroColors.brandLight, AstroColors.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneBtnIn}>
              <Text style={styles.doneBtnText}>Go to Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canNext = !f.busy;
  const onNext = f.tryNext;
  const E = f.showErrors ? f.errors1 : ({} as Partial<typeof f.errors1>);
  const E2 = f.showErrors ? f.errors2 : ({} as Partial<typeof f.errors2>);
  const bioShort = f.bio.trim().length > 0 && f.bio.trim().length < MIN_BIO;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Top bar — action hamesha upar (keyboard/scroll se kabhi nahi chhupta) */}
      <View style={styles.bar}>
        <TouchableOpacity style={styles.barBtn} onPress={back} accessibilityLabel="Go back">
          <Feather name={f.step === 2 ? "arrow-left" : "x"} size={22} color={AstroColors.ink} />
        </TouchableOpacity>
        <View style={styles.barMid}>
          <Text style={styles.barTitle}>Become an Astrologer</Text>
          <Text style={styles.barSub}>Step {f.step}/2 · {f.step === 1 ? "About You" : "Verification"}</Text>
        </View>
        <TouchableOpacity disabled={!canNext} onPress={onNext} activeOpacity={0.85} accessibilityLabel={f.step === 1 ? "Next" : "Submit"}>
          <LinearGradient
            colors={canNext ? [AstroColors.brandLight, AstroColors.brandDark] : [AstroColors.offline, AstroColors.offline]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.next}
          >
            {f.busy && f.step === 2 ? (
              <ActivityIndicator size="small" color={AstroColors.onBrand} />
            ) : (
              <Text style={styles.nextText}>{f.step === 1 ? "Next" : "Submit"}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: f.step === 1 ? "50%" : "100%" }]} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 + kb }]}
      >
        {f.step === 1 ? (
          <>
            <Text style={styles.intro}>
              Share a little about yourself — our team will review and verify you as an astrologer.
            </Text>

            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>About You</Text>
                <Text style={[styles.counter, bioShort && styles.counterWarn]}>
                  {f.bio.trim().length}/1000
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.multi]}
                value={f.bio}
                onChangeText={f.setBio}
                placeholder="Your experience, style, and specialties…"
                placeholderTextColor={AstroColors.textMuted}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              {bioShort || E.bio ? <Text style={styles.warn}>{E.bio ?? `Minimum ${MIN_BIO} characters required`}</Text> : null}
            </View>

            <View>
              <Text style={styles.label}>Experience</Text>
              <View style={styles.expWrap}>
                <TextInput
                  style={styles.expInput}
                  value={f.experience}
                  onChangeText={f.setExperience}
                  placeholder="–"
                  placeholderTextColor={AstroColors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.expSuffix}>years</Text>
              </View>
              {E.experience ? <Text style={styles.warn}>{E.experience}</Text> : null}
            </View>

            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Languages</Text>
                {f.languages.length ? <Text style={styles.counter}>{f.languages.length} selected</Text> : null}
              </View>
              <View style={styles.chips}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <Chip key={l} label={l} on={f.languages.includes(l)} onPress={() => f.toggleLanguage(l)} />
                ))}
              </View>
              {E.languages ? <Text style={styles.warn}>{E.languages}</Text> : null}
            </View>

            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Areas of Expertise</Text>
                {f.specs.length ? <Text style={styles.counter}>{f.specs.length} selected</Text> : null}
              </View>
              {f.catLoading && f.categories.length === 0 ? (
                <ActivityIndicator color={AstroColors.brand} style={{ marginVertical: 12 }} />
              ) : f.categories.length === 0 ? (
                <View style={styles.retry}>
                  <Text style={styles.hint}>{f.catError ?? "Failed to load categories"}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={f.fetchCategories}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.chips}>
                  {f.categories.map((c) => (
                    <Chip key={c.id} label={`${c.emoji} ${c.label}`} on={f.specs.includes(c.id)} onPress={() => f.toggleSpec(c.id)} />
                  ))}
                </View>
              )}
              {E.specs ? <Text style={styles.warn}>{E.specs}</Text> : null}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.intro}>
              We need a short intro video and two documents for verification.
            </Text>

            <View>
              <Text style={styles.label}>Intro video</Text>
              <MediaPickCard
                wide
                icon="video"
                title="Upload Intro Video"
                hint={`Max ${MAX_VIDEO_SEC} sec · Up to ${MAX_VIDEO_MB}MB`}
                pickedLabel={f.video ? `Video selected · ${f.video.duration}s` : undefined}
                loading={f.picking}
                disabled={f.busy}
                onPick={f.pickVideo}
                onClear={() => f.setVideo(null)}
              />
              {E2.video ? <Text style={styles.warn}>{E2.video}</Text> : null}
            </View>

            <View>
              <Text style={styles.label}>Documents</Text>
              <View style={styles.docRow}>
                <MediaPickCard
                  icon="credit-card"
                  title="ID proof"
                  hint="Aadhaar, PAN, etc."
                  imageUri={f.doc1?.uri}
                  disabled={f.busy}
                  onPick={() => f.pickDoc(1)}
                  onClear={() => f.setDoc1(null)}
                />
                <MediaPickCard
                  icon="award"
                  title="Certificate"
                  hint="Course or experience proof"
                  imageUri={f.doc2?.uri}
                  disabled={f.busy}
                  onPick={() => f.pickDoc(2)}
                  onClear={() => f.setDoc2(null)}
                />
              </View>
              {E2.doc1 || E2.doc2 ? <Text style={styles.warn}>{E2.doc1 ?? E2.doc2}</Text> : null}
            </View>

            {f.uploading ? (
              <View style={styles.uploading}>
                <ActivityIndicator size="small" color={AstroColors.brand} />
                <Text style={styles.uploadingText}>Uploading… {f.progress}%</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: AstroColors.canvasHeader },
  barBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  barMid: { flex: 1, alignItems: "center" },
  barTitle: { ...AstroType.heading, color: AstroColors.ink },
  barSub: { ...AstroType.micro, fontWeight: "500", color: AstroColors.textSecondary, marginTop: 1 },
  next: { minWidth: 76, height: 38, paddingHorizontal: 18, borderRadius: AstroRadius.pill, alignItems: "center", justifyContent: "center" },
  nextText: { ...AstroType.button, color: AstroColors.onBrand },
  progress: { height: 3, backgroundColor: AstroColors.brandTintStrong },
  progressFill: { height: 3, backgroundColor: AstroColors.brand },

  content: { padding: 16, gap: 22 },
  intro: { ...AstroType.body, fontWeight: "400", lineHeight: 21, color: AstroColors.textSecondary },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  label: { ...AstroType.body, fontWeight: "700", color: AstroColors.ink, marginBottom: 8 },
  counter: { ...AstroType.caption, color: AstroColors.textMuted },
  counterWarn: { color: AstroColors.danger },
  warn: { ...AstroType.caption, color: AstroColors.danger, marginTop: 6 },
  hint: { ...AstroType.caption, color: AstroColors.textSecondary },

  input: { backgroundColor: AstroColors.surface, borderRadius: AstroRadius.md, borderWidth: 1, borderColor: AstroColors.border, paddingHorizontal: 14, paddingVertical: 12, ...AstroType.body, fontWeight: "400", color: AstroColors.text },
  multi: { minHeight: 120 },
  expWrap: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 10, backgroundColor: AstroColors.surface, borderRadius: AstroRadius.md, borderWidth: 1, borderColor: AstroColors.border, paddingHorizontal: 14, height: 48 },
  expInput: { width: 44, ...AstroType.heading, color: AstroColors.ink, textAlign: "center", paddingVertical: 0 },
  expSuffix: { ...AstroType.body, color: AstroColors.textSecondary },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: AstroRadius.pill, backgroundColor: AstroColors.surface, borderWidth: 1, borderColor: AstroColors.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary },
  chipTextOn: { color: AstroColors.onBrand },
  retry: { alignItems: "center", gap: 8, paddingVertical: 8 },
  retryBtn: { minHeight: MIN_TOUCH, paddingHorizontal: 20, borderRadius: AstroRadius.pill, borderWidth: 1.5, borderColor: AstroColors.brand, alignItems: "center", justifyContent: "center" },
  retryText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },

  docRow: { flexDirection: "row", gap: 12 },
  uploading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadingText: { ...AstroType.caption, color: AstroColors.textSecondary },

  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  doneRing: { width: 112, height: 112, borderRadius: 56, backgroundColor: AstroColors.successTint, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  doneCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: AstroColors.surface, alignItems: "center", justifyContent: "center", ...AstroShadow.soft },
  doneTitle: { ...AstroType.title, color: AstroColors.ink },
  doneText: { ...AstroType.body, fontWeight: "400", lineHeight: 22, color: AstroColors.textSecondary, textAlign: "center" },
  doneBtn: { alignSelf: "stretch", borderRadius: AstroRadius.pill, overflow: "hidden", marginTop: 20 },
  doneBtnIn: { height: 50, alignItems: "center", justifyContent: "center" },
  doneBtnText: { ...AstroType.button, color: AstroColors.onBrand },
});
