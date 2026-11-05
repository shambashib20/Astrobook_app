import UserAvatar from "@/components/UserAvatar";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import ReAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { Post } from "../types/post.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Zoomable Image  (RNGH v2 + Reanimated) ──────────────────────────────────
// GestureHandlerRootView is wrapped by the Modal host so GestureDetector works.
// Supports: pinch-to-zoom (1x–5x), pan when zoomed, double-tap to zoom/reset.
//
// Layout:
//   TOP    — ← arrow + "Post" label (dark gradient, top-safe)
//   BOTTOM — astrologer avatar + name (dark gradient, home-indicator safe)
function ZoomableImage({
  uri,
  post,
  onClose,
}: {
  uri: string;
  post: Post;
  onClose: () => void;
}) {
  const scale        = useSharedValue(1);
  const savedScale   = useSharedValue(1);
  const offsetX      = useSharedValue(0);
  const offsetY      = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  // ── Gestures ──────────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      "worklet";
      scale.value = Math.max(1, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      "worklet";
      if (scale.value < 1.05) {
        scale.value      = withSpring(1,  { damping: 15 });
        savedScale.value = 1;
        offsetX.value    = withSpring(0,  { damping: 15 });
        offsetY.value    = withSpring(0,  { damping: 15 });
        savedOffsetX.value = 0;
        savedOffsetY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (savedScale.value > 1) {
        offsetX.value = savedOffsetX.value + e.translationX;
        offsetY.value = savedOffsetY.value + e.translationY;
      }
    })
    .onEnd(() => {
      "worklet";
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      "worklet";
      if (savedScale.value > 1) {
        scale.value      = withSpring(1,   { damping: 15 });
        savedScale.value = 1;
        offsetX.value    = withSpring(0,   { damping: 15 });
        offsetY.value    = withSpring(0,   { damping: 15 });
        savedOffsetX.value = 0;
        savedOffsetY.value = 0;
      } else {
        scale.value      = withSpring(2.5, { damping: 15 });
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={StyleSheet.absoluteFill}>
        {/* Zoomable image */}
        <ReAnimated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        </ReAnimated.View>

        {/* ── TOP bar — ← arrow + "Post" label ─────────────────────── */}
        <LinearGradient
          colors={["rgba(0,0,0,0.65)", "transparent"]}
          style={styles.imgTopBar}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Wapas jao"
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenLabel}>Post</Text>
        </LinearGradient>

        {/* ── BOTTOM bar — astrologer info ──────────────────────────── */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.82)"]}
          style={styles.imgBottomBar}
          pointerEvents="box-none"
        >
          <View style={styles.astroRow}>
            <UserAvatar
              uri={post.astrologerAvatar}
              name={post.astrologerName}
              id={post.astrologerId}
              size={36}
            />
            <Text style={styles.astroName} numberOfLines={1}>
              {post.astrologerName ?? "Astrologer"}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </GestureDetector>
  );
}

// ─── Reels-style Fullscreen Video ─────────────────────────────────────────────
// Layout:
//   TOP    — ← arrow + "Reel" label (dark gradient, status-bar safe)
//   BOTTOM — astrologer + progress bar + duration + mute (dark gradient)
function FullscreenVideo({
  post,
  onClose,
}: {
  post: Post;
  onClose: () => void;
}) {
  const uri = post.mediaUrl!;
  const [paused, setPaused] = useState(false);
  const [muted,  setMuted]  = useState(false);
  // player.currentTime and player.duration are plain JS properties — NOT reactive.
  // useEvent("timeUpdate") is unreliable on many Android devices.
  // Solution: poll both every 250 ms — simple, reliable, negligible overhead.
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(uri, (p) => {
    p.loop  = true;
    p.muted = false;
  });

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  // Single interval for both currentTime + duration
  useEffect(() => {
    const timer = setInterval(() => {
      const ct = player.currentTime;
      const d  = player.duration;
      if (isFinite(ct)) setCurrentTime(ct);
      if (d > 0 && isFinite(d)) setDuration(d);
    }, 250);
    return () => clearInterval(timer);
  }, [player]);

  useEffect(() => {
    player.play();
    return () => {
      try { player.pause(); } catch (_) { /* already released */ }
    };
  }, [player]);

  useEffect(() => { player.muted = muted; }, [muted, player]);

  useEffect(() => {
    if (paused) player.pause();
    else        player.play();
  }, [paused, player]);

  const flashIcon = () => {
    pauseIconOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(pauseIconOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(pauseIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.videoRoot}>
      {/* Video layer */}
      <TouchableWithoutFeedback
        onPress={() => {
          setPaused((p) => !p);
          flashIcon();
        }}
      >
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Pause / play flash icon */}
      <Animated.View
        style={[styles.pauseOverlay, { opacity: pauseIconOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.pauseIconBg}>
          <Feather name={paused ? "play" : "pause"} size={32} color="#fff" />
        </View>
      </Animated.View>

      {/* ── TOP bar — ← arrow + "Reel" label ──────────────────────── */}
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "transparent"]}
        style={styles.videoTopBar}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Wapas jao"
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenLabel}>Reel</Text>
      </LinearGradient>

      {/* ── BOTTOM bar — astrologer + progress + duration + mute ─── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.88)"]}
        style={styles.videoBottomBar}
        pointerEvents="box-none"
      >
        {/* Astrologer row */}
        <View style={styles.astroRow}>
          <UserAvatar
            uri={post.astrologerAvatar}
            name={post.astrologerName}
            id={post.astrologerId}
            size={36}
          />
          <Text style={styles.astroName} numberOfLines={1}>
            {post.astrologerName ?? "Astrologer"}
          </Text>
        </View>

        {/* Progress track */}
        <View style={styles.progressTrack} pointerEvents="none">
          <View
            style={[
              styles.progressFill,
              { width: `${(progress * 100).toFixed(2)}%` as `${number}%` },
            ]}
          />
        </View>

        {/* Duration + mute row */}
        <View style={styles.durationRow}>
          <Text style={styles.durationText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={() => setMuted((m) => !m)}
            hitSlop={8}
            accessibilityLabel={muted ? "Unmute" : "Mute"}
          >
            <Feather
              name={muted ? "volume-x" : "volume-2"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FullscreenMediaViewer({
  post,
  visible,
  onClose,
}: {
  post: Post;
  visible: boolean;
  onClose: () => void;
}) {
  if (post.mediaType === "TEXT" || !post.mediaUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/*
        GestureHandlerRootView is required here because React Native Modals
        render outside the app's normal view tree, breaking RNGH's gesture
        recognition if the root view is not re-declared inside the Modal.
      */}
      <GestureHandlerRootView style={styles.root}>
        <StatusBar hidden />
        {post.mediaType === "IMAGE" ? (
          <ZoomableImage uri={post.mediaUrl} post={post} onClose={onClose} />
        ) : (
          <FullscreenVideo post={post} onClose={onClose} />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── Video ─────────────────────────────────────────────────────────────────
  videoRoot: {
    flex: 1,
  },

  // Pause / play centre flash
  pauseOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pauseIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Shared top bar (video + image) ────────────────────────────────────────
  // Contains: ← backBtn + screenLabel ("Reel" or "Post")
  videoTopBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 52,         // status-bar safe area
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  imgTopBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 52,         // status-bar safe area
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },

  // Screen title next to back arrow ("Reel" / "Post")
  screenLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
    marginLeft: 10,
  },

  // ── Video bottom bar — astrologer + progress + duration + mute ────────────
  videoBottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingTop: 40,
    paddingBottom: 40,      // home-indicator safe zone
    paddingHorizontal: 16,
    gap: 14,
    zIndex: 20,
  },

  // ── Image bottom bar — astrologer info only ────────────────────────────────
  imgBottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingTop: 40,
    paddingBottom: 40,      // home-indicator safe zone
    paddingHorizontal: 16,
    zIndex: 20,
  },

  // ── Shared ────────────────────────────────────────────────────────────────

  // Back arrow button
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.50)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Astrologer row (shared by image + video)
  astroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  astroName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.1,
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.30)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },

  // Duration row
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  durationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});