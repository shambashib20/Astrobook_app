import AstroGradient from "@/assets/images/astro-gradient.svg";
import { useOnboarding } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { usePhoneVerification } from "@/features/users/hooks/usePhoneVerification";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const OTP_LENGTH = 4;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const router = useRouter();

  // ─── Step control — 1: General Details, 2: Interests ─────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ─── General details ───────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ─── Phone ──────────────────────────────────────────────────────────────
  // Phone-login users ka phone already account mein set hota hai (login ke
  // waqt) — unke liye field read-only prefilled. Google-login users ke
  // liye phone khaali hota hai — unhe yahin inline verify karna hoga.
  const hadPhoneAlready = !!user?.phone;
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [otp, setOtp] = useState("");
  const otpInputRef = useRef<TextInput>(null);
  const {
    otpSent,
    verified,
    sending,
    verifying,
    debugOtp,
    sendOtp,
    verifyOtp,
    reset: resetPhoneVerification,
  } = usePhoneVerification();

  const phoneReady = hadPhoneAlready || verified;

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    // Number badla toh purani verification/OTP state invalid ho jaati hai
    if (otpSent || verified) {
      resetPhoneVerification();
      setOtp("");
    }
  };

  const handleSendOtp = async () => {
    const result = await sendOtp(phone);
    if (result.success) {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  };

  const handleVerifyOtp = async () => {
    const result = await verifyOtp(phone, otp);
    if (result.success) {
      updateUser({ phone: phone.trim() });
    }
  };

  // ─── Interests ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const { categories, loading: categoriesLoading, fetchCategories } =
    useCategories();

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleInterest = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDob(selectedDate);
  };

  const { onboard, loading } = useOnboarding();

  const canGoNext = name.trim().length >= 2 && phoneReady;

  const handleComplete = async () => {
    await onboard({
      name,
      email: email.trim() || undefined,
      dateOfBirth: dob ? dob.toISOString().split("T")[0] : undefined,
      interests: selected.length > 0 ? selected : undefined,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AstroGradient
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoRow}>
              <Image
                source={require("@/assets/images/logo-white.png")}
                style={{ width: 220, height: 90 }}
                resizeMode="contain"
              />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepDotText}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Your Details</Text>
              </View>
              <View
                style={[styles.stepConnector, step === 2 && styles.stepConnectorActive]}
              />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
                  <Text style={styles.stepDotText}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Interests</Text>
              </View>
            </View>

            {step === 1 && (
              <>
                {/* Form Card */}
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>Your Profile</Text>

                  {/* Name */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Phone */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Phone Number *</Text>
                    {hadPhoneAlready ? (
                      <View style={[styles.input, styles.inputDisabled]}>
                        <Text style={styles.inputDisabledText}>{phone}</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.phoneRow}>
                          <TextInput
                            style={[styles.input, styles.phoneInput]}
                            placeholder="10-digit mobile number"
                            placeholderTextColor="#9CA3AF"
                            value={phone}
                            onChangeText={handlePhoneChange}
                            keyboardType="phone-pad"
                            maxLength={13}
                            editable={!verified}
                          />
                          {verified ? (
                            <View style={styles.verifiedBadge}>
                              <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.verifyBtn,
                                (phone.trim().length < 10 || sending) &&
                                  styles.verifyBtnDisabled,
                              ]}
                              disabled={phone.trim().length < 10 || sending}
                              onPress={handleSendOtp}
                              activeOpacity={0.8}
                            >
                              {sending ? (
                                <ActivityIndicator color="#9d0399" size="small" />
                              ) : (
                                <Text style={styles.verifyBtnText}>
                                  {otpSent ? "Resend" : "Verify"}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Inline OTP box */}
                        {otpSent && !verified && (
                          <View style={styles.otpBox}>
                            <Text style={styles.fieldHint}>
                              {phone} pe OTP bheja gaya hai
                              {debugOtp ? ` (dev: ${debugOtp})` : ""}
                            </Text>
                            <View style={styles.phoneRow}>
                              <TextInput
                                ref={otpInputRef}
                                style={[styles.input, styles.otpInput]}
                                placeholder="Enter OTP"
                                placeholderTextColor="#9CA3AF"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={OTP_LENGTH}
                              />
                              <TouchableOpacity
                                style={[
                                  styles.verifyBtn,
                                  (otp.length !== OTP_LENGTH || verifying) &&
                                    styles.verifyBtnDisabled,
                                ]}
                                disabled={otp.length !== OTP_LENGTH || verifying}
                                onPress={handleVerifyOtp}
                                activeOpacity={0.8}
                              >
                                {verifying ? (
                                  <ActivityIndicator color="#9d0399" size="small" />
                                ) : (
                                  <Text style={styles.verifyBtnText}>Verify</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Email */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!user?.email}
                    />
                  </View>

                  {/* DOB */}
                  <View style={[styles.field, { marginBottom: 0 }]}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <TouchableOpacity
                      style={styles.dateBtn}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.dateBtnText, !dob && styles.datePlaceholder]}
                      >
                        {dob ? formatDate(dob) : "Select your date of birth"}
                      </Text>
                      <Text style={styles.calendarIcon}>📅</Text>
                    </TouchableOpacity>
                    <Text style={styles.fieldHint}>
                      Optional — better cosmic insights ke liye
                    </Text>
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={dob || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1940, 0, 1)}
                  />
                )}

                {/* Next */}
                <TouchableOpacity
                  style={[styles.btn, !canGoNext && styles.btnDisabled]}
                  disabled={!canGoNext}
                  onPress={() => setStep(2)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Next →</Text>
                </TouchableOpacity>

                {!phoneReady && !hadPhoneAlready && (
                  <Text style={styles.blockedHint}>
                    Aage badhne ke liye phone number verify karo
                  </Text>
                )}
              </>
            )}

            {step === 2 && (
              <>
                {/* Interests */}
                <View style={styles.interestsCard}>
                  <Text style={styles.interestsTitle}>✨ Your Interests</Text>
                  <Text style={styles.interestsSubtitle}>
                    Jo topics mein curious ho, woh choose karo
                  </Text>
                  <View style={styles.chips}>
                    {categoriesLoading ? (
                      <ActivityIndicator color="#9d0399" style={{ marginTop: 8 }} />
                    ) : (
                      categories.map((item) => {
                        const active = selected.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => toggleInterest(item.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.chipEmoji}>{item.emoji}</Text>
                            <Text
                              style={[
                                styles.chipText,
                                active && styles.chipTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  {selected.length > 0 && (
                    <Text style={styles.selectedCount}>
                      {selected.length} interest{selected.length > 1 ? "s" : ""}{" "}
                      selected ✨
                    </Text>
                  )}
                </View>

                {/* Back */}
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnLoading]}
                  disabled={loading}
                  onPress={handleComplete}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>
                    {loading ? "Setting up..." : "Start My Journey 🚀"}
                  </Text>
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => router.replace("/(user)/feed" as any)}
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121943" },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  logoRow: { alignItems: "center", marginBottom: 16 },

  // Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepItem: { alignItems: "center", width: 90 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stepDotActive: { backgroundColor: "#9d0399" },
  stepDotText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  stepLabel: { color: "#C4B5FD", fontSize: 12, fontWeight: "600" },
  stepConnector: {
    width: 36,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 18,
  },
  stepConnectorActive: { backgroundColor: "#9d0399" },

  header: { alignItems: "center", marginBottom: 24 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#C4B5FD",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  // White card same as login
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#9d0399",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    elevation: 8,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9d0399",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9F5FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  inputDisabled: { backgroundColor: "#F3F4F6", justifyContent: "center" },
  inputDisabledText: { fontSize: 15, color: "#6B7280", fontWeight: "500" },

  // Phone + inline verify
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  phoneInput: { flex: 1 },
  verifyBtn: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: "#9d0399", fontWeight: "700", fontSize: 13 },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  verifiedBadgeText: { color: "#16A34A", fontWeight: "700", fontSize: 13 },
  otpBox: { marginTop: 12 },
  otpInput: { flex: 1, letterSpacing: 4 },

  dateBtn: {
    backgroundColor: "#F9F5FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBtnText: { fontSize: 15, color: "#1A1A2E", fontWeight: "500" },
  datePlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  calendarIcon: { fontSize: 18 },
  fieldHint: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },

  blockedHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#FCA5A5",
    marginTop: -4,
    marginBottom: 8,
  },

  // Interests — also a card
  interestsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#9d0399",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
    elevation: 8,
  },
  interestsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  interestsSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9F5FF",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  chipActive: { backgroundColor: "#F3E8FF", borderColor: "#9d0399" },
  chipEmoji: { fontSize: 13 },
  chipText: { color: "#6B7280", fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#9d0399", fontWeight: "700" },
  selectedCount: {
    textAlign: "center",
    fontSize: 13,
    color: "#9d0399",
    fontWeight: "600",
    marginTop: 14,
  },

  btn: {
    backgroundColor: "#9d0399",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 4,
  },
  btnLoading: { opacity: 0.7 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  backBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 4 },
  backBtnText: { color: "#C4B5FD", fontSize: 14, fontWeight: "600" },

  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { color: "#C4B5FD", fontSize: 14 },
});
