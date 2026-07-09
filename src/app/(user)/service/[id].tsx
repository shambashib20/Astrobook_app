import Header from "@/components/header";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { cartService } from "@/features/cart/service";
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

  const handleAddToCart = async () => {
    if (!service || !astrologer) return;
    setAddingToCart(true);
    try {
      await cartService.addItem({
        astrologerId: astrologer.id,
        serviceId: service.id,
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
                  ⏱ {service.durationMinutes} min
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
          <Text style={styles.price}>₹{service.price ?? "—"}</Text>
        </View>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.cartBtn, addingToCart && { opacity: 0.6 }]}
            disabled={addingToCart}
            onPress={handleAddToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#9d0399" />
            ) : (
              <Text style={styles.cartBtnText}>Add to Cart</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() =>
              router.push({
                pathname: "/(user)/book-slot" as any,
                params: { astroId: astrologer.id, serviceId: service.id },
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
