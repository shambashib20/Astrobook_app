import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import {
  useMyProfile,
  useUpdateProfile,
} from "@/features/users/hooks/useProfile";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Backend ke INTEREST_OPTIONS (server/src/modules/users/schemas/user.schema.ts)
// se match karta hai
const INTEREST_OPTIONS = [
  "Numerology",
  "Vastu",
  "Past Life",
  "Reiki",
  "Tarot",
  "Astrology",
  "Palmistry",
  "Face Reading",
  "Kundli",
  "Horoscope",
  "Gemstones",
  "Meditation",
] as const;

function toApiDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const { profile, loading: loadingProfile, fetchProfile } = useMyProfile();
  const { updateProfile, loading: saving } = useUpdateProfile((updated) => {
    updateUser({
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
    });
    router.back();
  });

  const [name, setName] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { uploadImage, uploading: avatarUploading } = useImageKitUpload();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setDob(profile.dateOfBirth ? new Date(profile.dateOfBirth) : null);
    setInterests(profile.interests ?? []);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [profile]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const prevUrl = avatarUrl;
    setAvatarUrl(uri); // turant preview dikhao, upload background mein

    const url = await uploadImage(
      uri,
      `avatar_${Date.now()}.jpg`,
      "/astrobook/avatars",
    );
    if (url) {
      setAvatarUrl(url);
    } else {
      Alert.alert("Error", "Photo upload nahi hui, dobara try karo");
      setAvatarUrl(prevUrl);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateProfile({
      name: name.trim(),
      dateOfBirth: dob ? toApiDate(dob) : undefined,
      interests,
      bio: bio.trim(),
      ...(avatarUrl && avatarUrl.startsWith("http") ? { avatarUrl } : {}),
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Edit Profile"
        subtitle="Apni details update karo"
        fallbackHref="/(user)/profile"
      />

      {loadingProfile ? (
        <ActivityIndicator color="#9d0399" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={pickAvatar}
            disabled={avatarUploading}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.avatarEditIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Photo change karne ke liye tap karo</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Apna naam likho"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            maxLength={255}
          />

          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Apne baare mein kuch likho..."
            placeholderTextColor="#9CA3AF"
            value={bio}
            onChangeText={setBio}
            maxLength={500}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>

          <Text style={styles.fieldLabel}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.inputText}>
              {dob
                ? dob.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Select date"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dob ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) setDob(date);
              }}
            />
          )}

          <Text style={styles.fieldLabel}>Interests</Text>
          <View style={styles.chipsRow}>
            {INTEREST_OPTIONS.map((interest) => {
              const isSelected = interests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: { padding: 20, gap: 12 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },

  avatarWrapper: {
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EDE9FF",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EDE9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: { fontSize: 36 },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#9d0399",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F9F5FF",
  },
  avatarEditIcon: { fontSize: 13 },
  avatarHint: {
    alignSelf: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  bioInput: { minHeight: 90 },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: -6,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  inputText: { fontSize: 15, color: "#1A1A2E" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#FFF" },

  saveBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});