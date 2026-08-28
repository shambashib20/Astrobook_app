import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useSubmitBankOnboarding } from "@/features/bank-onboarding/hooks/useBankOnboarding";
import type { BankOnboardingPayload } from "@/features/bank-onboarding/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private Ltd" },
  { value: "public_limited", label: "Public Ltd" },
  { value: "trust", label: "Trust" },
  { value: "ngo", label: "NGO" },
  { value: "others", label: "Others" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BankOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [businessType, setBusinessType] = useState("individual");
  const [category, setCategory] = useState("services");
  const [subcategory, setSubcategory] = useState("consulting");

  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("IN");

  const { submit, loading } = useSubmitBankOnboarding(() => {
    Alert.alert("Success", "Bank onboarding submitted successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  });

  const isValid =
    EMAIL_RE.test(email.trim()) &&
    phone.trim().length >= 8 &&
    legalBusinessName.trim().length > 0 &&
    contactName.trim().length > 0 &&
    businessType.trim().length > 0 &&
    category.trim().length > 0 &&
    subcategory.trim().length > 0 &&
    street1.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    country.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || loading) return;

    const payload: BankOnboardingPayload = {
      email: email.trim(),
      phone: phone.trim(),
      legalBusinessName: legalBusinessName.trim(),
      contactName: contactName.trim(),
      businessType: businessType.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      address: {
        street1: street1.trim(),
        street2: street2.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
      },
    };

    await submit(payload);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="🏦 Bank Onboarding" subtitle="Payout setup" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Business Details</Text>

        <Text style={styles.fieldLabel}>Legal Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Komolokhha Stores"
          placeholderTextColor="#9CA3AF"
          value={legalBusinessName}
          onChangeText={setLegalBusinessName}
        />

        <Text style={styles.fieldLabel}>Contact Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mojar Astrologer"
          placeholderTextColor="#9CA3AF"
          value={contactName}
          onChangeText={setContactName}
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+917999087622"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.fieldLabel}>Business Type</Text>
        <View style={styles.chipsRow}>
          {BUSINESS_TYPES.map((bt) => {
            const isSelected = businessType === bt.value;
            return (
              <TouchableOpacity
                key={bt.value}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setBusinessType(bt.value)}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextActive]}
                >
                  {bt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="services"
              placeholderTextColor="#9CA3AF"
              value={category}
              onChangeText={setCategory}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Subcategory</Text>
            <TextInput
              style={styles.input}
              placeholder="consulting"
              placeholderTextColor="#9CA3AF"
              value={subcategory}
              onChangeText={setSubcategory}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Address</Text>

        <Text style={styles.fieldLabel}>Street 1</Text>
        <TextInput
          style={styles.input}
          placeholder="507, Koramangala 1st block"
          placeholderTextColor="#9CA3AF"
          value={street1}
          onChangeText={setStreet1}
        />

        <Text style={styles.fieldLabel}>Street 2</Text>
        <TextInput
          style={styles.input}
          placeholder="MG Road"
          placeholderTextColor="#9CA3AF"
          value={street2}
          onChangeText={setStreet2}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Bengaluru"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="KARNATAKA"
              placeholderTextColor="#9CA3AF"
              value={state}
              onChangeText={setState}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Postal Code</Text>
            <TextInput
              style={styles.input}
              placeholder="560034"
              placeholderTextColor="#9CA3AF"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="IN"
              placeholderTextColor="#9CA3AF"
              value={country}
              onChangeText={setCountry}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isValid || loading) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: { padding: 20, gap: 10 },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },

  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },

  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1, gap: 4 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#FFF" },

  submitBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});
