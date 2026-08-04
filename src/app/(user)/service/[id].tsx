import Header from "@/components/header";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { cartService } from "@/features/cart/service";
import {
  VARIANT_DURATION_LABELS,
  type ConsultationServiceVariant,
} from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function StarRating({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: size,
            color: i <= Math.round(rating) ? "#9d0399" : "#E5E7EB",
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  // NOTE: route ka file naam [id].tsx hai isliye param bhi "id" hi aata hai —
  // yahan "serviceId" ke naam se treat kar rahe hain saaf rehne ke liye
  const { id: serviceId, astroId } = useLocalSearchParams<{
    id: string;
    astroId: string;
  }>();

  const { astrologer, services, loading, fetchProfile } =
    useAstrologerProfile(astroId);

  useEffect(() => {
    fetchProfile();
  }, [astroId]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const [addingToCart, setAddingToCart] = useState(false);

  // ── Variant selector — 5 duration options, 30-min default pre-selected ──
  // Pehle yeh alag se API call karta tha (useServiceVariants), jabki
  // service.variants mein yeh data already embedded aata hai (astrologer ki
  // services fetch karte waqt hi backend attach kar deta hai) — ek poora
  // extra network round-trip bach gaya, isliye page turant render hota hai.
  const variants = service?.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );

  // Variants load hote hi default (30-min) wala pre-select karo
  useEffect(() => {
    if (variants.length === 0 || selectedVariantId) return;
    const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];
    if (defaultVariant) setSelectedVariantId(defaultVariant.id);
  }, [variants]);

  const selectedVariant: ConsultationServiceVariant | null =
    variants.find((v) => v.id === selectedVariantId) ?? null;

  const handleAddToCart = async () => {
    if (!service || !astrologer || !selectedVariant) return;
    setAddingToCart(true);
    try {
      await cartService.addItem({
        astrologerId: astrologer.id,
        serviceId: service.id,
        variantId: selectedVariant.id,
      });
      Alert.alert("Cart mein add ho gaya", "Slot cart mein jaake select kar lena.", [
        { text: "OK" },
        { text: "Cart dekho", onPress: () => router.push("/(user)/cart" as any) },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Cart mein add nahi ho paya",
      );
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading || !astrologer || !service) {
    return (
      <View style={[styles.root, styles.centerFill]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </View>
    );
  }

  const rating = astrologer.meta?.rating ?? 0;
  const totalReviews = astrologer.meta?.reviews ?? 0;

  return (
    <View style={styles.root}>
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.heroWrapper}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.heroEmojiBox}>
            <Text style={{ fontSize: 56 }}>{astrologer.meta?.emoji ?? "🔮"}</Text>
          </View>

          {/* --- Service + Astrologer Info --- */}
          <View style={styles.astroCard}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.bookWith}>
              with{" "}
              <Text style={{ color: "#1F2937", fontWeight: "700" }}>
                {astrologer.name}
              </Text>
            </Text>

            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  ⏱ {selectedVariant?.durationMinutes ?? service.durationMinutes} min
                </Text>
              </View>
              {totalReviews > 0 && (
                <View style={styles.chip}>
                  <StarRating rating={rating} size={11} />
                  <Text style={styles.chipText}> {rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          {totalReviews > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingBig}>{rating.toFixed(1)}</Text>
              <View style={{ gap: 2 }}>
                <StarRating rating={rating} size={18} />
                <Text style={styles.ratingCount}>
                  {totalReviews.toLocaleString()} reviews
                </Text>
              </View>
            </View>
          )}

          {/* --- Duration / Price Variants --- */}
          <View style={styles.variantsSection}>
            <Text style={styles.sectionTitle}>Choose Duration</Text>
            {variants.length === 0 ? (
              <ActivityIndicator color="#9d0399" style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.variantsGrid}>
                {variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.variantCard,
                        isSelected && styles.variantCardActive,
                      ]}
                      onPress={() => setSelectedVariantId(variant.id)}
                      activeOpacity={0.8}
                    >
                      {variant.isDefault && (
                        <Text
                          style={[
                            styles.variantBadge,
                            isSelected && styles.variantBadgeActive,
                          ]}
                        >
                          Popular
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.variantDuration,
                          isSelected && styles.variantTextActive,
                        ]}
                      >
                        {VARIANT_DURATION_LABELS[
                          variant.durationMinutes as keyof typeof VARIANT_DURATION_LABELS
                        ] ?? `${variant.durationMinutes} min`}
                      </Text>
                      <Text
                        style={[
                          styles.variantPrice,
                          isSelected && styles.variantTextActive,
                        ]}
                      >
                        ₹{variant.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* --- About this Service --- */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About this Service</Text>
            <Text style={styles.aboutText}>{service.about}</Text>
          </View>
        </View>
      </ScrollView>

      {/* --- Sticky Bottom Bar --- */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>
            ₹{selectedVariant?.price ?? service.price ?? "—"}
          </Text>
        </View>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.cartBtn,
              (addingToCart || !selectedVariant) && { opacity: 0.6 },
            ]}
            disabled={addingToCart || !selectedVariant}
            onPress={handleAddToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#9d0399" />
            ) : (
              <Text style={styles.cartBtnText}>Add to Cart</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookBtn, !selectedVariant && { opacity: 0.6 }]}
            disabled={!selectedVariant}
            onPress={() =>
              router.push({
                pathname: "/(user)/book-slot" as any,
                params: {
                  astroId: astrologer.id,
                  serviceId: service.id,
                  variantId: selectedVariant?.id,
                },
              })
            }
          >
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { alignItems: "center", justifyContent: "center" },

  heroWrapper: {
    backgroundColor: "#fff1feff",
    marginHorizontal: 20,
    borderRadius: 20,
    marginTop: 30,
    paddingBottom: 10,
  },
  backBtn: {
    position: "absolute",
    top: -15,
    left: -10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 9,
  },
  heroEmojiBox: {
    alignItems: "center",
    paddingTop: 30,
  },

  astroCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 6,
    alignItems: "center",
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  bookWith: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F0FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: "#6B21A8", fontWeight: "600" },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  ratingBig: { fontSize: 36, fontWeight: "800", color: "#6B21A8" },
  ratingCount: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  variantsSection: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  variantsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  variantCard: {
    width: "30.5%",
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
  },
  variantCardActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  variantBadge: {
    position: "absolute",
    top: -8,
    fontSize: 9,
    fontWeight: "800",
    color: "#9d0399",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  variantBadgeActive: { backgroundColor: "#FEF3C7", color: "#9d0399" },
  variantDuration: { fontSize: 12, fontWeight: "700", color: "#374151" },
  variantPrice: { fontSize: 14, fontWeight: "800", color: "#1A1A2E" },
  variantTextActive: { color: "#FFF" },

  aboutSection: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  aboutText: { fontSize: 13, color: "#4B5563", lineHeight: 21 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#EDE9FF",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  priceLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  price: { fontSize: 22, fontWeight: "700", color: "#6B21A8" },
  bottomActions: { flexDirection: "row", gap: 10 },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  cartBtnText: { color: "#9d0399", fontSize: 13, fontWeight: "700" },
  bookBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  bookBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});
