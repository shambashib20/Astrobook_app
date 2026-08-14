import Header from "@/components/header";
import UserAvatar from "@/components/UserAvatar";
import { useAstrologersList } from "@/features/astrologer/hooks/useAstrologersList";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={12}
          color={i <= Math.round(rating) ? "#F59E0B" : "#E5E7EB"}
          style={i <= Math.round(rating) ? styles.starFilled : undefined}
        />
      ))}
      <Text style={styles.ratingValue}>{rating}</Text>
    </View>
  );
}

type FilterKey = "all" | "online" | "top";

export default function AstrologersScreen() {
  const router = useRouter();
  // useAstrologersList ab React Query se hai — initial fetch khud-ba-khud
  // ho jaata hai aur cache hota hai, isliye yahan manually trigger nahi
  // karna (warna mount pe double-fetch hoga).
  const { astrologers, loading, error } = useAstrologersList();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredAstrologers = useMemo(() => {
    let list = astrologers;

    if (filter === "online") {
      list = list.filter((a) => a.meta?.online);
    } else if (filter === "top") {
      list = list.filter((a) => (a.meta?.rating ?? 0) >= 4.5);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        return (
          a.name?.toLowerCase().includes(q) ||
          a.meta?.speciality?.toLowerCase().includes(q) ||
          a.meta?.languages?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [astrologers, filter, search]);

  const onlineCount = useMemo(
    () => astrologers.filter((a) => a.meta?.online).length,
    [astrologers]
  );

  const goToProfile = (id: string) => {
    router.push({
      pathname: "/(user)/astrologer-profile" as any,
      params: { id },
    });
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "online", label: "🟢 Online" },
    { key: "top", label: "⭐ Top Rated" },
  ];

  return (
    <View style={styles.root}>
      <Header />

      <View style={styles.introSection}>
        <Text style={styles.introTitle}>Find Your Astrologer</Text>
        <Text style={styles.introSubtitle}>
          {onlineCount > 0
            ? `${onlineCount} experts online now, ready to guide you`
            : "Connect with expert astrologers for guidance"}
        </Text>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#9d0399" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skill or language"
            placeholderTextColor="#B8A2C9"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="#9d0399" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Feather name="alert-circle" size={28} color="#D97706" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : filteredAstrologers.length === 0 ? (
        <View style={styles.centerFill}>
          <Feather name="users" size={28} color="#C4B5E0" />
          <Text style={styles.emptyText}>Koi astrologer nahi mila</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAstrologers}
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
                      size={72}
                    />
                    {meta?.online && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.name ?? "Astrologer"}
                      </Text>
                      <Feather name="check-circle" size={13} color="#22C55E" />
                    </View>

                    <View style={styles.specialityPill}>
                      <Text style={styles.specialityPillText} numberOfLines={1}>
                        {meta?.speciality ?? "Astrologer"}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Feather name="globe" size={11} color="#8A8093" />
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {meta?.languages ?? "—"}
                      </Text>
                      {meta?.exp ? (
                        <>
                          <View style={styles.metaDivider} />
                          <Feather name="briefcase" size={11} color="#8A8093" />
                          <Text style={styles.cardMeta}>{meta.exp}</Text>
                        </>
                      ) : null}
                    </View>

                    <View style={styles.ratingRow}>
                      <StarRating rating={meta?.rating ?? 0} />
                      <Text style={styles.reviewCount}>
                        · {meta?.reviews ?? 0} reviews
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View style={styles.statusPill}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: meta?.online ? "#22C55E" : "#C4B5E0",
                        },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {meta?.online ? "Available now" : "Offline"}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.followBtn}
                      onPress={(e) => e.stopPropagation?.()}
                    >
                      <Feather name="heart" size={16} color="#9d0399" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => goToProfile(item.id)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={["#B4179F", "#7A0480"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bookBtn}
                      >
                        <Text style={styles.bookBtnText}>Book Now</Text>
                        <Text style={styles.bookBtnPrice}>
                          {item.basicPrice ? `₹${item.basicPrice}` : "—"}
                        </Text>
                      </LinearGradient>
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
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  introSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#fff1ff",
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0b1d5b",
  },
  introSubtitle: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 12,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "#EDE0F5",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0b1d5b",
    padding: 0,
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EDE0F5",
  },
  filterChipActive: {
    backgroundColor: "#9d0399",
    borderColor: "#9d0399",
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#6B4E77",
  },
  filterChipTextActive: {
    color: "#FFF",
  },

  listContent: { padding: 16, gap: 14 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    elevation: 4,
    shadowColor: "#5B0E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    flexShrink: 0,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1d5b",
    flexShrink: 1,
  },
  specialityPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FBEBFF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 6,
    maxWidth: "100%",
  },
  specialityPillText: {
    fontSize: 12,
    color: "#9d0399",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1C4DE",
    marginHorizontal: 2,
  },
  cardMeta: { fontSize: 11.5, color: "#8A8093" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  starFilled: {},
  ratingValue: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 3,
    fontWeight: "600",
  },
  reviewCount: { fontSize: 11.5, color: "#9d0399" },

  cardDivider: {
    height: 1,
    backgroundColor: "#F3EDFA",
    marginHorizontal: 16,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11.5, color: "#6B7280", fontWeight: "600" },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  followBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FBEBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bookBtnText: { color: "#FFF", fontSize: 12.5, fontWeight: "700" },
  bookBtnPrice: {
    color: "#F2CFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
