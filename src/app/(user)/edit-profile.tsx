import ScreenHeader from "@/components/ScreenHeader";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import {
  useMyProfile,
  useUpdateProfile,
} from "@/features/users/hooks/useProfile";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toApiDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Kundli birth details
  const [birthTime, setBirthTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Inline validation (show on blur only)
  const [nameTouched, setNameTouched] = useState(false);

  const { uploadImage, uploading: avatarUploading } = useImageKitUpload();
  const { categories, loading: categoriesLoading, fetchCategories } = useCategories();

  // Original values for dirty check
  const origRef = useRef({
    name: "",
    email: "",
    dob: null as Date | null,
    birthTime: null as Date | null,
    birthPlace: "",
    interests: [] as string[],
    bio: "",
    avatarUrl: null as string | null,
  });

  // Form sirf ONCE initialize ho — profile ya categories dubara load hone pe
  // user ka input reset na ho (categories late load hoti hain aur reset trigger karti thi).
  const initializedRef = useRef(false);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Pehli baar hi init karo — baad mein categories load hone pe dobara mat chalao
    if (!profile) return;
    if (initializedRef.current) return;

    const filteredInterests =
      categories.length > 0
        ? (profile.interests ?? []).filter((id) =>
            categories.some((cat) => cat.id === id),
          )
        : (profile.interests ?? []);

    // Agar categories abhi tak load nahi huii, interests ka wait karo
    // lekin name/email/dob/birthTime/birthPlace abhi set karo
    const canInitInterests = categories.length > 0;

    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
    setDob(profile.dateOfBirth ? new Date(profile.dateOfBirth) : null);
    // Birth time: "HH:MM:SS" string → Date object (sirf time ke liye)
    const parsedBirthTime = (() => {
      if (!profile.birthTime) return null;
      const [h, m] = profile.birthTime.split(":").map(Number);
      const d = new Date();
      d.setHours(h ?? 0, m ?? 0, 0, 0);
      return d;
    })();
    setBirthTime(parsedBirthTime);
    setBirthPlace(profile.birthPlace ?? "");
    setInterests(filteredInterests);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);

    origRef.current = {
      name: profile.name ?? "",
      email: profile.email ?? "",
      dob: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
      birthTime: parsedBirthTime,
      birthPlace: profile.birthPlace ?? "",
      interests: filteredInterests,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? null,
    };

    // Categories bhi load ho gayi toh mark as initialized
    if (canInitInterests) {
      initializedRef.current = true;
    }
  }, [profile, categories]);

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
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
    setAvatarUrl(uri); // Optimistic preview

    const url = await uploadImage(uri, `avatar_${Date.now()}.jpg`, "/astrobook/avatars");
    if (url) {
      setAvatarUrl(url);
    } else {
      Alert.alert("Error", "Failed to upload photo. Please try again.");
      setAvatarUrl(prevUrl);
    }
  };

  // Birth time → "HH:MM:SS" string
  function toBirthTimeStr(d: Date | null): string {
    if (!d) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
  }

  // Dirty check — stale interest ids ko "changed" mat ginna
  const isDirty = (() => {
    const o = origRef.current;
    if (name !== o.name) return true;
    if (email !== o.email) return true;
    if (bio !== o.bio) return true;
    if ((avatarUrl ?? null) !== (o.avatarUrl ?? null)) return true;
    const dobStr = dob ? toApiDate(dob) : "";
    const origDobStr = o.dob ? toApiDate(o.dob) : "";
    if (dobStr !== origDobStr) return true;
    if (toBirthTimeStr(birthTime) !== toBirthTimeStr(o.birthTime)) return true;
    if (birthPlace.trim() !== o.birthPlace.trim()) return true;
    const sortedCurr = [...interests].sort().join(",");
    const sortedOrig = [...o.interests].sort().join(",");
    if (sortedCurr !== sortedOrig) return true;
    return false;
  })();

  const nameError = nameTouched && !name.trim() ? "Name is required" : null;
  const canSave = isDirty && !nameError && name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await updateProfile({
      name: name.trim(),
      email: email.trim() || undefined,
      dateOfBirth: dob ? toApiDate(dob) : undefined,
      birthTime: birthTime ? toBirthTimeStr(birthTime) : undefined,
      birthPlace: birthPlace.trim() || undefined,
      interests,
      bio: bio.trim(),
      ...(avatarUrl && avatarUrl.startsWith("http") ? { avatarUrl } : {}),
    });
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenHeader
          title="Edit Profile"
          subtitle="Update your details"
          fallbackHref="/(user)/profile"
        />
        <View style={styles.centerFill}>
          <ActivityIndicator color="#9D0399" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Edit Profile"
        subtitle="Update your details"
        fallbackHref="/(user)/profile"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={pickAvatar}
            disabled={avatarUploading}
            activeOpacity={0.8}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={36} color="#9D0399" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="camera" size={13} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap karke photo badlo</Text>

          {/* ── Name ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              onBlur={() => setNameTouched(true)}
              maxLength={255}
              returnKeyType="next"
            />
            {nameError ? (
              <Text style={styles.fieldError}>{nameError}</Text>
            ) : null}
          </View>

          {/* ── Email ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* ── Bio ── */}
          <View style={styles.fieldBlock}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>BIO</Text>
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor="#9CA3AF"
              value={bio}
              onChangeText={setBio}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ── Date of Birth ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={dob ? styles.inputText : styles.inputPlaceholder}>
                {dob
                  ? dob.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Date chuno"}
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
          </View>

          {/* ── Birth Time ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>BIRTH TIME</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={birthTime ? styles.inputText : styles.inputPlaceholder}>
                {birthTime
                  ? birthTime.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Select birth time"}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={birthTime ?? new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, time) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (time) setBirthTime(time);
                }}
              />
            )}
          </View>

          {/* ── Birth Place ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>BIRTH PLACE</Text>
            <TextInput
              style={styles.input}
              placeholder="Birth city, e.g. Mumbai, Maharashtra"
              placeholderTextColor="#9CA3AF"
              value={birthPlace}
              onChangeText={setBirthPlace}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={255}
            />
          </View>

          {/* ── Interests ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>INTERESTS</Text>
            {categoriesLoading ? (
              <ActivityIndicator color="#9D0399" style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.chipsRow}>
                {categories.map((cat) => {
                  const isSelected = interests.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => toggleInterest(cat.id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Sticky Save Button ── */}
        <SafeAreaView style={styles.saveArea} edges={["bottom"]}>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 18,
  },

  // Avatar
  avatarWrapper: {
    alignSelf: "center",
    marginBottom: 4,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3E8FF",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#9D0399",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F9F5FF",
  },
  avatarHint: {
    alignSelf: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },

  // Fields
  fieldBlock: { gap: 6 },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B1D5B",
    letterSpacing: 0.6,
  },
  fieldError: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 2,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Inputs
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1,
    borderColor: "#EDE0F5",
    minHeight: 48,
    justifyContent: "center",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  inputText: { fontSize: 15, color: "#1A1A2E" },
  inputPlaceholder: { fontSize: 15, color: "#9CA3AF" },
  bioInput: { minHeight: 96, paddingTop: 13 },

  // Interest chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: "#EDE0F5",
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#9D0399",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#9D0399", fontWeight: "700" },

  // Save button (sticky)
  saveArea: {
    backgroundColor: "#F9F5FF",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDE0F5",
  },
  saveBtn: {
    backgroundColor: "#9D0399",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#9D0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});