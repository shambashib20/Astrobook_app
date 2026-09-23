import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useSubmitBankOnboarding } from "@/features/bank-onboarding/hooks/useBankOnboarding";
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

// Payout details screen. No Razorpay Route: every customer payment lands in
// the platform's own Razorpay account, and the team pays astrologers out
// manually after reconciliation — this just records WHERE to send that
// payout (bank account or UPI). Nothing here talks to Razorpay.

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Real PAN structure: 5 letters (4th = holder type, P for individual) + 4
// digits + 1 letter = 10 chars total — {3}P[A-Za-z], not {4}P.
const PAN_RE = /^[A-Za-z]{3}P[A-Za-z]\d{4}[A-Za-z]$/;
const UPI_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export default function BankOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { profile, loading: profileLoading } = useMyProfile();

  // Already-saved astrologers land on the "done" state; "Update details"
  // flips this to show the form again.
  const [editing, setEditing] = useState(false);

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [pan, setPan] = useState("");

  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [vpa, setVpa] = useState("");
  const [upiBeneficiaryName, setUpiBeneficiaryName] = useState("");

  const { submit, loading: submitting } = useSubmitBankOnboarding();

  const bankValid =
    /^\d{5,34}$/.test(accountNumber.trim()) &&
    accountNumber.trim() === confirmAccountNumber.trim() &&
    IFSC_RE.test(ifscCode.trim().toUpperCase()) &&
    beneficiaryName.trim().length >= 2;

  const upiValid =
    UPI_RE.test(vpa.trim()) && upiBeneficiaryName.trim().length >= 2;

  const formValid =
    contactName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    PAN_RE.test(pan.trim()) &&
    (payoutMethod === "bank" ? bankValid : upiValid);

  const buildPayload = (): BankOnboardingPayload => ({
    contactName: contactName.trim(),
    phone: phone.trim(),
    pan: pan.trim().toUpperCase(),
    ...(payoutMethod === "bank"
      ? {
          bank: {
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            beneficiaryName: beneficiaryName.trim(),
          },
        }
      : {
          upi: {
            vpa: vpa.trim(),
            beneficiaryName: upiBeneficiaryName.trim(),
          },
        }),
  });

  const handleSubmit = async () => {
    if (!formValid || submitting) return;
    // Profile cache (payoutMethod) is updated inside the hook on success,
    // which is what flips this screen to the "done" state.
    const result = await submit(buildPayload());
    if (result) setEditing(false);
  };

  const view: "loading" | "form" | "done" = profileLoading
    ? "loading"
    : profile?.payoutMethod && !editing
      ? "done"
      : "form";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="🏦 Payout Details" subtitle="Where we send your earnings" />

      {view === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#9d0399" />
        </View>
      )}

      {view === "form" && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.helperText}>
            Customer payments are collected by AstroBook. Your earnings are
            paid out to the account below after reconciliation.
          </Text>

          <Text style={styles.sectionTitle}>Your Details</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mojar Astrologer"
            placeholderTextColor="#9CA3AF"
            value={contactName}
            onChangeText={setContactName}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="9830012345"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>PAN</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ABCPD1234E"
            placeholderTextColor="#9CA3AF"
            value={pan}
            onChangeText={(v) => setPan(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />
          {pan.length > 0 && !PAN_RE.test(pan.trim()) && (
            <Text style={styles.errorText}>Enter a valid PAN (e.g. ABCPD1234E)</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
            Payout Method
          </Text>

          <View style={styles.chipsRow}>
            {(["bank", "upi"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, payoutMethod === m && styles.chipActive]}
                onPress={() => setPayoutMethod(m)}
              >
                <Text
                  style={[
                    styles.chipText,
                    payoutMethod === m && styles.chipTextActive,
                  ]}
                >
                  {m === "bank" ? "Bank Account" : "UPI"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {payoutMethod === "bank" ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>UPI ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. yourname@upi"
                placeholderTextColor="#9CA3AF"
                value={vpa}
                onChangeText={setVpa}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Beneficiary Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name linked to this UPI ID"
                placeholderTextColor="#9CA3AF"
                value={upiBeneficiaryName}
                onChangeText={setUpiBeneficiaryName}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!formValid || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!formValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Save Payout Details</Text>
            )}
          </TouchableOpacity>

          {editing && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => setEditing(false)}
              disabled={submitting}
            >
              <Text style={styles.skipBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {view === "done" && (
        <View style={styles.centerFill}>
          <View style={styles.doneIconCircle}>
            <Feather name="check" size={36} color="#FFF" />
          </View>
          <Text style={styles.doneTitle}>Payout Details Saved</Text>
          <Text style={styles.doneSubtitle}>
            Your earnings will be paid out to your{" "}
            {profile?.payoutMethod === "upi" ? "UPI ID" : "bank account"} after
            reconciliation.
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, { marginTop: 24, alignSelf: "stretch" }]}
            onPress={() => router.back()}
          >
            <Text style={styles.submitBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={() => setEditing(true)}>
            <Text style={styles.skipBtnText}>Update details</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
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

  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  docPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  docPickBtnText: { fontSize: 12, fontWeight: "700", color: "#9d0399" },

  skipBtn: { alignItems: "center", paddingVertical: 14 },
  skipBtnText: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },

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
