import UserAvatar from "@/components/UserAvatar";
import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
} from "@/constants/astro-theme";
import { formatRating } from "@/features/astrologer/utils/cardFormat";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAstrologerReviews } from "../hooks/useReviews";
import type { Review, ReviewSummary } from "../types";
import { StarsRow } from "./Stars";

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Summary({ summary }: { summary: ReviewSummary }) {
  return (
    <View style={styles.summary}>
      <View style={styles.avgCol}>
        <Text style={styles.avg}>{formatRating(summary.average)}</Text>
        <StarsRow rating={summary.average} size={13} />
        <Text style={styles.total}>
          {summary.total} review{summary.total === 1 ? "" : "s"}
        </Text>
      </View>
      <View style={styles.bars}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.distribution[star];
          const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHead}>
        <UserAvatar
          uri={review.reviewer.avatarUrl}
          name={review.reviewer.name}
          id={review.id}
          size={34}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewer} numberOfLines={1}>
            {review.reviewer.name}
          </Text>
          <Text style={styles.date}>{dateLabel(review.createdAt)}</Text>
        </View>
        <StarsRow rating={review.rating} size={13} />
      </View>
      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
    </View>
  );
}

export default function AstrologerReviewsSection({
  astrologerId,
}: {
  astrologerId: string;
}) {
  const { summary, reviews, loading, error, hasMore, loadingMore, loadMore, refetch } =
    useAstrologerReviews(astrologerId);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews</Text>

      {loading ? (
        <ActivityIndicator color={AstroColors.brand} style={{ marginTop: 12 }} />
      ) : error ? (
        <TouchableOpacity style={styles.empty} onPress={() => refetch()}>
          <Text style={styles.emptyText}>Failed to load reviews — tap to retry</Text>
        </TouchableOpacity>
      ) : !summary || summary.total === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No reviews yet — be the first to rate after your session
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Summary summary={summary} />
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
          {hasMore && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={loadMore}
              disabled={loadingMore}
              accessibilityRole="button"
            >
              {loadingMore ? (
                <ActivityIndicator color={AstroColors.brand} />
              ) : (
                <Text style={styles.moreText}>Aur reviews dekho</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AstroColors.ink,
    marginBottom: 12,
  },
  card: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.lg,
    borderWidth: 1,
    borderColor: AstroColors.border,
    padding: 14,
    ...AstroShadow.soft,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: AstroColors.border,
  },
  avgCol: { alignItems: "center", gap: 4, minWidth: 84 },
  avg: { fontSize: 36, fontWeight: "900", color: AstroColors.ink },
  total: { ...AstroType.micro, color: AstroColors.textSecondary },
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 10, fontSize: 11, color: AstroColors.textSecondary },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: AstroColors.brandTint,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: AstroColors.gold },
  barCount: {
    width: 24,
    fontSize: 11,
    color: AstroColors.textSecondary,
    textAlign: "right",
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AstroColors.brandTint,
    gap: 8,
  },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewer: { fontSize: 13, fontWeight: "700", color: AstroColors.text },
  date: { fontSize: 11, color: AstroColors.textMuted },
  comment: { fontSize: 13, lineHeight: 19, color: "#374151" },
  moreBtn: { alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: 4 },
  moreText: { ...AstroType.body, color: AstroColors.brand, fontWeight: "700" },
  empty: {
    backgroundColor: AstroColors.surface,
    borderRadius: AstroRadius.md,
    borderWidth: 1,
    borderColor: AstroColors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: AstroColors.textMuted, textAlign: "center" },
});
