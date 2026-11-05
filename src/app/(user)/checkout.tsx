import Header from "@/components/header";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { useUser } from "@/features/auth/store/auth.store";
import { consultationService } from "@/features/consultation/service";
import type { ConsultationServiceVariant } from "@/features/consultation/types";
import { paymentService, walletPayService } from "@/features/payment/service";
import {
  classifyPaymentFailure,
  copyForKind,
  type PaymentStage,
} from "@/features/payment/utils/paymentFailure";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Cashfree SDK — commented out during the Razorpay rollback, kept
// installed (see package.json) for a quick re-migration:
// import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
// import { CFEnvironment, CFSession } from "cashfree-pg-api-contract";
import RazorpayCheckout from "react-native-razorpay";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { astroId, serviceId, variantId, scheduledAt } =
    useLocalSearchParams<{
      astroId: string;
      serviceId: string;
      variantId?: string;
      scheduledAt: string;
    }>();

  const {
    astrologer,
    services,
    loading: profileLoading,
    fetchProfile,
  } = useAstrologerProfile(astroId);
  const service = services.find((s) => s.id === serviceId) ?? null;

  // Hook khud fetch trigger nahi karta — book-slot.tsx wala hi bug yahan bhi tha
  useEffect(() => {
    fetchProfile();
  }, [astroId]);

  // Konsa duration/price variant book ho raha hai — order summary card isi
  // se duration/price dikhata hai
  const [variant, setVariant] = useState<ConsultationServiceVariant | null>(
    null,
  );
  useEffect(() => {
    if (!serviceId) return;
    consultationService
      .getServiceVariants(serviceId)
      .then((variants) => {
        const match = variantId
          ? variants.find((v) => v.id === variantId)
          : variants.find((v) => v.isDefault);
        setVariant(match ?? variants[0] ?? null);
      })
      .catch(() => setVariant(null));
  }, [serviceId, variantId]);

  const [placing, setPlacing] = useState(false);
  // Ek hi payment attempt ke andar (Razorpay order retry, isi screen pe
  // bina navigate kiye) dobara initiateBooking na ho isliye store karte
  // hain. Payment fail/cancel hone par ab appointment turant cancel ho
  // jaata hai (neeche catch block), toh "Dobara Try Karo" hamesha fresh
  // booking banayega — isliye yahan seed karne ki zarurat nahi.
  const [pendingAppointmentId, setPendingAppointmentId] = useState<
    string | null
  >(null);

  // ── Wallet ──────────────────────────────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    walletPayService
      .getBalance()
      .then((b) => setWalletBalance(Number(b.balance)))
      .catch(() => {}); // silent — checkout bina wallet ke bhi kaam karega
  }, []);

  const totalPrice = Number(variant?.price ?? service?.price ?? 0);
  // Wallet se kitna cover hoga — balance >= price → full; otherwise partial
  const walletApplied = useWallet ? Math.min(walletBalance, totalPrice) : 0;
  const razorpayAmount = totalPrice - walletApplied;
  // Sirf tab toggle dikhao jab wallet mein kuch ho
  const showWalletOption = walletBalance > 0;

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

  const handlePayment = async () => {
    if (!astroId || !serviceId || !scheduledAt || !service) return;
    setPlacing(true);
    // `let` yahan bahar rakha hai (try ke bahar scope) taaki catch block
    // mein bhi reliably access ho — state (pendingAppointmentId) turant
    // update nahi hota isi render cycle mein, isliye state pe depend nahi
    // kar sakte the yahan
    let appointmentId: string | null = pendingAppointmentId;
    // Kis step pe fail hua — failure ka sahi reason batane ke liye
    let stage: PaymentStage = "booking";
    try {
      // Step 1: Booking "pending" status mein banao — agar pichle attempt
      // se already ban chuki hai toh dobara mat banao
      if (!appointmentId) {
        const appointment = await consultationService.initiateBooking({
          astrologerId: astroId,
          serviceId,
          variantId: variant?.id,
          scheduledAt,
        });
        appointmentId = appointment.id;
        setPendingAppointmentId(appointmentId);
      }

      // ── Full Wallet Pay ─────────────────────────────────────────────────────
      // Agar wallet se poora amount cover ho raha hai — Razorpay ki zarurat nahi
      if (useWallet && razorpayAmount <= 0) {
        stage = "verify"; // wallet pay = direct confirm, no gateway
        await walletPayService.payWithWallet(appointmentId);
        router.replace({
          pathname: "/(user)/booking-confirmation" as any,
          params: { appointmentId },
        });
        return;
      }

      // ── Razorpay Pay (full or partial after wallet deduction) ───────────────
      stage = "order";
      const order = await paymentService.createOrder(appointmentId);

      // Partial wallet apply: Razorpay amount = remaining (razorpayAmount),
      // lekin order Razorpay ne totalPrice se banaya hai. Partial wallet ka
      // UI sirf indication ke liye hai — backend partial flow alag nahi karta
      // is MVP mein (full Razorpay order hi jaata hai). Sirf full wallet pay
      // mein Razorpay skip hota hai.
      stage = "gateway";
      const result = await RazorpayCheckout.open({
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID!,
        amount: Math.round(order.amount * 100), // paise mein
        currency: order.currency,
        order_id: order.orderId,
        name: "AstroBook",
        description: service.title,
        prefill: {
          email: user?.email,
          contact: user?.phone,
          name: user?.name,
        },
        theme: { color: "#9d0399" },
      });

      // Step 4: Signature backend pe verify karo → appointment confirm +
      // Agora token generate hota hai isi call mein
      stage = "verify";
      await paymentService.verifyPayment({
        appointmentId,
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      });

      router.replace({
        pathname: "/(user)/booking-confirmation" as any,
        params: { appointmentId },
      });
    } catch (err: any) {
      const kind = classifyPaymentFailure(err, stage);
      const copy = copyForKind(kind);

      // Technical detail sirf support/debug ke liye (screen pe collapsed dikhta hai)
      const detail =
        err?.response?.data?.message ||
        err?.description ||
        err?.error?.description ||
        err?.message ||
        "";

      // Booking tabhi cancel karte hain jab paisa nahi kata. "verify" fail
      // mein payment gateway tak ja chuka hota hai — cancel karna galat hoga,
      // booking pending rakhte hain taaki backend/support reconcile kar sake.
      //
      // `await` zaroori hai: slot-conflict check 'pending' ko bhi "booked"
      // maanta hai, to turant retry par cancel DB mein pehle complete hona chahiye.
      if (appointmentId && copy.cancelBooking) {
        await consultationService.cancelAppointment(appointmentId).catch(() => {});
        setPendingAppointmentId(null);
      }

      router.replace({
        pathname: "/(user)/payment-failed" as any,
        params: {
          kind,
          detail: typeof detail === "string" ? detail : JSON.stringify(detail),
          appointmentId: copy.cancelBooking ? undefined : (appointmentId ?? undefined),
          astroId,
          serviceId,
          variantId: variant?.id,
          scheduledAt,
        },
      });
    } finally {
      setPlacing(false);
    }
  };

  if (profileLoading || !astrologer || !service || !scheduledDate) {
    return (
      <View style={[styles.root, styles.centerFill]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {/* --- ORDER SUMMARY CARD --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.orderRow}>
            <View style={styles.orderEmoji}>
              <Text style={{ fontSize: 28 }}>
                {astrologer.meta?.emoji ?? "🔮"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderServiceName}>{service.title}</Text>
              <Text style={styles.orderAstroName}>with {astrologer.name}</Text>
              <View style={styles.orderChipsRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    ⏱ {variant?.durationMinutes ?? service.durationMinutes} min
                  </Text>
                </View>
              </View>
              <View style={styles.slotRow}>
                <Feather name="calendar" size={12} color="#9d0399" />
                <Text style={styles.slotText}>
                  {scheduledDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  •{" "}
                  {scheduledDate.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- CUSTOMER DETAILS CARD --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name : </Text>
            <Text style={styles.detailValue}>{user?.name ?? "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone : </Text>
            <Text style={styles.detailValue}>{user?.phone ?? "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email : </Text>
            <Text style={styles.detailValue}>{user?.email ?? "—"}</Text>
          </View>
        </View>

        {/* --- PRICE DETAILS CARD --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price details</Text>

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹ {variant?.price ?? service.price ?? "—"}</Text>
          </View>
        </View>

        {/* --- WALLET OPTION CARD --- */}
        {showWalletOption && (
          <View style={styles.walletCard}>
            <View style={styles.walletRow}>
              <View style={styles.walletLeft}>
                <Text style={styles.walletIcon}>⚡</Text>
                <View>
                  <Text style={styles.walletTitle}>AstroBook Wallet</Text>
                  <Text style={styles.walletBalance}>
                    ₹{walletBalance.toFixed(2)} available
                  </Text>
                </View>
              </View>
              <Switch
                value={useWallet}
                onValueChange={setUseWallet}
                trackColor={{ false: "#D1D5DB", true: "#C084FC" }}
                thumbColor={useWallet ? "#9d0399" : "#9CA3AF"}
              />
            </View>

            {useWallet && (
              <View style={styles.walletBreakdown}>
                <View style={styles.walletBreakdownRow}>
                  <Text style={styles.walletBreakdownLabel}>Wallet covers</Text>
                  <Text style={styles.walletBreakdownCredit}>
                    − ₹{walletApplied.toFixed(2)}
                  </Text>
                </View>
                {razorpayAmount > 0 ? (
                  <View style={styles.walletBreakdownRow}>
                    <Text style={styles.walletBreakdownLabel}>
                      Remaining via Razorpay
                    </Text>
                    <Text style={styles.walletBreakdownRemainder}>
                      ₹{razorpayAmount.toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.walletFullCoverNote}>
                    ✅ Wallet se poora amount cover ho raha hai — Razorpay
                    nahi lagega
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* --- CANCELLATION POLICY --- */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeaderRow}>
            <Feather name="alert-circle" size={14} color="#F59E0B" />
            <Text style={styles.policyTitle}>Cancellation Policy</Text>
          </View>
          <Text style={styles.policyText}>
            • To cancel a booking, go to "My Bookings" and select cancel.
          </Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View
        style={[styles.stickyBottom, { paddingBottom: 24 + insets.bottom }]}
      >
        <TouchableOpacity
          style={[styles.paymentBtn, placing && styles.paymentBtnDisabled]}
          onPress={handlePayment}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.paymentBtnText}>
              {useWallet && razorpayAmount <= 0
                ? `Pay with Wallet • ₹${totalPrice.toFixed(2)}`
                : useWallet && razorpayAmount > 0
                  ? `Pay via Razorpay • ₹${razorpayAmount.toFixed(2)}`
                  : `Pay Now • ₹${variant?.price ?? service.price ?? "—"}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 14, paddingBottom: 40 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },

  orderRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  orderEmoji: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orderServiceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  orderAstroName: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  orderChipsRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  chip: {
    backgroundColor: "#F5F0FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, color: "#6B21A8", fontWeight: "600" },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  slotText: { fontSize: 12, color: "#9d0399", fontWeight: "600" },

  detailRow: { flexDirection: "row", alignItems: "flex-start" },
  detailLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  detailValue: { fontSize: 13, color: "#1F2937", fontWeight: "600", flex: 1 },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  totalValue: { fontSize: 17, fontWeight: "800", color: "#9d0399" },

  policyCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 5,
  },
  policyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  policyTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  policyText: { fontSize: 12, color: "#78350F", lineHeight: 18 },

  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
    elevation: 10,
  },
  // ── Wallet card ────────────────────────────────────────────────────────────
  walletCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#C084FC",
    elevation: 2,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 12,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletIcon: { fontSize: 26 },
  walletTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  walletBalance: { fontSize: 12, color: "#7C3AED", fontWeight: "600", marginTop: 2 },
  walletBreakdown: {
    backgroundColor: "#F5F0FF",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  walletBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletBreakdownLabel: { fontSize: 12, color: "#6B7280" },
  walletBreakdownCredit: { fontSize: 13, fontWeight: "700", color: "#16A34A" },
  walletBreakdownRemainder: { fontSize: 13, fontWeight: "700", color: "#9d0399" },
  walletFullCoverNote: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
    textAlign: "center",
  },

  paymentBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    elevation: 3,
  },
  paymentBtnDisabled: { opacity: 0.6 },
  paymentBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});