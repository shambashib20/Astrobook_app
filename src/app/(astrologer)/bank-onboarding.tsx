import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
// useSubmitBankDetails (Razorpay Route's second step) — commented out
// during the Cashfree migration, kept for rollback.
import { useSubmitBankOnboarding } from "@/features/bank-onboarding/hooks/useBankOnboarding";
import type {
  BankDocument,
  BankDocumentType,
  BankOnboardingPayload,
  CashfreeAccountType,
  CashfreeBusinessCategory,
  CashfreeVendorRequirement,
} from "@/features/bank-onboarding/types";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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

// Mirrors CashfreeAccountTypeSchema on the backend.
const ACCOUNT_TYPES: CashfreeAccountType[] = [
  "Individual",
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Trust",
  "NGO",
  "Society",
  "Other",
];

// Mirrors CashfreeBusinessCategorySchema on the backend — Cashfree
// validates kyc_details.business_type against this FIXED enum (confirmed
// against the sandbox: free text like "Astrology Consulting" is rejected).
// "Professional Services..." is the closest fit and listed first/default.
const BUSINESS_CATEGORIES: CashfreeBusinessCategory[] = [
  "Professional Services (Doctors, Lawyers, Architects, CAs, and other Professionals)",
  "Education",
  "Healthcare",
  "Financial Services",
  "SaaS",
  "Digital Goods",
  "Social Media and Entertainment",
  "Retail and Shopping",
  "Grocery",
  "Jewellery",
  "Miscellaneous",
  "Web host/Domain seller",
  "E-commerce",
  "Online Gaming",
  "Society/Trust/Club/Association",
  "Mutual funds/Broking",
  "B2B",
  "Real Estate",
  "Housing",
  "Rentals",
  "Utilities",
  "Travel and Hospitality",
  "Food and Beverages",
  "NBFCs/Organizations into Lending",
  "Chit Funds",
  "Non Profit/NGO",
  "Government",
  "Readymade",
  "Open and Semi Open Wallet",
  "Pan shop",
  "Telecom",
  "Insurance",
  "Pharmacy",
  "Gaming",
  "Logistics",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Real PAN structure: 5 letters (4th = holder type, P for individual) + 4
// digits + 1 letter = 10 chars total — {3}P[A-Za-z], not {4}P.
const PAN_RE = /^[A-Za-z]{3}P[A-Za-z]\d{4}[A-Za-z]$/;

// field_reference on a "document_missing" requirement is the exact
// doc_type Cashfree expects back on the vendor-docs call — same set the
// backend accepts (CashfreeDocumentTypeSchema).
const DOCUMENT_LABELS: Record<BankDocumentType, string> = {
  pan_card: "PAN Card",
  gst_certificate: "GST Certificate",
  cancelled_cheque: "Cancelled Cheque",
  business_proof: "Business Proof",
  id_proof: "ID Proof",
};

function isKnownDocumentType(value: string): value is BankDocumentType {
  return value in DOCUMENT_LABELS;
}

export default function BankOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { profile, loading: profileLoading } = useMyProfile();

  // Outstanding document requirements Cashfree reported back on the vendor
  // create/update response — undefined until we've actually asked, [] once
  // nothing more is needed. Only lives in memory for this sitting (the
  // profile endpoint doesn't persist/return this list), so a user who
  // leaves before the documents step and comes back later just sees "done".
  const [documentRequirements, setDocumentRequirements] = useState<
    CashfreeVendorRequirement[] | undefined
  >(undefined);
  const [documentsJustSubmitted, setDocumentsJustSubmitted] = useState(false);

  // Which of the two "pre-vendor-exists" screens we're showing — purely a
  // client-side pacing device. Cashfree's vendor-create call REQUIRES
  // bank-or-UPI to already be present (confirmed against the sandbox: a
  // create call with neither is rejected with "Bank : Both Bank and UPI
  // cannot be null"), so unlike Razorpay Route there's no way to actually
  // create the vendor after step 1 alone — the real API call only fires
  // once step 2's payout details are also in hand. Business/KYC (step 1)
  // and Payout Method (step 2) still render as separate screens for the
  // same multi-step feel the Razorpay wizard had.
  const [localFormStep, setLocalFormStep] = useState<1 | 2>(1);

  // ── Business/KYC + bank-or-UPI form state — collected across steps 1–2,
  // submitted together as one vendor-create call at the end of step 2. ───
  // Not user-editable here on purpose — this must always match the
  // astrologer's actual account email, never a value typed fresh into this
  // form. (Previously editable, which let a submitted vendor email drift
  // from the account's real email — e.g. a "lorem@gmail.com" test value
  // ending up on file with Cashfree instead of the astrologer's own email.)
  const email = user?.email ?? "";
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [accountType, setAccountType] =
    useState<CashfreeAccountType>("Individual");
  const [businessCategory, setBusinessCategory] =
    useState<CashfreeBusinessCategory>(BUSINESS_CATEGORIES[0]);
  const [pan, setPan] = useState("");
  const [gst, setGst] = useState("");

  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [vpa, setVpa] = useState("");
  const [upiBeneficiaryName, setUpiBeneficiaryName] = useState("");

  // ── Step 2 (documents) state — picked-but-not-yet-uploaded local URIs,
  // keyed by the document type they're for. ───────────────────────────────
  const [pickedDocs, setPickedDocs] = useState<
    Partial<Record<BankDocumentType, string>>
  >({});

  const { submit: submitAccount, loading: submittingAccount } =
    useSubmitBankOnboarding();
  const { uploadImage, uploading: uploadingDoc } = useImageKitUpload();
  const [submittingDocs, setSubmittingDocs] = useState(false);

  const bankValid =
    accountNumber.trim().length >= 5 &&
    accountNumber.trim() === confirmAccountNumber.trim() &&
    IFSC_RE.test(ifscCode.trim().toUpperCase()) &&
    beneficiaryName.trim().length >= 2;

  const upiValid =
    vpa.trim().length >= 3 && upiBeneficiaryName.trim().length >= 2;

  const payoutValid = payoutMethod === "bank" ? bankValid : upiValid;

  // Step 1 — business/KYC fields only (no payout fields yet).
  const step1Valid =
    EMAIL_RE.test(email.trim()) &&
    phone.trim().length >= 8 &&
    contactName.trim().length > 0 &&
    !!businessCategory &&
    PAN_RE.test(pan.trim().toUpperCase());

  // Step 2 — payout method only; step 1's fields are re-checked too since
  // this is the step that actually fires the network call.
  const step2Valid = step1Valid && payoutValid;

  // Full step-1 payload, kept around so the documents step can re-submit it
  // — the bank-onboarding endpoint always expects the complete form back,
  // even on a documents-only follow-up call, though it skips re-creating
  // the vendor since it's already saved (just updates it).
  const buildPayload = (documents?: BankDocument[]): BankOnboardingPayload => ({
    email: email.trim(),
    phone: phone.trim(),
    contactName: contactName.trim(),
    accountType,
    businessCategory,
    pan: pan.trim().toUpperCase(),
    ...(gst.trim() ? { gst: gst.trim().toUpperCase() } : {}),
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
    ...(documents?.length ? { documents } : {}),
  });

  // Fires at the end of step 2 (Payout Method) — the actual vendor-create
  // call, carrying step 1's business/KYC fields + step 2's bank-or-UPI
  // together, since Cashfree requires both in the same request.
  const handleSubmitStep2 = async () => {
    if (!step2Valid || submittingAccount) return;

    // Cache is updated inside the hook on success — profile.cashfreeVendorId
    // flips right after this resolves, which is what moves the wizard past
    // step 2 below. No local "currentStep" state needed once the vendor
    // actually exists.
    const result = await submitAccount(buildPayload());
    if (result) setDocumentRequirements(result.account.requirements ?? []);
  };

  const missingDocTypes = (documentRequirements ?? [])
    .filter((r) => r.reason_code === "document_missing")
    .map((r) => r.field_reference)
    .filter(isKnownDocumentType);

  const pickDocument = async (type: BankDocumentType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPickedDocs((prev) => ({ ...prev, [type]: result.assets[0].uri }));
  };

  const handleSubmitDocuments = async () => {
    const entries = Object.entries(pickedDocs) as [BankDocumentType, string][];
    if (entries.length === 0 || submittingDocs || uploadingDoc) return;

    setSubmittingDocs(true);
    try {
      const uploaded = await Promise.all(
        entries.map(async ([type, uri]) => {
          const url = await uploadImage(
            uri,
            `${type}-${Date.now()}.jpg`,
            "/astrobook/bank-onboarding",
            "image/jpeg",
          );
          return url ? { type, url } : null;
        }),
      );

      const documents = uploaded.filter(
        (d): d is BankDocument => d !== null,
      );
      if (documents.length < entries.length) {
        Alert.alert(
          "Upload failed",
          "One or more documents couldn't be uploaded — please try again.",
        );
        return;
      }

      const result = await submitAccount(buildPayload(documents));
      if (result) {
        setDocumentRequirements(result.account.requirements ?? []);
        setDocumentsJustSubmitted(true);
      }
    } finally {
      setSubmittingDocs(false);
    }
  };

  // ── Resume logic — server truth decides the step, not local/device
  // state, for anything that's actually been persisted. Coming back to this
  // screen (new session, different device, app killed mid-flow) lands on
  // step 3/done correctly because that's derived from `/users/me`. Steps 1
  // and 2 are the one exception — since the vendor doesn't exist yet until
  // step 2 submits, there's nothing server-side to resume from, so a user
  // who closes the app mid-way through steps 1–2 restarts at step 1 (same
  // documented limitation the docs step already has for its own reasons).
  const step: 1 | 2 | 3 | "done" | "loading" = profileLoading
    ? "loading"
    : !profile?.cashfreeVendorId
      ? localFormStep
      : !documentsJustSubmitted && missingDocTypes.length > 0
        ? 3
        : "done";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="🏦 Bank Onboarding" subtitle="Payout setup" />

      {step !== "loading" && step !== "done" && (
        <View style={styles.progressRow}>
          <StepDot active label="1" done={step > 1} />
          <View style={styles.progressLine} />
          <StepDot active={step === 2} done={step > 2} label="2" />
          <View style={styles.progressLine} />
          <StepDot active={step === 3} done={false} label="3" />
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
          <Text style={styles.sectionTitle}>Step 1 of 3 — Business Details</Text>

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
            style={[styles.input, styles.inputDisabled]}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            editable={false}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!email && (
            <Text style={styles.errorText}>
              No email on your account yet — set one in your profile before
              starting bank onboarding.
            </Text>
          )}

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+917999087622"
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
          <Text style={styles.helperText}>
            Owner's PAN — used for KYC verification with Cashfree.
          </Text>

          <Text style={styles.fieldLabel}>GST Number (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 29AAICP2912R1ZR"
            placeholderTextColor="#9CA3AF"
            value={gst}
            onChangeText={(v) => setGst(v.toUpperCase())}
            autoCapitalize="characters"
          />

          <Text style={styles.fieldLabel}>Account Type</Text>
          <View style={styles.chipsRow}>
            {ACCOUNT_TYPES.map((at) => {
              const isSelected = accountType === at;
              return (
                <TouchableOpacity
                  key={at}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setAccountType(at)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {at}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Business Category</Text>
          <Text style={styles.helperText}>
            Cashfree requires one of its fixed categories — "Professional
            Services" is the closest fit for astrology consultations.
          </Text>
          <View style={styles.chipsRow}>
            {BUSINESS_CATEGORIES.map((cat) => {
              const isSelected = businessCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setBusinessCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              !step1Valid && styles.submitBtnDisabled,
            ]}
            onPress={() => step1Valid && setLocalFormStep(2)}
            disabled={!step1Valid}
          >
            <Text style={styles.submitBtnText}>Continue</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Step 2 of 3 — Payout Method</Text>
          <Text style={styles.helperText}>
            Where should Cashfree send your payouts?
          </Text>

          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                payoutMethod === "bank" && styles.chipActive,
              ]}
              onPress={() => setPayoutMethod("bank")}
            >
              <Text
                style={[
                  styles.chipText,
                  payoutMethod === "bank" && styles.chipTextActive,
                ]}
              >
                Bank Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chip,
                payoutMethod === "upi" && styles.chipActive,
              ]}
              onPress={() => setPayoutMethod("upi")}
            >
              <Text
                style={[
                  styles.chipText,
                  payoutMethod === "upi" && styles.chipTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>
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
              (!step2Valid || submittingAccount) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmitStep2}
            disabled={!step2Valid || submittingAccount}
          >
            {submittingAccount ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Finish Setup</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => setLocalFormStep(1)}
            disabled={submittingAccount}
          >
            <Text style={styles.skipBtnText}>← Back to Business Details</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Step 3 of 3 — Verification Documents</Text>
          <Text style={styles.helperText}>
            Cashfree needs a few documents to finish verifying this account.
            You can also skip this and add them later.
          </Text>

          {missingDocTypes.map((type) => {
            const uri = pickedDocs[type];
            return (
              <View key={type} style={styles.docRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{DOCUMENT_LABELS[type]}</Text>
                  <Text style={styles.helperText}>
                    {uri ? "Selected — ready to upload" : "Not selected"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.docPickBtn}
                  onPress={() => pickDocument(type)}
                >
                  <Feather
                    name={uri ? "check-circle" : "upload"}
                    size={16}
                    color="#9d0399"
                  />
                  <Text style={styles.docPickBtnText}>
                    {uri ? "Change" : "Choose File"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (Object.keys(pickedDocs).length === 0 ||
                submittingDocs ||
                uploadingDoc) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmitDocuments}
            disabled={
              Object.keys(pickedDocs).length === 0 ||
              submittingDocs ||
              uploadingDoc
            }
          >
            {submittingDocs || uploadingDoc ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Upload &amp; Finish</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => setDocumentsJustSubmitted(true)}
            disabled={submittingDocs || uploadingDoc}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
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
