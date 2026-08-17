import ScreenHeader from "@/components/ScreenHeader";
import UserAvatar from "@/components/UserAvatar";
import { useUser } from "@/features/auth/store/auth.store";
import { followsService } from "@/features/follows/services";
import type { FollowUser } from "@/features/follows/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "followers" | "following";

// ─── FollowListScreen ───────────────────────────────────────────────────────
// Ek hi shared screen — plain user aur astrologer dono ke liye.
//
// role='user'       → sirf "Following" tab (user ko koi follow nahi kar
//                      sakta, "Followers" ka concept hi nahi hai unke liye)
// role='astrologer' → dono tabs, "Followers" | "Following" (astrologer
//                      khud bhi follow hota hai aur dusre astrologers ko
//                      follow bhi kar sakta hai)
export default function FollowListScreen() {
  const router = useRouter();
  const currentUser = useUser();
  const { userId, name, role, initialTab } = useLocalSearchParams<{
    userId: string;
    name?: string;
    role: "user" | "astrologer";
    initialTab?: Tab;
  }>();

  const showTabs = role === "astrologer";
  const [activeTab, setActiveTab] = useState<Tab>(
    (initialTab as Tab) ?? "following",
  );
  const [list, setList] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async (tab: Tab) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data =
        tab === "followers"
          ? await followsService.getFollowers(userId)
          : await followsService.getFollowing(userId);
      setList(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "List load nahi hui");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(activeTab);
  }, [userId, activeTab]);

  const goToProfile = (person: FollowUser) => {
    // Sirf astrologers ka public profile hota hai — plain user pe tap
    // karne ka koi destination nahi hai
    if (person.role !== "astrologer") return;
    router.push({
      pathname: "/(user)/astrologer-profile",
      params: { id: person.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title={
          showTabs
            ? activeTab === "followers"
              ? "Followers"
              : "Following"
            : "Following"
        }
        subtitle={name}
        fallbackHref="/(user)/(tabs)/profile"
      />

      {showTabs && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "followers" && styles.tabActive]}
            onPress={() => setActiveTab("followers")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "followers" && styles.tabTextActive,
              ]}
            >
              Followers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "following" && styles.tabActive]}
            onPress={() => setActiveTab("following")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "following" && styles.tabTextActive,
              ]}
            >
              Following
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyText}>
            {activeTab === "followers"
              ? "Abhi koi follower nahi hai"
              : "Abhi kisi ko follow nahi kiya"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={item.role === "astrologer" ? 0.7 : 1}
              onPress={() => goToProfile(item)}
            >
              <UserAvatar uri={item.avatarUrl} name={item.name} id={item.id} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name ?? "User"}</Text>
                {item.role === "astrologer" && (
                  <Text style={styles.badge}>✨ Astrologer</Text>
                )}
              </View>
              {item.id === currentUser?.id && (
                <Text style={styles.youTag}>You</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#F5F0FF",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#9d0399" },
  tabText: { fontSize: 13.5, fontWeight: "700", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },

  list: { padding: 16, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  name: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  badge: { fontSize: 12, color: "#9d0399", marginTop: 2, fontWeight: "600" },
  youTag: {
    fontSize: 11.5,
    color: "#9d0399",
    fontWeight: "700",
    backgroundColor: "#F5F0FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
