import Header from "@/components/header";
import UserAvatar from "@/components/UserAvatar";
import { useAstrologersList } from "@/features/astrologer/hooks/useAstrologersList";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: 12,
            color: i <= Math.floor(rating) ? "#F59E0B" : "#E5E7EB",
          }}
        >
          ★
        </Text>
      ))}
      <Text style={{ fontSize: 11, color: "#6B7280", marginLeft: 4 }}>
        {rating}
      </Text>
    </View>
  );
}

export default function AstrologersScreen() {
  const router = useRouter();
  // useAstrologersList ab React Query se hai — initial fetch khud-ba-khud
  // ho jaata hai aur cache hota hai, isliye yahan manually trigger nahi
  // karna (warna mount pe double-fetch hoga).
  const { astrologers, loading, error } = useAstrologersList();

  const goToProfile = (id: string) => {
    router.push({
      pathname: "/(user)/astrologer-profile" as any,
      params: { id },
    });
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
      ) : astrologers.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Koi astrologer nahi mila</Text>
        </View>
      ) : (
        <FlatList
          data={astrologers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = item.meta;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => goToProfile(item.id)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatarContainer}>
                    <UserAvatar
                      uri={item.avatarUrl}
                      name={item.name}
                      id={item.id}
                      size={74}
                    />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name ?? "Astrologer"}
                    </Text>
                    <Text style={styles.cardSpeciality}>
                      {meta?.speciality ?? "Astrologer"}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {meta?.languages ?? "—"}
                      {meta?.exp ? ` · Exp: ${meta.exp}` : ""}
                    </Text>

                    <View style={styles.ratingRow}>
                      <StarRating rating={meta?.rating ?? 0} />
                      <Text style={styles.reviewCount}>
                        · {meta?.reviews ?? 0} reviews
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <TouchableOpacity
                      style={styles.followBtn}
                      onPress={(e) => e.stopPropagation?.()}
                    >
                      <Text style={styles.followBtnText}>Follow +</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bookBtnWrapper}
                      onPress={() => goToProfile(item.id)}
                    >
                      <View style={styles.bookBtnTop}>
                        <Text style={styles.bookBtnText}>Book Now</Text>
                      </View>
                      <View style={styles.bookBtnBottom}>
                        <Text style={styles.bookBtnPrice}>
                          {item.basicPrice ? `₹${item.basicPrice}` : "—"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  listContent: { padding: 16, gap: 16 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    padding: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#e8d5f5",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 34 },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1d5b",
    marginBottom: 1,
  },
  cardSpeciality: {
    fontSize: 13,
    color: "#9d0399",
    fontWeight: "600",
    marginBottom: 2,
  },
  cardMeta: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewCount: { fontSize: 12, color: "#9d0399" },
  cardRight: { alignItems: "flex-end", gap: 8 },

  followBtn: { paddingHorizontal: 4 },
  followBtnText: { color: "#9d0399", fontSize: 12, fontWeight: "600" },

  bookBtnWrapper: {
    backgroundColor: "#9d0399",
    borderRadius: 8,
    overflow: "hidden",
    minWidth: 80,
  },
  bookBtnTop: {
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: "#9d0399",
  },
  bookBtnBottom: {
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: "#eac0e8",
  },
  bookBtnText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  bookBtnPrice: { color: "#9d0399", fontSize: 11, fontWeight: "700" },
});
