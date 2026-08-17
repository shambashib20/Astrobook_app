import ScreenHeader from "@/components/ScreenHeader";
import UserAvatar from "@/components/UserAvatar";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import type { AppNotification } from "@/features/notifications/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "abhi";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function messageFor(n: AppNotification): string {
  const name = n.actorName ?? "Kisi ne";
  switch (n.type) {
    case "new_follower":
      return `${name} ne aapko follow karna shuru kiya`;
    case "post_liked":
      return `${name} ne aapki post like ki`;
    case "post_commented":
      return `${name} ne aapki post pe comment kiya`;
    default:
      return "";
  }
}

function iconFor(type: AppNotification["type"]) {
  switch (type) {
    case "new_follower":
      return { name: "user-plus" as const, color: "#9d0399" };
    case "post_liked":
      return { name: "heart" as const, color: "#DC2626" };
    case "post_commented":
      return { name: "message-circle" as const, color: "#2563EB" };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    loading,
    refreshing,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handlePress = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id);

    if (n.type === "post_liked" || n.type === "post_commented") {
      if (n.postId) router.push({ pathname: "/(user)/post/[id]", params: { id: n.postId } });
      return;
    }
    // new_follower — sirf astrologer actors ka public profile hota hai,
    // plain user actor ke liye kahin navigate nahi karna
    if (n.type === "new_follower" && n.actorRole === "astrologer") {
      router.push({
        pathname: "/(user)/astrologer-profile",
        params: { id: n.actorId },
      });
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Notifications"
        fallbackHref="/(user)/(tabs)/profile"
        rightSlot={
          hasUnread ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAllText}>Sab read karo</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerFill}>
          <Feather name="bell" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Abhi koi notification nahi hai</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={["#9d0399"]}
              tintColor="#9d0399"
            />
          }
          renderItem={({ item }) => {
            const icon = iconFor(item.type);
            return (
              <TouchableOpacity
                style={[styles.row, !item.isRead && styles.rowUnread]}
                activeOpacity={0.7}
                onPress={() => handlePress(item)}
              >
                <View style={styles.avatarWrap}>
                  <UserAvatar
                    uri={item.actorAvatar}
                    name={item.actorName}
                    id={item.actorId}
                    size={44}
                  />
                  <View style={styles.iconBadge}>
                    <Feather name={icon.name} size={11} color="#FFF" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.message} numberOfLines={2}>
                    {messageFor(item)}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  markAllText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "600" },

  list: { paddingVertical: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowUnread: { backgroundColor: "#FBF5FF" },
  avatarWrap: { position: "relative" },
  iconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9d0399",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  message: { fontSize: 13.5, color: "#1A1A2E", lineHeight: 19 },
  time: { fontSize: 11.5, color: "#9CA3AF", marginTop: 3 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9d0399",
  },
});
