import {
  AstroColors,
  AstroRadius,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { useUser } from "@/features/auth/store/auth.store";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BG_COLORS,
  MAX_CONTENT,
  MAX_CUSTOM_TAGS,
  MAX_TAGS,
  STICKER_BG_COLORS,
  STICKER_PACKS,
  STICKER_TEXT_COLORS,
  TEXT_COLORS,
} from "../constants";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePostComposer } from "../hooks/usePostComposer";
import type { Post } from "../types/post.types";
import { prettyTag } from "../utils/tags";
import ColorSwatches from "./ColorSwatches";
import PostHero from "./PostHero";

const SIDE = 16;

// Sticker ko drag karne ke liye — position PostHero jaisi hi (anchor + same offset).
function StickerChip({
  size,
  x,
  y,
  text,
  bg,
  fg,
  onMove,
}: {
  size: number;
  x: number;
  y: number;
  text: string;
  bg: string;
  fg: string;
  onMove: (x: number, y: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const latest = useRef({ size, x, y, onMove });
  latest.current = { size, x, y, onMove };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // scroll beech me na churaye
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, g) => {
        const l = latest.current;
        l.onMove(l.x + g.dx / l.size, l.y + g.dy / l.size);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.stickerAnchor,
        { left: x * size, top: y * size, transform: pan.getTranslateTransform() },
      ]}
    >
      <View style={[styles.sticker, { backgroundColor: bg }]}>
        <Text style={[styles.stickerText, { color: fg }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

// `editing` ho to edit mode (parent `key={editing.id}` lagaye taaki state fresh ho)
export default function PostComposer({
  visible,
  onClose,
  editing,
}: {
  visible: boolean;
  onClose: () => void;
  editing?: Post;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const kb = useKeyboardHeight();
  const me = useUser();
  const c = usePostComposer(onClose, editing);
  const { categories, fetchCategories } = useCategories();
  const [activePack, setActivePack] = useState(0);

  useEffect(() => {
    if (visible && categories.length === 0) fetchCategories();
  }, [visible]);

  const size = width - SIDE * 2;
  const isText = c.type === "TEXT";

  // Canvas ko PostHero se hi dikhate hain — feed me bilkul aisa hi dikhega
  const draft = {
    ...(editing ?? {}), // edit me sticker/duration jaise saved fields wahi rahte hain
    id: editing?.id ?? "draft",
    astrologerId: editing?.astrologerId ?? me?.id ?? "me",
    content: isText ? "" : c.content,
    mediaType: c.type,
    mediaUrl: editing ? editing.mediaUrl : c.media?.uri,
    bgColor: c.bgColor,
    textColor: c.textColor,
  } as Post;

  const close = () => {
    if (c.busy) return;
    if (!c.isDirty) return onClose();
    Alert.alert(editing ? "Discard Changes?" : "Discard Post?", "Your unsaved changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          c.reset();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Top bar — Publish hamesha upar, keyboard ke peeche kabhi nahi chhupta */}
        <View style={styles.bar}>
          <TouchableOpacity style={styles.barBtn} onPress={close} accessibilityLabel="Close">
            <Feather name="x" size={22} color={AstroColors.ink} />
          </TouchableOpacity>
          <Text style={styles.barTitle}>{editing ? "Edit Post" : "New Post"}</Text>
          <TouchableOpacity
            disabled={!c.canPublish}
            onPress={c.publish}
            activeOpacity={0.85}
            accessibilityLabel={editing ? "Save" : "Publish"}
          >
            <LinearGradient
              colors={
                c.canPublish
                  ? [AstroColors.brandLight, AstroColors.brandDark]
                  : [AstroColors.offline, AstroColors.offline]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publish}
            >
              {c.busy ? (
                <ActivityIndicator size="small" color={AstroColors.onBrand} />
              ) : (
                <Text style={styles.publishText}>{editing ? "Save" : "Publish"}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {c.uploading ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, c.progress)}%` }]} />
          </View>
        ) : null}

        {/* ── Video compression overlay ── */}
        {c.compressing ? (
          <View style={styles.compressOverlay}>
            <ActivityIndicator size="large" color={AstroColors.onBrand} />
            <Text style={styles.compressTitle}>Video compress ho raha hai…</Text>
            <Text style={styles.compressHint}>720p quality pe optimize kar rahe hain</Text>
            <View style={styles.compressTrack}>
              <View style={[styles.compressFill, { width: `${c.compressProgress}%` }]} />
            </View>
            <Text style={styles.compressPct}>{c.compressProgress}%</Text>
          </View>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: (kb > 0 ? kb : insets.bottom) + 32 },
          ]}
        >
          {/* ── Canvas ── */}
          <View style={[styles.canvas, { width: size, height: size }]}>
            <PostHero post={draft} width={size} aspect={1} flat playing startMuted />

            {isText ? (
              // Wrapper se vertical centre (har platform par same); input content ke hisaab se badhta hai
              <View style={styles.canvasCenter} pointerEvents="box-none">
                <TextInput
                  style={[styles.canvasInput, { color: c.textColor, maxHeight: size - 48 }]}
                  placeholder="Apni baat likho… ✨"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                  scrollEnabled
                  value={c.content}
                  onChangeText={c.setContent}
                  maxLength={MAX_CONTENT}
                  selectionColor={c.textColor}
                />
              </View>
            ) : null}

            {c.type === "IMAGE" && c.stickerOn && c.stickerText.trim() ? (
              <StickerChip
                size={size}
                x={c.stickerPos.x}
                y={c.stickerPos.y}
                text={c.stickerText}
                bg={c.stickerBg}
                fg={c.stickerFg}
                onMove={c.moveSticker}
              />
            ) : null}

            {c.media && !editing ? (
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={c.removeMedia}
                accessibilityLabel="Media hatao"
              >
                <Feather name="x" size={16} color={AstroColors.onBrand} />
              </TouchableOpacity>
            ) : null}
            {c.type === "VIDEO" && (c.media?.duration ?? editing?.durationSeconds) ? (
              <View style={styles.durationBadge}>
                <Feather name="video" size={12} color={AstroColors.onBrand} />
                <Text style={styles.durationText}>
                  {c.media?.duration ?? editing?.durationSeconds}s
                </Text>
              </View>
            ) : null}
          </View>

          {isText ? (
            <Text style={styles.count}>
              {c.content.length}/{MAX_CONTENT}
            </Text>
          ) : null}

          {/* ── Media buttons (sirf jab media nahi hai) ── */}
          {!c.media && !editing ? (
            <View style={styles.mediaRow}>
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => c.pick("image")}
                disabled={c.picking}
              >
                <Feather name="image" size={18} color={AstroColors.brand} />
                <Text style={styles.mediaBtnText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => c.pick("video")}
                disabled={c.picking}
              >
                {c.picking ? (
                  <ActivityIndicator size="small" color={AstroColors.brand} />
                ) : (
                  <Feather name="video" size={18} color={AstroColors.brand} />
                )}
                <Text style={styles.mediaBtnText}>Video</Text>
              </TouchableOpacity>
            </View>
          ) : !isText ? (
            <View style={styles.captionBox}>
              <TextInput
                style={styles.caption}
                placeholder="Caption likho…"
                placeholderTextColor={AstroColors.textMuted}
                multiline
                value={c.content}
                onChangeText={c.setContent}
                maxLength={MAX_CONTENT}
              />
              <Text style={styles.captionCount}>
                {c.content.length}/{MAX_CONTENT}
              </Text>
            </View>
          ) : null}

          {/* ── Text post: colours ── */}
          {isText ? (
            <View style={styles.section}>
              <ColorSwatches
                label="Background"
                colors={BG_COLORS}
                value={c.bgColor}
                onChange={c.setBgColor}
              />
              <ColorSwatches
                label="Text colour"
                colors={TEXT_COLORS}
                value={c.textColor}
                onChange={c.setTextColor}
              />
            </View>
          ) : null}

          {/* ── Image post: text sticker ── */}
          {c.type === "IMAGE" && !editing ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => c.setStickerOn(!c.stickerOn)}
                activeOpacity={0.7}
              >
                <Feather
                  name={c.stickerOn ? "check-square" : "square"}
                  size={20}
                  color={AstroColors.brand}
                />
                <View style={styles.flex}>
                  <Text style={styles.toggleTitle}>Text sticker lagao</Text>
                  <Text style={styles.toggleHint}>Photo par drag karke position karo</Text>
                </View>
              </TouchableOpacity>

              {c.stickerOn ? (
                <>
                  <TextInput
                    style={styles.stickerInput}
                    placeholder="Sticker text likho ya neeche se chuno…"
                    placeholderTextColor={AstroColors.textMuted}
                    value={c.stickerText}
                    onChangeText={c.setStickerText}
                    maxLength={60}
                  />

                  {/* ── Sticker Pack Picker ── */}
                  <View style={styles.packSection}>
                    {/* Pack tab row */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.packTabRow}
                    >
                      {STICKER_PACKS.map((pack, i) => (
                        <TouchableOpacity
                          key={pack.label}
                          onPress={() => setActivePack(i)}
                          style={[styles.packTab, activePack === i && styles.packTabOn]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.packTabText, activePack === i && styles.packTabTextOn]}>
                            {pack.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Sticker grid */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stickerGrid}
                      key={activePack} // grid scroll reset on tab switch
                    >
                      {STICKER_PACKS[activePack]?.stickers.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.stickerChip,
                            c.stickerText === s && styles.stickerChipOn,
                          ]}
                          onPress={() => c.setStickerText(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.stickerChipText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <ColorSwatches
                    label="Sticker background"
                    colors={STICKER_BG_COLORS}
                    value={c.stickerBg}
                    onChange={c.setStickerBg}
                  />
                  <ColorSwatches
                    label="Sticker text"
                    colors={STICKER_TEXT_COLORS}
                    value={c.stickerFg}
                    onChange={c.setStickerFg}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {/* ── Categories ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Categories{" "}
              <Text style={styles.sectionHint}>
                ({c.tags.length}/{MAX_TAGS}) · optional
              </Text>
            </Text>
            <View style={styles.chips}>
              {categories.map((t) => {
                const on = c.tags.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => c.toggleTag(t.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {t.emoji} {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Custom Tags — sirf create mode mein ── */}
          {!editing ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Apne Tags{" "}
                <Text style={styles.sectionHint}>
                  ({c.customTags.length}/{MAX_CUSTOM_TAGS}) · optional
                </Text>
              </Text>
              <Text style={styles.sectionSubHint}>
                #kundli, #vastu jaisa apna tag likho aur Add karo
              </Text>

              {/* Input row */}
              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="add-your-tag"
                  placeholderTextColor={AstroColors.textMuted}
                  value={c.customTagInput}
                  onChangeText={c.setCustomTagInput}
                  onSubmitEditing={c.addCustomTag}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  editable={c.customTags.length < MAX_CUSTOM_TAGS}
                />
                <TouchableOpacity
                  style={[
                    styles.addTagBtn,
                    (!c.customTagInput.trim() || c.customTags.length >= MAX_CUSTOM_TAGS) &&
                      styles.addTagBtnOff,
                  ]}
                  onPress={c.addCustomTag}
                  disabled={!c.customTagInput.trim() || c.customTags.length >= MAX_CUSTOM_TAGS}
                  accessibilityLabel="Add tag"
                >
                  <Feather name="plus" size={16} color={AstroColors.onBrand} />
                </TouchableOpacity>
              </View>

              {/* Added custom tag chips */}
              {c.customTags.length > 0 ? (
                <View style={styles.chips}>
                  {c.customTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.customChip}
                      onPress={() => c.removeCustomTag(tag)}
                      activeOpacity={0.8}
                      accessibilityLabel={`${tag} hatao`}
                    >
                      <Text style={styles.customChipText}>#{prettyTag(tag)}</Text>
                      <Feather name="x" size={12} color={AstroColors.brand} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: AstroColors.canvas },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AstroColors.canvasHeader,
  },
  barBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.brandTint,
  },
  barTitle: { ...AstroType.heading, color: AstroColors.ink },
  publish: {
    minWidth: 96,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: AstroRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  publishText: { ...AstroType.button, color: AstroColors.onBrand },
  progressTrack: { height: 3, backgroundColor: AstroColors.brandTint },
  progressFill: { height: 3, backgroundColor: AstroColors.brand },

  content: { padding: SIDE, gap: 16 },
  canvas: { borderRadius: AstroRadius.xl, overflow: "hidden", alignSelf: "center" },
  canvasCenter: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  canvasInput: {
    paddingHorizontal: 28,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  stickerAnchor: { position: "absolute" },
  // PostHero ke sticker jaisa hi (padding, font, offset) taaki feed me same dikhe
  sticker: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AstroRadius.pill,
    maxWidth: 260,
    transform: [{ translateX: -20 }, { translateY: -14 }],
  },
  stickerText: { fontSize: 14, fontWeight: "700" },
  removeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AstroColors.mediaBadge,
  },
  durationBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.mediaBadge,
  },
  durationText: { ...AstroType.micro, color: AstroColors.onBrand },
  count: {
    ...AstroType.caption,
    color: AstroColors.textMuted,
    textAlign: "right",
    marginTop: -8,
  },

  mediaRow: { flexDirection: "row", gap: 12 },
  mediaBtn: {
    flex: 1,
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    backgroundColor: AstroColors.surface,
  },
  mediaBtnText: { ...AstroType.button, color: AstroColors.brand },

  captionBox: {
    padding: 14,
    borderRadius: AstroRadius.lg,
    backgroundColor: AstroColors.surface,
    borderWidth: 1,
    borderColor: AstroColors.border,
  },
  caption: {
    ...AstroType.body,
    color: AstroColors.text,
    minHeight: 72,
    textAlignVertical: "top",
    padding: 0,
  },
  captionCount: {
    ...AstroType.caption,
    color: AstroColors.textMuted,
    textAlign: "right",
    marginTop: 6,
  },

  section: {
    gap: 14,
    padding: 16,
    borderRadius: AstroRadius.lg,
    backgroundColor: AstroColors.surface,
  },
  sectionTitle: { ...AstroType.heading, color: AstroColors.ink },
  sectionHint: { ...AstroType.caption, color: AstroColors.textSecondary },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleTitle: { ...AstroType.body, fontWeight: "700", color: AstroColors.text },
  toggleHint: { ...AstroType.caption, color: AstroColors.textSecondary, marginTop: 2 },
  stickerInput: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: 14,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.canvas,
    borderWidth: 1,
    borderColor: AstroColors.border,
    ...AstroType.body,
    color: AstroColors.text,
  },

  // Sticker packs
  packSection: { gap: 8 },
  packTabRow: { gap: 6, paddingBottom: 2 },
  packTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AstroRadius.pill,
    borderWidth: 1,
    borderColor: AstroColors.border,
    backgroundColor: AstroColors.canvas,
  },
  packTabOn: {
    backgroundColor: AstroColors.brandTint,
    borderColor: AstroColors.brand,
  },
  packTabText: { fontSize: 12, fontWeight: "600", color: AstroColors.textSecondary },
  packTabTextOn: { color: AstroColors.brand },
  stickerGrid: { gap: 6, paddingVertical: 4 },
  stickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.canvas,
    borderWidth: 1,
    borderColor: AstroColors.border,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  stickerChipOn: {
    backgroundColor: AstroColors.brandTint,
    borderColor: AstroColors.brand,
  },
  stickerChipText: { fontSize: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AstroRadius.pill,
    borderWidth: 1,
    borderColor: AstroColors.border,
    backgroundColor: AstroColors.surface,
  },
  chipOn: { backgroundColor: AstroColors.brand, borderColor: AstroColors.brand },
  chipText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.ink },
  chipTextOn: { color: AstroColors.onBrand },

  // Custom tags
  sectionSubHint: { ...AstroType.micro, color: AstroColors.textMuted, marginTop: -6 },
  customTagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  customTagInput: {
    flex: 1,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 14,
    borderRadius: AstroRadius.md,
    backgroundColor: AstroColors.canvas,
    borderWidth: 1,
    borderColor: AstroColors.border,
    ...AstroType.body,
    color: AstroColors.text,
  },
  addTagBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  addTagBtnOff: { backgroundColor: AstroColors.offline },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
    backgroundColor: AstroColors.brandTint,
  },
  customChipText: { ...AstroType.caption, fontWeight: "700", color: AstroColors.brand },

  // Compression overlay — poore screen ke upar full modal jaisa
  compressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,0,20,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 999,
    padding: 32,
  },
  compressTitle: { ...AstroType.heading, color: AstroColors.onBrand, textAlign: "center" },
  compressHint: { ...AstroType.caption, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  compressTrack: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  compressFill: { height: 4, borderRadius: 2, backgroundColor: AstroColors.brand },
  compressPct: { ...AstroType.caption, color: AstroColors.onBrand, fontWeight: "700" },
});