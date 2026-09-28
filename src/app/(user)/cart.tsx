import Header from "@/components/header";
import { toast } from "@/components/toast";
import { useUser } from "@/features/auth/store/auth.store";
import { useCart } from "@/features/cart/hooks/useCart";
import { cartService } from "@/features/cart/service";
import type { CartItem } from "@/features/cart/types";
import { consultationService } from "@/features/consultation/service";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
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

function formatSlot(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • ${d.toLocaleTimeString(
    "en-IN",
    { hour: "2-digit", minute: "2-digit", hour12: true },
  )}`;
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { items, loading, error, fetchCart, removeItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payingOrder, setPayingOrder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Screen har baar focus mein aane par fresh cart fetch karo — sirf
      // pehli baar mount hone par nahi (warna "Add to Cart" ke baad wapas
      // aane pe purana/khaali state hi dikhta reh jaata, kyunki tab/stack
      // screen remount nahi hoti, sirf refocus hoti hai)
      fetchCart();
    }, []),
  );

  const toggleSelect = (item: CartItem) => {
    if (!item.scheduledAt) {
      // Blocking Alert ki jagah — checkbox tap karte hi turant chhota nudge,
      // user "Select Slot" button already dekh raha hai isi card pe
      toast.show("Pehle is item ka date/time select karo", "info");
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  // Cart item ka duration/price badalna — service-detail page pe hi
  // le jaate hain (same page jahan pehli baar variant choose kiya tha).
  // Wahan "Add to Cart" karne par backend isi cart row ko update kar deta
  // hai (naya row nahi banta — cart.service.ts mein already handle hai),
  // isliye yahan sirf sahi params ke saath navigate karna hai.
  const goToEditVariant = (item: CartItem) => {
    router.push({
      pathname: "/(user)/service/[id]" as any,
      params: {
        id: item.serviceId,
        astroId: item.astrologerId,
        editVariantId: item.variantId ?? undefined,
      },
    });
  };

  const goToSlotPicker = (item: CartItem) => {
    router.push({
      pathname: "/(user)/cart-slot-picker" as any,
      params: {
        cartItemId: item.id,
        astroId: item.astrologerId,
        serviceId: item.serviceId,
        // Slot length isi variant ke duration se generate honi chahiye —
        // warna 90-min wala item bhi default 30-min slots dikha dega
        variantId: item.variantId ?? undefined,
      },
    });
  };

  const handleRemove = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    removeItem(id);
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const totalPrice = selectedItems.reduce(
    (sum, i) => sum + Number(i.service?.price ?? 0),
    0,
  );

  const handleMakePayment = async () => {
    if (selectedItems.length === 0) return;
    setPayingOrder(true);
    // try ke bahar rakha hai taaki catch block mein bhi access ho — Razorpay
    // cancel/fail hone par inhi appointmentIds ko turant cancel karna hai
    // (neeche dekho), state pe depend nahi kar sakte isi render cycle mein
    let createdAppointmentIds: string[] = [];
    try {
      const order = await cartService.createCheckoutOrder(
        selectedItems.map((i) => i.id),
      );
      createdAppointmentIds = order.appointmentIds;

      const result = await RazorpayCheckout.open({
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID!,
        amount: Math.round(order.amount * 100), // paise mein
        currency: order.currency,
        order_id: order.orderId,
        name: "AstroBook",
        description: `${selectedItems.length} consultation(s)`,
        prefill: {
          email: user?.email,
          contact: user?.phone,
          name: user?.name,
        },
        theme: { color: "#9d0399" },
      });

      // Signature backend pe verify karo → sab appointments confirm hote hain
      await cartService.verifyCheckout({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      });

      Alert.alert(
        "Bookings Confirmed!",
        `${order.appointmentIds.length} consultation(s) confirm ho gayi hain.`,
        [
          {
            text: "My Bookings dekho",
            onPress: () => router.replace("/(user)/my-bookings" as any),
          },
        ],
      );
      setSelectedIds(new Set());
      fetchCart();
    } catch (err: any) {
      // Pehle yeh appointments 'pending' hi reh jaate the — jab tak user
      // khud My Bookings se cancel na kare, ya 20-min wala stale-pending
      // cron chal ke automatically cancel kare. Cart flow mein (checkout.tsx
      // wale single-booking flow ke uljat) koi "retry same booking" screen
      // nahi hai, isliye pending rakhne ka koi fayda nahi — Razorpay cancel/
      // fail hote hi turant cancel kar dete hain taaki My Bookings mein turant
      // sahi status (Cancelled, na ki 20 min tak Pending) dikhe.
      if (createdAppointmentIds.length > 0) {
        await Promise.all(
          createdAppointmentIds.map((id) =>
            consultationService.cancelAppointment(id).catch(() => {
              // Cancel bhi fail ho jaye (rare) — stale-pending cron 20 min
              // mein anyway cleanup kar dega, silently ignore karo
            }),
          ),
        );
      }

      const message =
        err?.response?.data?.message ||
        err?.description ||
        err?.message ||
        "Payment complete nahi ho paya";
      Alert.alert(
        "Payment Nahi Hua",
        createdAppointmentIds.length > 0
          ? `${message}\n\nBooking cancel kar di gayi hai — cart mein wapas jaake dobara try kar sakte ho.`
          : message,
      );
      fetchCart();
    } finally {
      setPayingOrder(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="shopping-cart" size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>Tumhara cart khali hai</Text>
            </View>
          ) : (
            items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const hasSlot = !!item.scheduledAt;
              return (
                <View key={item.id} style={styles.cartCard}>
                  <View style={styles.cardLeft}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleSelect(item)}
                    >
                      <Feather
                        name={isSelected ? "check-square" : "square"}
                        size={20}
                        color={isSelected ? "#9d0399" : "#9CA3AF"}
                      />
                    </TouchableOpacity>

                    <View style={styles.itemImage}>
                      <Text style={{ fontSize: 22 }}>
                        {item.astrologerAvatar ?? "🔮"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.service?.title ?? "Service"}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          By {item.astrologerName ?? "Astrologer"}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemove(item.id)}>
                        <Feather name="x" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <TouchableOpacity
                        style={styles.priceEditRow}
                        onPress={() => goToEditVariant(item)}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={styles.itemPrice}>
                            ₹ {item.service?.price ?? "—"}
                          </Text>
                          {item.service?.durationMinutes ? (
                            <Text style={styles.itemDuration}>
                              {item.service.durationMinutes} min
                            </Text>
                          ) : null}
                        </View>
                        <Feather name="edit-2" size={13} color="#9d0399" />
                      </TouchableOpacity>

                      {hasSlot ? (
                        <TouchableOpacity
                          style={styles.slotConfirmedBtn}
                          onPress={() => goToSlotPicker(item)}
                        >
                          <Feather name="check-circle" size={13} color="#FFF" />
                          <Text style={styles.slotConfirmedText}>
                            {formatSlot(item.scheduledAt!)}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.slotConfirmBtn}
                          onPress={() => goToSlotPicker(item)}
                        >
                          <Text style={styles.slotConfirmText}>
                            Select Slot
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {items.length > 0 && (
            <View style={styles.priceDetailsCard}>
              <Text style={styles.sectionTitle}>Price details</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Selected ({selectedItems.length} of {items.length})
                </Text>
                <Text style={styles.priceValue}>₹ {totalPrice}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹ {totalPrice}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {items.length > 0 && (
        <View
          style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}
        >
          <TouchableOpacity
            style={[
              styles.paymentBtn,
              (selectedItems.length === 0 || payingOrder) && {
                opacity: 0.6,
              },
            ]}
            disabled={selectedItems.length === 0 || payingOrder}
            onPress={handleMakePayment}
          >
            {payingOrder ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.paymentBtnText}>
                Make Payment • ₹{totalPrice}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.securePaymentRow}>
            <Feather name="shield" size={18} color="#22C55E" />
            <Text style={styles.secureText}>Safe and Secure Payments.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },

  listContent: { padding: 16, gap: 16, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  cartCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 2,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { padding: 4 },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
  },
  cardRight: { flex: 1 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  itemSubtitle: { fontSize: 11, color: "#6B7280" },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  itemPrice: { fontSize: 15, fontWeight: "700", color: "#9d0399" },
  itemDuration: { fontSize: 10.5, color: "#9CA3AF", marginTop: 1 },
  priceEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  slotConfirmBtn: {
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  slotConfirmText: { fontSize: 11, color: "#9d0399", fontWeight: "600" },
  slotConfirmedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22C55E",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 1,
  },
  slotConfirmedText: { fontSize: 10.5, color: "#FFF", fontWeight: "600" },

  priceDetailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: { fontSize: 13, color: "#6B7280" },
  priceValue: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  totalValue: { fontSize: 15, fontWeight: "800", color: "#9d0399" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
    elevation: 10,
    alignItems: "center",
    gap: 10,
  },
  paymentBtn: {
    width: "100%",
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  paymentBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  securePaymentRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  secureText: { fontSize: 12, color: "#6B7280" },
});