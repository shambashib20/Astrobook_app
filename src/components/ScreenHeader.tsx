import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  // Agar back stack empty ho (tab root se seedha aaye), yahan fallback jaayenge
  fallbackHref?: string;
  rightSlot?: React.ReactNode;
};

// Astrobook ka shared deep-blue panel header — back button ke saath.
// Har astrologer sub-screen (Services, Availability, Posts) aur
// Edit Profile isi ko use karte hain, taaki app mein wapas jaane ka
// ek consistent tarika ho.
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  fallbackHref = "/(astrologer)/dashboard",
  rightSlot,
}: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref as any);
  };

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#9d0399",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  subtitle: { fontSize: 13, color: "#EBC4E8", marginTop: 4 },
});
