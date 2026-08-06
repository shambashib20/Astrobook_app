import Header from "@/components/header";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { useUser } from "@/features/auth/store/auth.store";
import { consultationService } from "@/features/consultation/service";
import type { ConsultationServiceVariant } from "@/features/consultation/types";
import { paymentService } from "@/features/payment/service";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { astroId, serviceId, variantId, scheduledAt, retryAppointmentId } =
    useLocalSearchParams<{
      astroId: string;
      serviceId: string;
      variantId?: string;
      scheduledAt: string;
      retryAppointmentId?: string;
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
  // Ek baar appointment ban jaaye (pending), usko yahan store karte hain —
  // taaki payment fail/cancel hone par retry pe dobara naya appointment na
  // ban jaaye. Agar payment-failed screen se "retryAppointmentId" ke saath
  // wapas aaye hain, toh usi ko seed kar do — naya initiateBooking mat karo.
  const [pendingAppointmentId, setPendingAppointmentId] = useState<
    string | null
  >(retryAppointmentId ?? null);

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

  const handlePayment = async () => {
    if (!astroId || !serviceId || !scheduledAt) return;
    setPlacing(true);
    // `let` yahan bahar rakha hai (try ke bahar scope) taaki catch block
    // mein bhi reliably access ho — state (pendingAppointmentId) turant
    // update nahi hota isi render cycle mein, isliye state pe depend nahi
    // kar sakte the yahan
    let appointmentId: string | null = pendingAppointmentId;
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

      // Step 2: Razorpay order banao
      const order = await paymentService.createOrder(appointmentId);

      // Step 3: Razorpay checkout kholo
      const razorpayResult = await RazorpayCheckout.open({
        description: service?.title ?? "Astrobook Consultation",
        currency: order.currency,
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID as string,
        amount: Math.round(order.amount * 100), // rupees → paise
        name: "AstroBook",
        order_id: order.orderId,
        prefill: {
          email: user?.email ?? undefined,
          contact: user?.phone ?? undefined,
          name: user?.name ?? undefined,
        },
        theme: { color: "#9d0399" },
      });

      // Step 4: Payment verify karo → appointment confirm hoga backend pe
      await paymentService.verifyPayment({
        appointmentId,
        razorpayOrderId: razorpayResult.razorpay_order_id,
        razorpayPaymentId: razorpayResult.razorpay_payment_id,
        razorpaySignature: razorpayResult.razorpay_signature,
      });

      router.replace({
        pathname: "/(user)/booking-confirmation" as any,
        params: { appointmentId },
      });
    } catch (err: any) {
      // Razorpay checkout khud reject karta hai jab user cancel kare ya
      // payment fail ho — us case mein err.description milta hai (koi
      // response.data.message nahi hota, isliye pehle woh check karo)
      const message =
        err?.response?.data?.message ||
        err?.description ||
        "Payment complete nahi ho paya";

      router.replace({
        pathname: "/(user)/payment-failed" as any,
        params: {
          appointmentId: appointmentId ?? undefined,
          reason: message,
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

        {/* --- CANCELLATION POLICY --- */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeaderRow}>
            <Feather name="alert-circle" size={14} color="#F59E0B" />
            <Text style={styles.policyTitle}>Cancellation Policy</Text>
          </View>
          <Text style={styles.policyText}>
            • Booking cancel karne ke liye "My Bookings" mein jaake cancel karo.
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
              Pay Now • ₹{variant?.price ?? service.price ?? "—"}
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
