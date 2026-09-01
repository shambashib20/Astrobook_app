import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  useSubmitBankDetails,
  useSubmitBankOnboarding,
} from "@/features/bank-onboarding/hooks/useBankOnboarding";
import type { BankOnboardingPayload } from "@/features/bank-onboarding/types";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Product just created (step 1) always starts here — it only leaves this
// status once step 2's settlement details are accepted.
const PRODUCT_NEEDS_CLARIFICATION = "needs_clarification";

export default function BankOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { profile, loading: profileLoading } = useMyProfile();

  // Local override so a just-completed step 2 renders the "done" screen
  // immediately, even in the rare case the product status itself doesn't
  // leave "needs_clarification" right away (extra KYC still pending on
  // Razorpay's side) — we don't want to loop the user back into the form
  // they already submitted.
  const [step2JustSubmitted, setStep2JustSubmitted] = useState(false);

  // ── Step 1 form state ──────────────────────────────────────────────────
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

  // ── Step 2 form state ──────────────────────────────────────────────────
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");

  const { submit: submitAccount, loading: submittingAccount } =
    useSubmitBankOnboarding();
  const { submit: submitBankDetails, loading: submittingBankDetails } =
    useSubmitBankDetails();

  const step1Valid =
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

  const step2Valid =
    accountNumber.trim().length >= 5 &&
    accountNumber.trim() === confirmAccountNumber.trim() &&
    IFSC_RE.test(ifscCode.trim().toUpperCase()) &&
    beneficiaryName.trim().length >= 2;

  const handleSubmitStep1 = async () => {
    if (!step1Valid || submittingAccount) return;

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

    // Cache is updated inside the hook on success — profile.razorpayAccountId
    // flips right after this resolves, which is what moves the wizard to
    // step 2 below. No local "currentStep" state needed.
    await submitAccount(payload);
  };

  const handleSubmitStep2 = async () => {
    if (!step2Valid || submittingBankDetails) return;

    const result = await submitBankDetails({
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      beneficiaryName: beneficiaryName.trim(),
    });

    if (result) setStep2JustSubmitted(true);
  };

  // ── Resume logic — server truth decides the step, not local/device state.
  // Coming back to this screen (new session, different device, app killed
  // mid-flow) always lands on the correct step because it's derived from
  // `/users/me`, never from what the user last saw on screen. ──────────────
  const step: 1 | 2 | "done" | "loading" = profileLoading
    ? "loading"
    : !profile?.razorpayAccountId
      ? 1
      : step2JustSubmitted ||
          profile.razorpayProductStatus !== PRODUCT_NEEDS_CLARIFICATION
        ? "done"
        : 2;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="🏦 Bank Onboarding" subtitle="Payout setup" />

      {step !== "loading" && step !== "done" && (
        <View style={styles.progressRow}>
          <StepDot active={step === 1 || step === 2} done={step === 2} label="1" />
          <View style={styles.progressLine} />
          <StepDot active={step === 2} done={false} label="2" />
        </View>
      )}

      {step === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#9d0399" />
        </View>
      )}

      {step === 1 && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Step 1 of 2 — Business Details</Text>

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
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
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
              (!step1Valid || submittingAccount) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmitStep1}
            disabled={!step1Valid || submittingAccount}
          >
            {submittingAccount ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Step 2 of 2 — Payout Bank Account</Text>
          <Text style={styles.helperText}>
            Your Razorpay account is already set up. Add the bank account
            you'd like payouts sent to.
          </Text>

          <Text style={styles.fieldLabel}>Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1234567890123"
            placeholderTextColor="#9CA3AF"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Confirm Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter account number"
            placeholderTextColor="#9CA3AF"
            value={confirmAccountNumber}
            onChangeText={setConfirmAccountNumber}
            keyboardType="number-pad"
          />
          {confirmAccountNumber.length > 0 &&
            confirmAccountNumber.trim() !== accountNumber.trim() && (
              <Text style={styles.errorText}>Account numbers don't match</Text>
            )}

          <Text style={styles.fieldLabel}>IFSC Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. HDFC0000317"
            placeholderTextColor="#9CA3AF"
            value={ifscCode}
            onChangeText={(v) => setIfscCode(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={11}
          />

          <Text style={styles.fieldLabel}>Beneficiary Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name as per bank account"
            placeholderTextColor="#9CA3AF"
            value={beneficiaryName}
            onChangeText={setBeneficiaryName}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!step2Valid || submittingBankDetails) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmitStep2}
            disabled={!step2Valid || submittingBankDetails}
          >
            {submittingBankDetails ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Finish Setup</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === "done" && (
        <View style={styles.centerFill}>
          <View style={styles.doneIconCircle}>
            <Feather name="check" size={36} color="#FFF" />
          </View>
          <Text style={styles.doneTitle}>Payout Setup Complete</Text>
          <Text style={styles.doneSubtitle}>
            Your bank account is linked. Payouts will be settled here going
            forward.
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, { marginTop: 24, alignSelf: "stretch" }]}
            onPress={() => router.back()}
          >
            <Text style={styles.submitBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <View
      style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done && styles.stepDotDone,
      ]}
    >
      {done ? (
        <Feather name="check" size={14} color="#FFF" />
      ) : (
        <Text
          style={[styles.stepDotText, active && styles.stepDotTextActive]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: { padding: 20, gap: 10 },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  progressLine: { width: 40, height: 2, backgroundColor: "#EDE9FF" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#9d0399" },
  stepDotDone: { backgroundColor: "#16A34A" },
  stepDotText: { fontSize: 13, fontWeight: "800", color: "#9CA3AF" },
  stepDotTextActive: { color: "#FFF" },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  helperText: { fontSize: 13, color: "#6B7280", marginTop: -4 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  errorText: { fontSize: 12, color: "#DC2626", marginTop: -4 },

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

  doneIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  doneTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  doneSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
