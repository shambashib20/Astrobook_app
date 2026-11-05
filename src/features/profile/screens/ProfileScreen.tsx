import Header from "@/components/header";
import { AstroColors } from "@/constants/astro-theme";
import { useAstrologerApplicationStatus } from "@/features/astrologer-application/hooks/useAstrologerApplication";
import { AstrologerProfileView } from "@/features/astrologer/components/AstrologerProfileView";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore, useUser } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { usePendingCancellations } from "@/features/wallet/hooks/useWallet";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import ApplicationStatusCard from "../components/ApplicationStatusCard";
import LogoutButton from "../components/LogoutButton";
import ProfileCtaCard from "../components/ProfileCtaCard";
import ProfileHeroCard from "../components/ProfileHeroCard";
import ProfileMenu from "../components/ProfileMenu";
import { useProfileStats } from "../hooks/useProfileStats";
import { USER_MENU } from "../menu";

export default function ProfileScreen() {
  const router = useRouter();
  // isAstrologer ka gate Zustand se — session-level fact hai, login par hi pata
  // hota hai, isliye flicker-free branch decision.
  const sessionUser = useUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const { isLoading } = useAuthStore();
  // Display data useMyProfile() se — Edit Profile bhi yahi cache use karta hai.
  const { profile, fetchProfile } = useMyProfile();
  const { handleLogout } = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    status: applicationStatus,
    loading: applicationLoading,
    refetch: refetchApplicationStatus,
  } = useAstrologerApplicationStatus(!sessionUser?.isAstrologer);
  // Hooks early-return se PEHLE hi call hone chahiye (Rules of Hooks).
  const user = profile ?? sessionUser;
  const { stats, fetchCounts } = useProfileStats(sessionUser?.id, user?.name, "user");

  // Pending cancellation choices — "My Bookings" pe badge dikhane ke liye
  const { requests: pendingCancellations, refetch: refetchPendingCancellations } =
    usePendingCancellations();


  // USER_MENU mein "My Bookings" ke paas badge inject karo
  const menuWithBadges = useMemo(() => {
    const pendingCount = pendingCancellations.length;
    return USER_MENU.map((item) =>
      item.route === "/(user)/my-bookings" && pendingCount > 0
        ? { ...item, badge: pendingCount }
        : item,
    );
  }, [pendingCancellations.length]);

  // Pull-to-refresh: admin ne approve kiya ho to bina restart pata chal jaye.
  // isAstrologer/role Zustand me hai, isliye fresh profile store me bhi sync karte hain.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [profileResult] = await Promise.all([
        fetchProfile(),
        refetchApplicationStatus(),
        fetchCounts(),
        refetchPendingCancellations(),
      ]);
      if (profileResult?.data) {
        updateUser({
          isAstrologer: profileResult.data.isAstrologer,
          role: profileResult.data.role,
          name: profileResult.data.name,
          avatarUrl: profileResult.data.avatarUrl,
          bio: profileResult.data.bio,
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) return null;

  // Astrologer hai — same route, alag view (koi redirect nahi)
  if (sessionUser?.isAstrologer) return <AstrologerProfileView />;

  const onLogout = async () => {
    setLoggingOut(true);
    await handleLogout();
    setLoggingOut(false);
  };

  const goApply = () => router.push("/(user)/become-astrologer" as any);

  return (
    <View style={styles.root}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AstroColors.brand]}
            tintColor={AstroColors.brand}
          />
        }
      >
        <ProfileHeroCard
          id={sessionUser?.id}
          name={user?.name}
          email={user?.email}
          phone={user?.phone}
          bio={user?.bio}
          avatarUrl={user?.avatarUrl}
          stats={stats}
          onEdit={() => router.push("/(user)/edit-profile" as any)}
        />

        {!applicationLoading && applicationStatus ? (
          <>
            {!applicationStatus.hasApplied ? (
              <ProfileCtaCard
                icon="star"
                title="Become an Astrologer"
                subtitle="List your services and start receiving bookings"
                onPress={goApply}
              />
            ) : null}
            {applicationStatus.verificationStatus === "pending" ? (
              <ApplicationStatusCard kind="pending" onReapply={goApply} />
            ) : null}
            {applicationStatus.verificationStatus === "rejected" ? (
              <ApplicationStatusCard
                kind="rejected"
                reason={applicationStatus.rejectionReason}
                onReapply={goApply}
              />
            ) : null}
          </>
        ) : null}

        <ProfileMenu items={menuWithBadges} onNavigate={(r) => router.push(r as any)} />
        <LogoutButton loading={loggingOut} onPress={onLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
});