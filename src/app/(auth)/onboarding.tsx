import AstroGradient from "@/assets/images/astro-gradient.svg";
import { useOnboarding } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/auth.store";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

const INTERESTS = [
  { label: "Numerology", emoji: "🔢" },
  { label: "Vastu", emoji: "🏠" },
  { label: "Past Life", emoji: "🔮" },
  { label: "Reiki", emoji: "✋" },
  { label: "Tarot", emoji: "🃏" },
  { label: "Astrology", emoji: "♈" },
  { label: "Palmistry", emoji: "🤚" },
  { label: "Face Reading", emoji: "👁️" },
  { label: "Kundli", emoji: "📜" },
  { label: "Horoscope", emoji: "⭐" },
  { label: "Gemstones", emoji: "💎" },
  { label: "Meditation", emoji: "🧘" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { onboard, loading } = useOnboarding();

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
      {/* Same gradient as login screen */}
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

            {/* Header */}
            {/* <View style={styles.header}>
            <Text style={styles.title}>Welcome! 🌟</Text>
            <Text style={styles.subtitle}>
              Tell us about your self, for better cosmic insights
            </Text>
          </View> */}

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

            {/* Date Picker */}
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

            {/* Interests */}
            <View style={styles.interestsCard}>
              <Text style={styles.interestsTitle}>✨ Your Interests</Text>
              <Text style={styles.interestsSubtitle}>
                Jo topics mein curious ho, woh choose karo
              </Text>
              <View style={styles.chips}>
                {INTERESTS.map((item) => {
                  const active = selected.includes(item.label);
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleInterest(item.label)}
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
                })}
              </View>

              {selected.length > 0 && (
                <Text style={styles.selectedCount}>
                  {selected.length} interest{selected.length > 1 ? "s" : ""}{" "}
                  selected ✨
                </Text>
              )}
            </View>

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

  logoRow: { alignItems: "center", marginBottom: 20 },

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
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { color: "#C4B5FD", fontSize: 14 },
});
