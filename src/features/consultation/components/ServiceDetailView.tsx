import UserAvatar from "@/components/UserAvatar";
import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { formatPrice } from "@/features/astrologer/utils/cardFormat";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { ConsultationServiceVariant } from "../types";
import DurationOptions from "./DurationOptions";

export type ServiceDetailViewProps = {
  title: string;
  about: string;
  serviceId: string;
  astrologerName: string;
  astrologerId: string;
  astrologerAvatar?: string | null;
  rating: number;
  reviews: number;
  variants: ConsultationServiceVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fallbackPrice?: string | null;
  adding: boolean;
  onBack: () => void;
  onOpenAstrologer: () => void;
  onAddToCart: () => void;
  onBook: () => void;
};

export function ServiceHeader({
  onBack,
  right,
}: {
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={[AstroColors.canvasHeader, AstroColors.canvas]}
      style={styles.header}
    >
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel="Wapas jao"
      >
        <Feather name="arrow-left" size={19} color={AstroColors.brand} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Consultation</Text>
      <View style={styles.iconBtn}>{right}</View>
    </LinearGradient>
  );
}

export function ServiceStateView({
  onBack,
  loading,
  message,
  onRetry,
}: {
  onBack: () => void;
  loading?: boolean;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ServiceHeader onBack={onBack} />
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color={AstroColors.brand} size="large" />
        ) : (
          <>
            <Feather name="alert-circle" size={32} color={AstroColors.danger} />
            <Text style={styles.stateText}>{message}</Text>
            {onRetry ? (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function ServiceDetailView(p: ServiceDetailViewProps) {
  const insets = useSafeAreaInsets();
  const selected = p.variants.find((v) => v.id === p.selectedId) ?? null;
  const canAct = !!selected && !p.adding;
  const price = formatPrice(selected?.price ?? p.fallbackPrice) ?? "—";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ServiceHeader
        onBack={p.onBack}
        right={
          <FavoriteButton itemId={p.serviceId} size={19} style={styles.fav} />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Title + astrologer */}
        <Text style={styles.title}>{p.title}</Text>
        <TouchableOpacity
          style={styles.astro}
          activeOpacity={0.75}
          onPress={p.onOpenAstrologer}
          accessibilityLabel={`${p.astrologerName} ka profile`}
        >
          <UserAvatar
            uri={p.astrologerAvatar}
            name={p.astrologerName}
            id={p.astrologerId}
            size={40}
          />
          <View style={styles.flex}>
            <Text style={styles.astroName} numberOfLines={1}>
              {p.astrologerName}
            </Text>
            {p.reviews > 0 ? (
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color={AstroColors.gold} />
                <Text style={styles.ratingText}>
                  {p.rating.toFixed(1)} · {p.reviews.toLocaleString()} reviews
                </Text>
              </View>
            ) : (
              <Text style={styles.ratingText}>View your profile</Text>
            )}
          </View>
          <Feather name="chevron-right" size={18} color={AstroColors.brand} />
        </TouchableOpacity>

        {/* Duration */}
        <Text style={styles.section}>Select your duration</Text>
        {p.variants.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="clock" size={18} color={AstroColors.textMuted} />
            <Text style={styles.emptyText}>
              This service's duration and price is not available now. Please try
              again after some time.
            </Text>
          </View>
        ) : (
          <DurationOptions
            variants={p.variants}
            selectedId={p.selectedId}
            onSelect={p.onSelect}
          />
        )}

        {/* About */}
        {p.about ? (
          <>
            <Text style={styles.section}>About this service</Text>
            <Text style={styles.about}>{p.about}</Text>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.barPrice}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceSub}>
            {selected
              ? `${selected.durationMinutes} min session`
              : "Duration chuno"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cartBtn, !canAct && styles.disabled]}
          disabled={!canAct}
          onPress={p.onAddToCart}
          accessibilityLabel="Add to cart"
        >
          {p.adding ? (
            <ActivityIndicator size="small" color={AstroColors.brand} />
          ) : (
            <Feather name="shopping-cart" size={19} color={AstroColors.brand} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookWrap, !canAct && styles.disabled]}
          disabled={!canAct}
          onPress={p.onBook}
          activeOpacity={0.85}
          accessibilityLabel="Book now"
        >
          <LinearGradient
            colors={[AstroColors.brandLight, AstroColors.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bookBtn}
          >
            <Text style={styles.bookText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { ...AstroType.heading, color: AstroColors.ink },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AstroColors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...AstroShadow.soft,
  },
  fav: { width: 36, height: 36, elevation: 0, shadowOpacity: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  stateText: {
    ...AstroType.body,
    color: AstroColors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: 20,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { ...AstroType.button, color: AstroColors.brand },

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  title: { ...AstroType.title, fontSize: 22, color: AstroColors.ink },
  astro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    minHeight: MIN_TOUCH + 12,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    ...AstroShadow.soft,
  },
  astroName: { ...AstroType.body, fontWeight: "700", color: AstroColors.text },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    ...AstroType.caption,
    color: AstroColors.textSecondary,
    marginTop: 2,
  },

  section: {
    ...AstroType.heading,
    color: AstroColors.ink,
    marginTop: 24,
    marginBottom: 10,
  },
  empty: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    padding: 14,
  },
  emptyText: {
    flex: 1,
    ...AstroType.caption,
    lineHeight: 18,
    color: AstroColors.textSecondary,
  },
  about: {
    ...AstroType.body,
    fontWeight: "400",
    lineHeight: 22,
    color: AstroColors.textSecondary,
  },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: AstroColors.surface,
    borderTopLeftRadius: AstroRadius.xl,
    borderTopRightRadius: AstroRadius.xl,
    ...AstroShadow.card,
  },
  barPrice: { flex: 1 },
  price: { fontSize: 22, fontWeight: "800", color: AstroColors.ink },
  priceSub: { ...AstroType.caption, color: AstroColors.textMuted },
  cartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  bookWrap: { borderRadius: AstroRadius.pill, overflow: "hidden" },
  bookBtn: {
    height: 48,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bookText: { ...AstroType.button, color: AstroColors.onBrand },
  disabled: { opacity: 0.45 },
});
