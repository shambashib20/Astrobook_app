import { toast } from "@/components/toast";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import { useCloudinaryVideoUpload } from "@/features/posts/hooks/useCloudinaryVideoUpload";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useSubmitAstrologerApplication } from "./useAstrologerApplication";

export const MAX_VIDEO_SEC = 60;
export const MAX_VIDEO_MB = 60;
export const MIN_BIO = 20;

export const LANGUAGE_OPTIONS = [
  "Hindi", "English", "Bengali", "Tamil", "Telugu", "Marathi",
  "Gujarati", "Punjabi", "Kannada", "Malayalam", "Odia", "Urdu",
] as const;

export type MediaSlot = { uri: string; duration?: number };
export type Step = 1 | 2;

export function useBecomeAstrologerForm() {
  const { categories, loading: catLoading, error: catError, fetchCategories } = useCategories();
  const { uploadImage, uploading: ikUploading, progress: ikProgress } = useImageKitUpload();
  // Video Cloudinary pe jata hai — ImageKit free plan mein video bandwidth quota hoti hai
  const { uploadVideo, uploading: videoUploading, progress: videoProgress } = useCloudinaryVideoUpload();

  const [done, setDone] = useState(false);
  const { submit, loading: submitting } = useSubmitAstrologerApplication(() => setDone(true));

  const [step, setStep] = useState<Step>(1);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [video, setVideo] = useState<MediaSlot | null>(null);
  const [doc1, setDoc1] = useState<MediaSlot | null>(null);
  const [doc2, setDoc2] = useState<MediaSlot | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const [showErrors, setShowErrors] = useState(false);

  const step1Valid =
    bio.trim().length >= MIN_BIO && experience.trim().length > 0 && languages.length > 0 && specs.length > 0;
  const step2Valid = !!video && !!doc1 && !!doc2;

  // Kya kya baaki hai — button disabled karne ki jagah yahi dikhate hain
  const errors1 = {
    bio: bio.trim().length < MIN_BIO ? `Bio must be at least ${MIN_BIO} characters` : undefined,
    experience: experience.trim().length === 0 ? "Enter your experience (enter 0 if you're new)" : undefined,
    languages: languages.length === 0 ? "Select at least one language" : undefined,
    specs: specs.length === 0 ? "Select at least one area of expertise" : undefined,
  };
  const errors2 = {
    video: !video ? "Please upload an intro video" : undefined,
    doc1: !doc1 ? "Please upload your ID proof" : undefined,
    doc2: !doc2 ? "Please upload your certificate" : undefined,
  };

  // "Aage" / "Submit" hamesha dabta hai; kuch baaki ho to batata hai
  const tryNext = () => {
    if (step === 1) {
      if (!step1Valid) {
        setShowErrors(true);
        toast.show(Object.values(errors1).find(Boolean) as string, "error");
        return;
      }
      setShowErrors(false);
      setStep(2);
    } else {
      if (!step2Valid) {
        setShowErrors(true);
        toast.show(Object.values(errors2).find(Boolean) as string, "error");
        return;
      }
      submitAll();
    }
  };

  const uploading = ikUploading || videoUploading;
  const progress = videoUploading ? videoProgress : ikProgress;
  const busy = uploading || submitting || picking;
  const isDirty =
    !!bio || !!experience || languages.length > 0 || specs.length > 0 || !!video || !!doc1 || !!doc2;

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_SEC,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPicking(true);
    try {
      const sec = asset.duration ? Math.round(asset.duration / 1000) : 0;
      if (sec > MAX_VIDEO_SEC) {
        Alert.alert("Video Too Long", `Maximum video length is ${MAX_VIDEO_SEC} seconds — please choose a shorter one.`);
        return;
      }
      let size = (asset as any).fileSize ?? (asset as any).filesize;
      if (!size) {
        const info = await FileSystemLegacy.getInfoAsync(asset.uri, { size: true } as any);
        size = (info as any).size ?? 0;
      }
      if (size > MAX_VIDEO_MB * 1024 * 1024) {
        Alert.alert("Video Too Large", `Maximum file size is ${MAX_VIDEO_MB}MB.`);
        return;
      }
      setVideo({ uri: asset.uri, duration: sec });
    } finally {
      setPicking(false);
    }
  };

  const pickDoc = async (which: 1 | 2) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const slot = { uri: result.assets[0].uri };
    which === 1 ? setDoc1(slot) : setDoc2(slot);
  };

  const submitAll = async () => {
    if (!step1Valid || !step2Valid || !video || !doc1 || !doc2) return;
    const ts = Date.now();
    // Video → Cloudinary (no bandwidth quota limits); docs → ImageKit
    const [videoUrl, document1Url, document2Url] = await Promise.all([
      uploadVideo(video.uri, `intro-${ts}.mp4`),
      uploadImage(doc1.uri, `doc1-${ts}.jpg`, "/astrobook/astrologer-applications", "image/jpeg"),
      uploadImage(doc2.uri, `doc2-${ts}.jpg`, "/astrobook/astrologer-applications", "image/jpeg"),
    ]);
    if (!videoUrl || !document1Url || !document2Url) {
      toast.show("Upload failed — please check your internet and try again", "error");
      return;
    }
    await submit({
      bio: bio.trim(),
      experience: parseInt(experience, 10) || 0,
      languages,
      specializations: specs,
      videoUrl,
      document1Url,
      document2Url,
    });
  };

  return {
    step, setStep: (n: Step) => { setShowErrors(false); setStep(n); },
    bio, setBio,
    experience, setExperience: (v: string) => setExperience(v.replace(/[^0-9]/g, "").slice(0, 2)),
    languages, toggleLanguage: (v: string) => toggle(languages, setLanguages, v),
    specs, toggleSpec: (v: string) => toggle(specs, setSpecs, v),
    categories, catLoading, catError, fetchCategories,
    video, setVideo, doc1, setDoc1, doc2, setDoc2,
    pickVideo, pickDoc,
    step1Valid, step2Valid, busy, picking, uploading, progress, submitting, isDirty,
    submitAll, done, showErrors, errors1, errors2, tryNext,
  };
}
