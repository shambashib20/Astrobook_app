import ScreenHeader from "@/components/ScreenHeader";
import { useSubmitAstrologerApplication } from "@/features/astrologer-application/hooks/useAstrologerApplication";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import { Feather } from "@expo/vector-icons";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_VIDEO_DURATION_SEC = 60; // "1 min ka video" — jaisa product mein tay hua
const MAX_VIDEO_SIZE_MB = 60;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Kannada",
  "Malayalam",
  "Odia",
  "Urdu",
] as const;

type MediaSlot = { uri: string; uploadedUrl: string | null };

export default function BecomeAstrologerScreen() {
  const router = useRouter();
  const { categories, fetchCategories } = useCategories();
  const { uploadImage, uploading } = useImageKitUpload();
  const { submit, loading: submitting } = useSubmitAstrologerApplication(() => {
    Alert.alert(
      "Application Submitted",
      "Humne tumhari application receive kar li hai. Team review karke jald update degi.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  });

  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  const [video, setVideo] = useState<MediaSlot | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [document1, setDocument1] = useState<MediaSlot | null>(null);
  const [document2, setDocument2] = useState<MediaSlot | null>(null);
  const [pickingVideo, setPickingVideo] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleFromList = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
    } else {
      setList([...list, value]);
    }
  };

  // ── 1-min intro video ──────────────────────────────────────────────────────
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true, // trim karne ke liye — max duration enforce karne mein madad
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPickingVideo(true);
    try {
      const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        Alert.alert(
          "Video Bahut Lambi Hai",
          `Max ${MAX_VIDEO_DURATION_SEC} second ki video allowed hai — thodi chhoti chuno.`,
        );
        return;
      }

      let sizeBytes = (asset as any).fileSize ?? (asset as any).filesize;
      if (!sizeBytes) {
        const info = await FileSystemLegacy.getInfoAsync(asset.uri, { size: true } as any);
        sizeBytes = (info as any).size ?? 0;
      }
      if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          "Video Bahut Badi Hai",
          `Max ${MAX_VIDEO_SIZE_MB}MB tak ki video allowed hai.`,
        );
        return;
      }

      setVideo({ uri: asset.uri, uploadedUrl: null });
      setVideoDuration(durationSec);
    } finally {
      setPickingVideo(false);
    }
  };

  // ── Documents (ID proof / certificate — photo) ────────────────────────────
  const pickDocument = async (which: 1 | 2) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const slot = { uri: result.assets[0].uri, uploadedUrl: null };
    if (which === 1) setDocument1(slot);
    else setDocument2(slot);
  };

  const canSubmit =
    bio.trim().length >= 20 &&
    experience.trim().length > 0 &&
    selectedLanguages.length > 0 &&
    selectedSpecs.length > 0 &&
    !!video &&
    !!document1 &&
    !!document2;

  const busy = uploading || submitting || pickingVideo;

  const handleSubmit = async () => {
    if (bio.trim().length < 20) {
      Alert.alert("Bio chhoti hai", "Kam se kam 20 characters likho apne baare mein");
      return;
    }
    const experienceNum = parseInt(experience, 10);
    if (isNaN(experienceNum) || experienceNum < 0) {
      Alert.alert("Experience galat hai", "Saal mein number daalo (jaise 3)");
      return;
    }
    if (selectedLanguages.length === 0) {
      Alert.alert("Language chuno", "Kam se kam ek language select karo");
      return;
    }
    if (selectedSpecs.length === 0) {
      Alert.alert("Specialization chuno", "Kam se kam ek specialization select karo");
      return;
    }
    if (!video || !document1 || !document2) {
      Alert.alert("Kuch missing hai", "Video aur dono documents zaroori hain");
      return;
    }

    // Sab kuch ek saath upload karo — koi bhi fail ho toh submit mat karo
    const [videoUrl, document1Url, document2Url] = await Promise.all([
      uploadImage(
        video.uri,
        `intro-${Date.now()}.mp4`,
        "/astrobook/astrologer-applications",
        "video/mp4",
      ),
      uploadImage(
        document1.uri,
        `doc1-${Date.now()}.jpg`,
        "/astrobook/astrologer-applications",
        "image/jpeg",
      ),
      uploadImage(
        document2.uri,
        `doc2-${Date.now()}.jpg`,
        "/astrobook/astrologer-applications",
        "image/jpeg",
      ),
    ]);

    if (!videoUrl || !document1Url || !document2Url) {
      Alert.alert("Upload Fail", "Kuch upload nahi ho paaya, dobara try karo");
      return;
    }

    await submit({
      bio: bio.trim(),
      experience: experienceNum,
      languages: selectedLanguages,
      specializations: selectedSpecs,
      videoUrl,
      document1Url,
      document2Url,
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Become an Astrologer" fallbackHref="/(user)/(tabs)/profile" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Apne baare mein thodi jaankari do — humari team review karke tumhe astrologer ke
          taur pe verify kar degi.
        </Text>

        {/* Bio */}
        <Text style={styles.fieldLabel}>About You</Text>
        <TextInput
          style={styles.textarea}
          value={bio}
          onChangeText={setBio}
          placeholder="Apna experience, style, aur astrology mein kya khaas hai — likho"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{bio.length}/1000</Text>

        {/* Experience */}
        <Text style={styles.fieldLabel}>Experience (years)</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={(v) => setExperience(v.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 3"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
        />

        {/* Languages */}
        <Text style={styles.fieldLabel}>Languages</Text>
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.chip,
                selectedLanguages.includes(lang) && styles.chipActive,
              ]}
              onPress={() => toggleFromList(selectedLanguages, setSelectedLanguages, lang)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedLanguages.includes(lang) && styles.chipTextActive,
                ]}
              >
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Specializations */}
        <Text style={styles.fieldLabel}>Specializations</Text>
        <View style={styles.chipRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedSpecs.includes(cat.id) && styles.chipActive,
              ]}
              onPress={() => toggleFromList(selectedSpecs, setSelectedSpecs, cat.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedSpecs.includes(cat.id) && styles.chipTextActive,
                ]}
              >
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Video */}
        <Text style={styles.fieldLabel}>Intro Video (max {MAX_VIDEO_DURATION_SEC}s)</Text>
        {video ? (
          <View style={styles.mediaPreviewRow}>
            <View style={styles.videoPreviewBox}>
              <Feather name="video" size={22} color="#9d0399" />
              <Text style={styles.videoDurationText}>{videoDuration}s</Text>
            </View>
            <TouchableOpacity onPress={() => setVideo(null)} style={styles.removeBtn}>
              <Feather name="x" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickBtn} onPress={pickVideo} disabled={busy}>
            {pickingVideo ? (
              <ActivityIndicator color="#9d0399" />
            ) : (
              <>
                <Feather name="video" size={18} color="#9d0399" />
                <Text style={styles.pickBtnText}>Upload Video</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Document 1 */}
        <Text style={styles.fieldLabel}>Document 1 (e.g. ID proof)</Text>
        {document1 ? (
          <View style={styles.mediaPreviewRow}>
            <Image source={{ uri: document1.uri }} style={styles.docThumb} />
            <TouchableOpacity onPress={() => setDocument1(null)} style={styles.removeBtn}>
              <Feather name="x" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickDocument(1)} disabled={busy}>
            <Feather name="file-text" size={18} color="#9d0399" />
            <Text style={styles.pickBtnText}>Upload Document</Text>
          </TouchableOpacity>
        )}

        {/* Document 2 */}
        <Text style={styles.fieldLabel}>Document 2 (e.g. certificate)</Text>
        {document2 ? (
          <View style={styles.mediaPreviewRow}>
            <Image source={{ uri: document2.uri }} style={styles.docThumb} />
            <TouchableOpacity onPress={() => setDocument2(null)} style={styles.removeBtn}>
              <Feather name="x" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickDocument(2)} disabled={busy}>
            <Feather name="file-text" size={18} color="#9d0399" />
            <Text style={styles.pickBtnText}>Upload Document</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || busy) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: { padding: 20, paddingBottom: 60 },
  intro: { fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 19 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
  },
  textarea: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EDE9FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
    minHeight: 110,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    backgroundColor: "#FFF",
  },
  chipActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#FFF" },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
  },
  pickBtnText: { color: "#9d0399", fontWeight: "700", fontSize: 14 },
  mediaPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EDE9FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
  },
  videoDurationText: { fontSize: 13, fontWeight: "600", color: "#9d0399" },
  docThumb: { width: 64, height: 64, borderRadius: 12 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: "#9d0399",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});