import { colorForId } from "@/utils/colorUtils";
import { Image, StyleSheet, Text, View } from "react-native";

type UserAvatarProps = {
  /** Real uploaded profile photo URL — agar hai toh yehi dikhega */
  uri?: string | null;
  /** Fallback ke liye — initial letter aur consistent color isi se ban te hain */
  name?: string | null;
  /** id har jagah same color-per-person ke liye (feed pe astrologerId, list mein bhi wahi) */
  id?: string | null;
  size?: number;
};

// ─── UserAvatar ──────────────────────────────────────────────────────────────
// Ek hi jagah se poore app mein profile photo dikhane ka tareeka — Feed,
// Astrologers list, Astrologer detail page, jahan bhi kisi user/astrologer
// ka avatar chahiye, yehi component use karo. Photo ho toh real Image,
// nahi toh naam ka pehla letter (consistent color ke saath, id se derive)
// — random emoji fallback ki jagah, taaki visually consistent aur
// professional lage.
export default function UserAvatar({
  uri,
  name,
  id,
  size = 44,
}: UserAvatarProps) {
  const bgColor = colorForId(id ?? name ?? "astro");
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: "#EDE9FF" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initial: { color: "#FFFFFF", fontWeight: "800" },
});
