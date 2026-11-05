import UserAvatar from "@/components/UserAvatar";
import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroSpacing,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AstrologerProfile } from "../types";
import {
  experienceLabel,
  formatCount,
  formatRating,
  hasReviews,
  isTopChoice,
  splitCategories,
  toCardModel,
  type AstrologerCardModel,
} from "../utils/cardFormat";

type Props = {
  astrologer: AstrologerProfile;
  /** full = listing page, compact = Explore category jaisi chhoti lists */
  variant?: "full" | "compact";
  /** Heart (favourite) button — full mein default on, compact mein off */
  showFavorite?: boolean;
  /** Default: astrologer profile kholna */
  onPress?: (astrologer: AstrologerProfile) => void;
};

// ─── AstrologerCard ──────────────────────────────────────────────────────────
// Astrologer ka ek hi card poore app ke liye. Listing, Explore category aur
// Favourites teeno yahi use karein — display rules `utils/cardFormat.ts` mein.

function RatingChip({ model, small }: { model: AstrologerCardModel; small?: boolean }) {
  if (!hasReviews({ totalReviews: model.totalReviews })) {
    // Abhi koi review nahi — khaali 5 stars ki jagah "New"
    return (
      <View style={[styles.chip, styles.chipNew, small && styles.chipSmall]}>
        <Ionicons name="sparkles" size={small ? 10 : 12} color={AstroColors.brand} />
        <Text style={[styles.chipText, { color: AstroColors.brand }]}>New</Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, styles.chipRating, small && styles.chipSmall]}>
      <Ionicons name="star" size={small ? 10 : 12} color={AstroColors.gold} />
      <Text style={[styles.chipText, { color: AstroColors.goldDeep }]}>
        {formatRating(model.rating)}
      </Text>
      <Text style={styles.chipCount}>({formatCount(model.totalReviews)})</Text>
    </View>
  );
}

function NameRow({ model, size }: { model: AstrologerCardModel; size: number }) {
  return (
    <View style={styles.nameRow}>
      <Text style={[styles.name, { fontSize: size }]} numberOfLines={1}>
        {model.name}
      </Text>
      {model.isVerified ? (
        <Ionicons name="checkmark-circle" size={size - 1} color={AstroColors.success} />
      ) : null}
    </View>
  );
}

function StatDot() {
  return <View style={styles.statDot} />;
}

function AstrologerCardBase({
  astrologer,
  variant = "full",
  showFavorite,
  onPress,
}: Props) {
  const router = useRouter();
  const model = useMemo(() => toCardModel(astrologer), [astrologer]);
  const topChoice = isTopChoice({
    rating: model.rating,
    totalReviews: model.totalReviews,
  });
  const { visible: cats, extra } = splitCategories(
    model.categories,
    variant === "full" ? 2 : 1,
  );
  const exp = experienceLabel(model.experienceYears);

  const open = () => {
    if (onPress) return onPress(astrologer);
    router.push({
      pathname: "/(user)/astrologer-profile" as any,
      params: { id: astrologer.id },
    });
  };

  const a11yLabel = [
    model.name,
    model.isOnline ? "available now" : "offline",
    hasReviews({ totalReviews: model.totalReviews })
      ? `rating ${formatRating(model.rating)}, ${model.totalReviews} reviews`
      : "new astrologer",
    model.startsAt,
  ]
    .filter(Boolean)
    .join(", ");

  // ── Compact ────────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}
      >
        <View>
          <UserAvatar uri={model.avatarUrl} name={model.name} id={model.id} size={52} />
          <View
            style={[
              styles.compactDot,
              { backgroundColor: model.isOnline ? AstroColors.success : AstroColors.offline },
            ]}
          />
        </View>

        <View style={styles.compactInfo}>
          <NameRow model={model} size={15} />
          {cats.length > 0 ? (
            <Text style={styles.categories} numberOfLines={1}>
              {cats.join(" · ")}
              {extra > 0 ? `  +${extra}` : ""}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <RatingChip model={model} small />
            {exp ? (
              <>
                <StatDot />
                <Text style={styles.statText}>{exp}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.compactRight}>
          {model.price ? <Text style={styles.compactPrice}>{model.price}</Text> : null}
          <View style={styles.compactBook}>
            <Text style={styles.compactBookText}>Book</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // ── Full ───────────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.card,
        topChoice && styles.cardTop,
        pressed && styles.pressed,
      ]}
    >
      {topChoice ? (
        <View style={styles.topTag}>
          <Ionicons name="star" size={10} color={AstroColors.goldDeep} />
          <Text style={styles.topTagText}>Top Choice</Text>
        </View>
      ) : null}

      <View style={styles.top}>
        <View style={styles.avatarCol}>
          <View
            style={[
              styles.avatarRing,
              { borderColor: model.isOnline ? AstroColors.success : AstroColors.brandTintStrong },
            ]}
          >
            <UserAvatar uri={model.avatarUrl} name={model.name} id={model.id} size={68} />
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: model.isOnline ? AstroColors.success : AstroColors.offline },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                model.isOnline && { color: AstroColors.successDark },
              ]}
            >
              {model.isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={[styles.info, topChoice && { paddingRight: 64 }]}>
          <NameRow model={model} size={17} />

          {cats.length > 0 ? (
            <Text style={styles.categories} numberOfLines={1}>
              {cats.join(" · ")}
              {extra > 0 ? `  +${extra}` : ""}
            </Text>
          ) : null}

          {model.languages.length > 0 ? (
            <View style={styles.langRow}>
              <Ionicons name="language-outline" size={13} color={AstroColors.textMuted} />
              <Text style={styles.langText} numberOfLines={1}>
                {model.languages.join(", ")}
              </Text>
            </View>
          ) : null}

          {/* Chip + experience + followers — icons se chhota rakha taaki ek
              line mein aaye; kabhi zyada ho to wrap ho jaaye, cut na ho */}
          <View style={[styles.statsRow, styles.statsWrap]}>
            <RatingChip model={model} />
            {exp ? (
              <View style={styles.stat}>
                <Ionicons name="briefcase-outline" size={12} color={AstroColors.textMuted} />
                <Text style={styles.statText}>{exp}</Text>
              </View>
            ) : null}
            {model.followersCount > 0 ? (
              <View style={styles.stat}>
                <Ionicons name="people-outline" size={13} color={AstroColors.textMuted} />
                <Text style={styles.statText}>{formatCount(model.followersCount)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottom}>
        <View style={styles.priceCol}>
          {model.startsAt ? (
            <Text style={styles.startsAt} numberOfLines={1}>
              {model.startsAt}
            </Text>
          ) : (
            <Text style={styles.noPrice}>Price on profile</Text>
          )}
        </View>

        {(showFavorite ?? true) ? (
          <FavoriteButton itemType="astrologer" itemId={model.id} size={18} style={styles.heart} />
        ) : null}

        <TouchableOpacity onPress={open} activeOpacity={0.9}>
          <LinearGradient
            colors={[AstroColors.brandLight, AstroColors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtn}
          >
            <Text style={styles.bookText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const AstrologerCard = memo(AstrologerCardBase);
export default AstrologerCard;

const styles = StyleSheet.create({
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },

  // ── shared
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontWeight: "800", color: AstroColors.ink, flexShrink: 1 },
  categories: {
    ...AstroType.caption,
    fontSize: 12.5,
    fontWeight: "700",
    color: AstroColors.brand,
  },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "nowrap" },
  statsWrap: { flexWrap: "wrap", rowGap: 4 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { ...AstroType.caption, color: AstroColors.textSecondary, flexShrink: 1 },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: AstroColors.textMuted,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AstroRadius.pill,
  },
  chipSmall: { paddingHorizontal: 6, paddingVertical: 2 },
  chipRating: { backgroundColor: AstroColors.goldTint, borderWidth: 1, borderColor: AstroColors.goldBorder },
  chipNew: { backgroundColor: AstroColors.brandTint },
  chipText: { fontSize: 12, fontWeight: "800" },
  chipCount: { fontSize: 11, fontWeight: "600", color: AstroColors.textSecondary },

  // ── full
  card: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    borderWidth: 1,
    borderColor: AstroColors.border,
    padding: AstroSpacing.md,
    overflow: "hidden",
    ...AstroShadow.card,
  },
  cardTop: { borderColor: AstroColors.goldBorder },
  topTag: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: AstroColors.goldTint,
    borderBottomLeftRadius: AstroRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: AstroColors.goldBorder,
  },
  topTagText: { fontSize: 10.5, fontWeight: "800", color: AstroColors.goldDeep },
  top: { flexDirection: "row", gap: AstroSpacing.md },
  avatarCol: { alignItems: "center", gap: 6, width: 76 },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { ...AstroType.micro, color: AstroColors.textSecondary },
  info: { flex: 1, gap: 5, justifyContent: "center" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  langText: { ...AstroType.caption, color: AstroColors.textSecondary, flexShrink: 1 },
  divider: {
    height: 1,
    backgroundColor: AstroColors.border,
    marginTop: AstroSpacing.md,
    marginBottom: AstroSpacing.sm,
  },
  bottom: { flexDirection: "row", alignItems: "center", gap: AstroSpacing.sm },
  priceCol: { flex: 1 },
  startsAt: { fontSize: 13.5, fontWeight: "800", color: AstroColors.ink },
  noPrice: { ...AstroType.caption, color: AstroColors.textMuted },
  heart: {
    backgroundColor: AstroColors.brandTint,
    elevation: 0,
    shadowOpacity: 0,
  },
  bookBtn: {
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: 20,
    borderRadius: AstroRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bookText: { ...AstroType.button, color: AstroColors.onBrand },

  // ── compact
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: AstroSpacing.md,
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    borderWidth: 1,
    borderColor: AstroColors.border,
    padding: AstroSpacing.md,
    ...AstroShadow.soft,
  },
  compactDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: AstroColors.surface,
  },
  compactInfo: { flex: 1, gap: 4 },
  compactRight: { alignItems: "flex-end", gap: 6 },
  compactPrice: { fontSize: 14, fontWeight: "800", color: AstroColors.ink },
  compactBook: {
    backgroundColor: AstroColors.brand,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: AstroRadius.pill,
  },
  compactBookText: { fontSize: 12.5, fontWeight: "800", color: AstroColors.onBrand },
});
