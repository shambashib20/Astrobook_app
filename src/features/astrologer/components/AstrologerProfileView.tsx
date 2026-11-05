import Header from "@/components/header";
import { AstroColors } from "@/constants/astro-theme";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useUser } from "@/features/auth/store/auth.store";
import LogoutButton from "@/features/profile/components/LogoutButton";
import ProfileCtaCard from "@/features/profile/components/ProfileCtaCard";
import ProfileHeroCard from "@/features/profile/components/ProfileHeroCard";
import ProfileMenu from "@/features/profile/components/ProfileMenu";
import { useProfileStats } from "@/features/profile/hooks/useProfileStats";
import { ASTROLOGER_MENU } from "@/features/profile/menu";
import { useMyProfile } from "@/features/users/hooks/useProfile";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

// Astrologer ka profile tab — user wale profile jaisa hi look (shared
// components), upar se dashboard shortcut. Posts /(astrologer)/posts pe hain.
export function AstrologerProfileView() {
  const router = useRouter();
  const sessionUser = useUser();
  // Fresh data (Edit Profile se turant sync) useMyProfile() se
  const { profile } = useMyProfile();
  const user = profile ?? sessionUser;
  const { handleLogout } = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);
  const { stats } = useProfileStats(sessionUser?.id, user?.name, "astrologer");

  const onLogout = async () => {
    setLoggingOut(true);
    await handleLogout();
    setLoggingOut(false);
  };

  return (
    <View style={styles.root}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHeroCard
          id={sessionUser?.id}
          name={user?.name ?? "Astrologer"}
          email={user?.email}
          phone={user?.phone}
          bio={user?.bio}
          avatarUrl={user?.avatarUrl}
          badge="Astrologer"
          stats={stats}
          onEdit={() => router.push("/(user)/edit-profile" as any)}
        />

        <ProfileCtaCard
          icon="bar-chart-2"
          title="Go to Dashboard"
          subtitle="Services, sessions and earnings"
          onPress={() => router.push("/(astrologer)/dashboard" as any)}
        />

        <ProfileMenu items={ASTROLOGER_MENU} onNavigate={(r) => router.push(r as any)} />
        <LogoutButton loading={loggingOut} onPress={onLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
});
