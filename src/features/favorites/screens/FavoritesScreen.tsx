import ScreenHeader from "@/components/ScreenHeader";
import { AstroColors, AstroRadius } from "@/constants/astro-theme";
import AstrologerCard from "@/features/astrologer/components/AstrologerCard";
import type { AstrologerProfile } from "@/features/astrologer/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FavoriteButton from "../components/FavoriteButton";
import { useFavoritesList } from "../hooks/useFavorites";
import type { FavoriteItem, FavoriteItemType } from "../types";

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const router = useRouter();
  const { service } = item;
  const price = service.price ? `₹${Number(service.price)}` : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/(user)/service/[id]" as any,
          params: { id: item.itemId, astroId: service.astrologerId },
        })
      }
    >
      <View style={styles.thumbnail}>
        {service.coverImage ? (
          <Image source={{ uri: service.coverImage }} style={styles.thumbImg} />
        ) : (
          <Text style={{ fontSize: 28 }}>{service.isBasic ? "🔮" : "✨"}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {service.title}
        </Text>
        {service.astrologerName ? (
          <Text style={styles.astro} numberOfLines={1}>
            with {service.astrologerName}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          ⏱ {service.durationMinutes} min{price ? `  ·  ${price}` : ""}
        </Text>
      </View>

      {/* Yahin se un-favourite — list se turant hat jaata hai */}
      <FavoriteButton itemId={item.itemId} style={styles.heart} />
    </TouchableOpacity>
  );
}

const TABS: { key: FavoriteItemType; label: string }[] = [
  { key: "astrologer", label: "Astrologers" },
  { key: "service", label: "Consultations" },
];

export default function FavoritesScreen() {
  // Astrologers pehle — "woh astrologer jo pasand aaya tha" sabse zyada
  // dhundha jaane wala case hai
  const [tab, setTab] = useState<FavoriteItemType>("astrologer");

  const services = useFavoritesList("service", { enabled: tab === "service" });
  const astrologers = useFavoritesList("astrologer", { enabled: tab === "astrologer" });

  // Card ko AstrologerProfile chahiye (favourites API phone nahi bhejti)
  const astrologerItems = useMemo<AstrologerProfile[]>(
    () => (astrologers.data ?? []).map((i) => ({ ...i.astrologer, phone: null })),
    [astrologers.data],
  );

  const active = tab === "astrologer" ? astrologers : services;
  const count = tab === "astrologer" ? astrologerItems.length : (services.data?.length ?? 0);

  const emptyView = (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Feather name="heart" size={30} color="#9d0399" />
      </View>
      <Text style={styles.emptyTitle}>
        {tab === "astrologer" ? "No saved astrologers yet" : "No favourites yet"}
      </Text>
      <Text style={styles.emptyText}>
        {tab === "astrologer"
          ? "Tap the heart on any astrologer's card to save them here for easy access later."
          : "Tap the heart on any consultation to save it here."}
      </Text>
    </View>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={active.isRefetching}
      onRefresh={active.refetch}
      colors={["#9d0399"]}
      tintColor="#9d0399"
    />
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Favourites"
        subtitle="Things you've saved"
        fallbackHref="/(user)/(tabs)/feed"
      />

      <View style={styles.segment} accessibilityRole="tablist">
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentItem, selected && styles.segmentItemActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : active.isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Favourites load nahi hue</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => active.refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : tab === "astrologer" ? (
        <FlatList
          data={astrologerItems}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AstrologerCard astrologer={item} />}
          contentContainerStyle={[styles.list, count === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListEmptyComponent={emptyView}
        />
      ) : (
        <FlatList
          data={services.data ?? []}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <FavoriteCard item={item} />}
          contentContainerStyle={[styles.list, count === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListEmptyComponent={emptyView}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F0FF" },
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 3,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.brandTint,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AstroRadius.sm + 1,
  },
  segmentItemActive: { backgroundColor: AstroColors.brand },
  segmentText: { fontSize: 13, fontWeight: "700", color: AstroColors.textSecondary },
  segmentTextActive: { color: AstroColors.onBrand },
  list: { padding: 16, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    padding: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: 64, height: 64 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  astro: { fontSize: 13, color: "#6B7280" },
  meta: { fontSize: 12, color: "#4A4468", marginTop: 2 },
  heart: { elevation: 0, shadowOpacity: 0, backgroundColor: "#F5F0FF" },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A2E" },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: { color: "#9d0399", fontWeight: "700", fontSize: 14 },
});
