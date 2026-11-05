import { queryKeys } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";
import { Video as VideoCompressor } from "react-native-compressor";
import {
  BG_COLORS,
  MAX_CUSTOM_TAGS,
  MAX_TAGS,
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEO_SIZE_MB,
  STICKER_BG_COLORS,
  STICKER_TEXT_COLORS,
  TEXT_COLORS,
} from "../constants";
import { postsService } from "../services/posts.service";
import type { MediaType, Post } from "../types/post.types";
import { useInvalidatePosts } from "./useMyPosts";
import { useCreatePost, useImageKitUpload } from "./usePosts";

const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

type Media = { uri: string; type: Exclude<MediaType, "TEXT">; duration?: number };

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// Free-text tag sanitize: lowercase, spaces→dash, only alphanum+hindi+dash, max 30 chars
const sanitizeCustomTag = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9ऀ-ॿ-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

// Post banane ka saara state + logic (UI PostComposer me hai).
// Sticker ki position PostHero ke hisaab se: x,y = chip ka anchor (0..1),
// feed me bilkul isi jagah dikhta hai.
//
// `editing` diya ho to edit mode: media wahi rehta hai, sirf caption,
// categories aur (TEXT post ke) colours badalte hain.
export function usePostComposer(onPublished: () => void, editing?: Post) {
  const [content, setContent] = useState(editing?.content ?? "");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [media, setMedia] = useState<Media | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bgColor, setBgColor] = useState(editing?.bgColor ?? BG_COLORS[0]!);
  const [textColor, setTextColor] = useState(editing?.textColor ?? TEXT_COLORS[0]!);

  const [stickerOn, setStickerOn] = useState(false);
  const [stickerText, setStickerText] = useState("");
  const [stickerBg, setStickerBg] = useState(STICKER_BG_COLORS[0]!);
  const [stickerFg, setStickerFg] = useState(STICKER_TEXT_COLORS[0]!);
  const [stickerPos, setStickerPos] = useState({ x: 0.35, y: 0.45 });

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  // Video compression progress (0–100)
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);

  const { uploadImage, uploading, progress } = useImageKitUpload();
  const { createPost, loading: posting } = useCreatePost();
  const invalidate = useInvalidatePosts();
  const qc = useQueryClient();

  const type: MediaType = editing ? editing.mediaType : (media?.type ?? "TEXT");
  const busy = uploading || posting || saving || compressing;
  const sameTags =
    tags.length === (editing?.tags ?? []).length &&
    tags.every((t) => editing?.tags?.includes(t));
  const isDirty = editing
    ? content !== editing.content ||
      !sameTags ||
      (type === "TEXT" &&
        (bgColor !== (editing.bgColor ?? BG_COLORS[0]) ||
          textColor !== (editing.textColor ?? TEXT_COLORS[0])))
    : content.trim().length > 0 || !!media || tags.length > 0;
  const canPublish =
    content.trim().length > 0 && !busy && !picking && (editing ? isDirty : true);

  const reset = () => {
    setContent("");
    setTags([]);
    setCustomTags([]);
    setCustomTagInput("");
    setMedia(null);
    setStickerOn(false);
    setStickerText("");
    setStickerPos({ x: 0.35, y: 0.45 });
  };

  const addCustomTag = () => {
    const tag = sanitizeCustomTag(customTagInput);
    if (!tag) return;
    if (customTags.includes(tag) || tags.includes(tag)) {
      setCustomTagInput("");
      return;
    }
    if (customTags.length >= MAX_CUSTOM_TAGS) {
      Alert.alert("Limit", `Max ${MAX_CUSTOM_TAGS} custom tags add kar sakte ho`);
      return;
    }
    setCustomTags((prev) => [...prev, tag]);
    setCustomTagInput("");
  };

  const removeCustomTag = (tag: string) =>
    setCustomTags((prev) => prev.filter((t) => t !== tag));

  const toggleTag = (id: string) =>
    setTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= MAX_TAGS) {
        Alert.alert("Limit", `Max ${MAX_TAGS} categories select kar sakte ho`);
        return prev;
      }
      return [...prev, id];
    });

  // Photo = feed jaisa square crop, Video = duration check → compress (720p/2Mbps) → size check
  const pick = async (kind: "image" | "video") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [kind === "image" ? "images" : "videos"],
      allowsEditing: true,
      aspect: [1, 1],
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    if (kind === "image") {
      setMedia({ uri: asset.uri, type: "IMAGE" });
      return;
    }

    // ── VIDEO path ──
    setPicking(true);
    let finalUri = asset.uri;
    try {
      // 1. Duration check
      const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        Alert.alert(
          "Video Bahut Lambi Hai",
          `Max ${MAX_VIDEO_DURATION_SEC / 60} minute ki video allowed hai — thodi chhoti chuno.`,
        );
        return;
      }

      // 2. Compress → 720p, 2 Mbps, H.264
      setPicking(false);
      setCompressing(true);
      setCompressProgress(0);
      try {
        finalUri = await VideoCompressor.compress(
          asset.uri,
          {
            compressionMethod: "manual",
            maxSize: 1280,      // max dimension (720p = 1280px longer side)
            bitrate: 2_000_000, // 2 Mbps — 5 min at this rate ≈ 75 MB
          },
          (progress) => setCompressProgress(Math.round(progress * 100)),
        );
      } catch (compressErr) {
        // Compression fail hone par original use karo, size check karunga abhi bhi
        console.warn("Video compression failed, using original:", compressErr);
        finalUri = asset.uri;
      }

      // 3. Size check (compressed file pe)
      let sizeBytes = 0;
      const info = await FileSystemLegacy.getInfoAsync(finalUri, { size: true } as any);
      sizeBytes = (info as any).size ?? 0;
      if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          "Video Bahut Badi Hai",
          `${MAX_VIDEO_SIZE_MB}MB se badi video upload nahi ho sakti — compress karke try karo.`,
        );
        return;
      }

      setMedia({ uri: finalUri, type: "VIDEO", duration: durationSec });
    } finally {
      setPicking(false);
      setCompressing(false);
      setCompressProgress(0);
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setStickerOn(false);
    setStickerText("");
  };

  const moveSticker = (x: number, y: number) =>
    setStickerPos({ x: clamp(x, 0, 0.7), y: clamp(y, 0, 0.85) });

  const save = async () => {
    if (!editing || !canPublish) return;
    setSaving(true);
    try {
      await postsService.updatePost(editing.id, {
        content,
        tags,
        ...(type === "TEXT" ? { bgColor, textColor } : {}),
      });
      invalidate(editing.id);
      onPublished();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (editing) return save();
    if (!canPublish) return;
    let mediaUrl: string | undefined;
    if (media) {
      const isVideo = media.type === "VIDEO";
      const url = await uploadImage(
        media.uri,
        `post_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
        "/astrobook/posts",
        isVideo ? "video/mp4" : "image/jpeg",
      );
      if (!url) return; // uploadImage khud Alert dikha chuka hai
      mediaUrl = url;
    }

    const allTags = [...tags, ...customTags];

    const stickerPayload =
      media?.type === "IMAGE" && stickerOn && stickerText.trim()
        ? {
            stickerText: stickerText.trim(),
            stickerX: stickerPos.x,
            stickerY: stickerPos.y,
            stickerTextColor: stickerFg,
            stickerBgColor: stickerBg,
          }
        : {};

    const post = await createPost({
      content,
      mediaUrl,
      mediaType: type,
      tags: allTags,
      ...(type === "TEXT" ? { bgColor, textColor } : {}),
      ...(media?.type === "VIDEO" && media.duration
        ? { durationSeconds: media.duration }
        : {}),
      ...stickerPayload,
    });
    if (!post) return; // useCreatePost ne error dikha diya

    // Optimistic: createPost response mein sticker fields hoti hain (INSERT
    // RETURNING *), isko turant feed cache mein prepend karo taaki user ko
    // publish ke baad instantly sticker dikh sake — refetch ka wait na karna pade.
    qc.setQueryData(queryKeys.posts.feed, (old: any) => {
      if (!old) return old;
      const enriched = { ...post, astrologerName: post.astrologerName ?? "Astrologer" };
      return {
        ...old,
        pages: old.pages.map((page: any, i: number) =>
          i === 0
            ? { ...page, posts: [enriched, ...page.posts] }
            : page,
        ),
      };
    });

    invalidate();
    reset();
    onPublished();
  };

  return {
    content, setContent,
    tags, toggleTag,
    customTags, customTagInput, setCustomTagInput, addCustomTag, removeCustomTag,
    media, type, picking, pick, removeMedia,
    bgColor, setBgColor, textColor, setTextColor,
    stickerOn, setStickerOn, stickerText, setStickerText,
    stickerBg, setStickerBg, stickerFg, setStickerFg,
    stickerPos, moveSticker,
    uploading, posting, progress, busy,
    compressing, compressProgress,
    canPublish, isDirty, publish, reset,
  };
}