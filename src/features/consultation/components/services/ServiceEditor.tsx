import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { useKeyboardHeight } from "@/features/posts/hooks/useKeyboardHeight";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_TAGS, useServiceEditor } from "../../hooks/useServiceEditor";
import {
  SERVICE_TAGS,
  VARIANT_DURATION_LABELS,
  VARIANT_DURATIONS,
  type ConsultationService,
} from "../../types";
import { DEFAULT_DURATION, earningsFor, parsePrice, rupees } from "../../utils/servicePricing";

type Props = {
  visible: boolean;
  /** null = naya service */
  service: ConsultationService | null;
  commissionPercentage: number;
  onClose: () => void;
  onSaved: () => void;
};

// Parent isse `key={service?.id ?? "new"}` ke saath render kare taaki har baar fresh state ho
export default function ServiceEditor({ visible, service, commissionPercentage, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const f = useServiceEditor(service, onSaved);

  const close = () => {
    if (f.saving) return;
    if (!f.isDirty) return onClose();
    Alert.alert("Discard Changes?", "Your unsaved changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  };

  const err = (k: keyof typeof f.errors) => (f.submitted ? f.errors[k] : undefined);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Top bar — Save hamesha upar, scroll ya keyboard se kabhi nahi chhupta */}
        <View style={styles.bar}>
          <TouchableOpacity style={styles.barBtn} onPress={close} accessibilityLabel="Close">
            <Feather name="x" size={22} color={AstroColors.ink} />
          </TouchableOpacity>
          <Text style={styles.barTitle}>{f.isEdit ? "Edit Service" : "New Service"}</Text>
          <TouchableOpacity
            disabled={!f.canSave}
            onPress={f.save}
            activeOpacity={0.85}
            accessibilityLabel={f.isEdit ? "Save" : "Service banao"}
          >
            <LinearGradient
              colors={f.canSave ? [AstroColors.brandLight, AstroColors.brandDark] : [AstroColors.offline, AstroColors.offline]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.save}
            >
              {f.saving ? (
                <ActivityIndicator size="small" color={AstroColors.onBrand} />
              ) : (
                <Text style={styles.saveText}>{f.isEdit ? "Save" : "Create"}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {f.uploading ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, f.progress)}%` }]} />
          </View>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 + kb }]}
        >
          {/* ── Cover (Basic ke liye nahi) ── */}
          {!f.isBasic ? (
            <View>
              <Text style={styles.label}>Cover image</Text>
              <TouchableOpacity
                style={[styles.cover, err("cover") && styles.coverError]}
                onPress={f.pickCover}
                disabled={f.uploading}
                activeOpacity={0.85}
              >
                {f.coverLocal ? (
                  <>
                    <Image source={{ uri: f.coverLocal }} style={styles.coverImg} />
                    <View style={styles.coverChange}>
                      <Feather name="camera" size={14} color={AstroColors.onBrand} />
                      <Text style={styles.coverChangeText}>Change</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.coverEmpty}>
                    <View style={styles.coverIcon}>
                      <Feather name="image" size={22} color={AstroColors.brand} />
                    </View>
                    <Text style={styles.coverEmptyText}>Add a cover image</Text>
                    <Text style={styles.hint}>16:9 looks best</Text>
                  </View>
                )}
                {f.uploading ? (
                  <View style={styles.coverBusy}>
                    <ActivityIndicator color={AstroColors.brand} />
                  </View>
                ) : null}
              </TouchableOpacity>
              {err("cover") ? <Text style={styles.error}>{err("cover")}</Text> : null}
            </View>
          ) : null}

          {/* ── Details ── */}
          <Field label="Service name" error={err("title")}>
            <TextInput
              style={styles.input}
              value={f.title}
              onChangeText={f.setTitle}
              placeholder="e.g. Kundli Reading"
              placeholderTextColor={AstroColors.textMuted}
              maxLength={255}
            />
          </Field>

          <Field label="Short description" error={err("shortDescription")} counter={`${f.shortDescription.length}/500`}>
            <TextInput
              style={[styles.input, styles.multi]}
              value={f.shortDescription}
              onChangeText={f.setShort}
              placeholder="One or two lines about what the client will get"
              placeholderTextColor={AstroColors.textMuted}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label="Full details" error={err("about")}>
            <TextInput
              style={[styles.input, styles.multi, styles.multiTall]}
              value={f.about}
              onChangeText={f.setAbout}
              placeholder="What happens in the session, who it's for, what to prepare…"
              placeholderTextColor={AstroColors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </Field>

          {/* ── Categories ── */}
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Categories</Text>
              <Text style={styles.counter}>
                {f.tags.length}/{MAX_TAGS}
              </Text>
            </View>
            <View style={styles.chips}>
              {SERVICE_TAGS.map((t) => {
                const on = f.tags.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => f.toggleTag(t.id)}
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {err("tags") ? <Text style={styles.error}>{err("tags")}</Text> : null}
          </View>

          {/* ── Pricing ── */}
          <View>
            <Text style={styles.label}>Pricing</Text>
            <Text style={[styles.hint, { marginBottom: 10 }]}>
              Duration fixed hai, sirf price badal sakte ho.
              {commissionPercentage > 0
                ? ` Platform fee (${commissionPercentage}%) kat ke jo bachega wo neeche dikhta hai.`
                : ""}
            </Text>
            {f.variantsLoading ? (
              <ActivityIndicator color={AstroColors.brand} style={{ marginVertical: 16 }} />
            ) : f.variantsError ? (
              <View style={styles.retryBox}>
                <Text style={styles.hint}>Prices load nahi hue.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={f.loadVariants}>
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.priceCard}>
                {VARIANT_DURATIONS.map((d, i) => {
                  const amount = parsePrice(f.drafts[d]);
                  const bad = f.submitted && amount === null;
                  return (
                    <View key={d} style={[styles.priceRow, i > 0 && styles.priceDivider]}>
                      <View style={styles.flex}>
                        <View style={styles.durRow}>
                          <Text style={styles.dur}>{VARIANT_DURATION_LABELS[d]}</Text>
                          {d === DEFAULT_DURATION ? (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>Popular</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.payout}>
                          {amount !== null
                            ? `Tumhe milega ${rupees(earningsFor(amount, commissionPercentage).payout)}`
                            : "Price daalo"}
                        </Text>
                      </View>
                      <View style={[styles.priceInputWrap, bad && styles.coverError]}>
                        <Text style={styles.rupee}>₹</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={f.drafts[d]}
                          onChangeText={(t) => f.setPrice(d, t)}
                          keyboardType="numeric"
                          maxLength={7}
                          selectTextOnFocus
                          accessibilityLabel={`${VARIANT_DURATION_LABELS[d]} ka price`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {err("prices") ? <Text style={styles.error}>{err("prices")}</Text> : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  error,
  counter,
  children,
}: {
  label: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {counter ? <Text style={styles.counter}>{counter}</Text> : null}
      </View>
      <View style={error ? styles.fieldError : undefined}>{children}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  flex: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: AstroColors.canvasHeader },
  barBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  barTitle: { ...AstroType.heading, color: AstroColors.ink },
  save: { minWidth: 76, height: 38, paddingHorizontal: 18, borderRadius: AstroRadius.pill, alignItems: "center", justifyContent: "center" },
  saveText: { ...AstroType.button, color: AstroColors.onBrand },
  progressTrack: { height: 3, backgroundColor: AstroColors.brandTintStrong },
  progressFill: { height: 3, backgroundColor: AstroColors.brand },

  content: { padding: 16, gap: 20 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  label: { ...AstroType.body, fontWeight: "700", color: AstroColors.ink },
  counter: { ...AstroType.caption, color: AstroColors.textMuted },
  hint: { ...AstroType.caption, color: AstroColors.textSecondary, lineHeight: 17 },
  error: { ...AstroType.caption, color: AstroColors.danger, marginTop: 6 },

  input: { backgroundColor: AstroColors.surface, borderRadius: AstroRadius.md, borderWidth: 1, borderColor: AstroColors.border, paddingHorizontal: 14, paddingVertical: 12, ...AstroType.body, fontWeight: "400", color: AstroColors.text },
  multi: { minHeight: 76 },
  multiTall: { minHeight: 130 },
  fieldError: { borderRadius: AstroRadius.md, borderWidth: 1.5, borderColor: AstroColors.danger },

  cover: { height: 170, borderRadius: AstroRadius.lg, overflow: "hidden", backgroundColor: AstroColors.surface, borderWidth: 1.5, borderStyle: "dashed", borderColor: AstroColors.offline },
  coverError: { borderColor: AstroColors.danger },
  coverImg: { width: "100%", height: "100%" },
  coverChange: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: AstroColors.mediaBadge, borderRadius: AstroRadius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  coverChangeText: { ...AstroType.micro, color: AstroColors.onBrand },
  coverEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  coverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: AstroColors.brandTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  coverEmptyText: { ...AstroType.body, fontWeight: "700", color: AstroColors.brand },
  coverBusy: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: AstroRadius.pill, backgroundColor: AstroColors.surface, borderWidth: 1, borderColor: AstroColors.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.textSecondary },
  chipTextOn: { color: AstroColors.onBrand },

  priceCard: { backgroundColor: AstroColors.surface, borderRadius: AstroRadius.lg, ...AstroShadow.soft },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  priceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: AstroColors.border },
  durRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dur: { ...AstroType.body, fontWeight: "700", color: AstroColors.text },
  tag: { backgroundColor: AstroColors.goldTint, borderRadius: AstroRadius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { ...AstroType.micro, color: AstroColors.goldDeep },
  payout: { ...AstroType.caption, color: AstroColors.successDark, marginTop: 2 },
  priceInputWrap: { flexDirection: "row", alignItems: "center", width: 112, height: 44, paddingHorizontal: 12, backgroundColor: AstroColors.canvas, borderRadius: AstroRadius.md, borderWidth: 1, borderColor: AstroColors.border },
  rupee: { ...AstroType.heading, color: AstroColors.textSecondary, marginRight: 4 },
  priceInput: { flex: 1, minWidth: 60, height: 44, ...AstroType.heading, color: AstroColors.ink, paddingVertical: 0, textAlign: "right" },
  retryBox: { alignItems: "center", gap: 8, paddingVertical: 12 },
  retryBtn: { minHeight: MIN_TOUCH, paddingHorizontal: 20, borderRadius: AstroRadius.pill, borderWidth: 1.5, borderColor: AstroColors.brand, alignItems: "center", justifyContent: "center" },
  retryText: { ...AstroType.button, fontSize: 13, color: AstroColors.brand },
});
