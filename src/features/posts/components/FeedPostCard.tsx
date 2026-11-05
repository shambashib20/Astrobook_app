import UserAvatar from "@/components/UserAvatar";
import { AstroColors, AstroRadius, AstroType } from "@/constants/astro-theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import type { Post } from "../types/post.types";
import { prettyTag } from "../utils/tags";
import { formatPostDate } from "../utils/time";
import PostActionsBar from "./PostActionsBar";
import PostHero from "./PostHero";
import RichCaption from "./RichCaption";

const DOUBLE_TAP_MS = 280;
const SIDE = 12;

export type FeedCardHandlers = {
  onLike: (post: Post) => void;
  onFollow: (post: Post) => void;
  onOpenPost: (post: Post) => void;
  onOpenAuthor: (post: Post) => void;
  onBook: (post: Post) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  onTag: (tag: string) => void;
};

// Feed ka ek post — detail screen jaisa hi look (PostHero + PostActionsBar),
// card me. Media pe double-tap = like, single tap = post kholo.
// memo: handlers screen se STABLE aate hain, isliye sirf badla hua post re-render hota hai.
function FeedPostCardImpl({
  post,
  isActive,
  isMine,
  handlers,
}: {
  post: Post;
  /** Video tabhi chale jab ye card screen pe ho */
  isActive: boolean;
  isMine: boolean;
  handlers: FeedCardHandlers;
}) {
  const { width } = useWindowDimensions();
  const heroW = width; // full screen width

  // ── double-tap like ──
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popScale = useRef(new Animated.Value(0.4)).current;
  const popOpacity = useRef(new Animated.Value(0)).current;

  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  const playPop = () => {
    popScale.setValue(0.4);
    popOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(popScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 140,
        friction: 7,
      }),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(popOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const onMediaPress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (!post.isLikedByMe) handlers.onLike(post);
      playPop();
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(
      () => handlers.onOpenPost(post),
      DOUBLE_TAP_MS,
    );
  };

  return (
    <View style={styles.card}>
      {/* Author */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.author}
          activeOpacity={0.8}
          onPress={() => handlers.onOpenAuthor(post)}
        >
          <UserAvatar
            uri={post.astrologerAvatar}
            name={post.astrologerName}
            id={post.astrologerId}
            size={40}
          />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {post.astrologerName ?? "Astrologer"}
            </Text>
            <Text style={styles.date}>{formatPostDate(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {!isMine && (
          <TouchableOpacity
            style={[styles.follow, post.isFollowedByMe && styles.followOn]}
            hitSlop={8}
            onPress={() => handlers.onFollow(post)}
            accessibilityLabel={post.isFollowedByMe ? "Unfollow" : "Follow"}
          >
            <Text
              style={[
                styles.followText,
                post.isFollowedByMe && styles.followTextOn,
              ]}
            >
              {post.isFollowedByMe ? "Following" : "Follow +"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media — saare post types ek Pressable mein:
          single tap = post detail, double tap = like.
          Video ke liye tapToMute=false — mute sirf badge se hoga. */}
      <Pressable onPress={onMediaPress} accessibilityLabel="Post kholo">
        <PostHero
          post={post}
          width={heroW}
          aspect={1}
          flat
          square
          playing={isActive}
          startMuted
          tapToMute={false}
        />
        <View pointerEvents="none" style={styles.popWrap}>
          <Animated.View
            style={{ opacity: popOpacity, transform: [{ scale: popScale }] }}
          >
            <MaterialCommunityIcons
              name="heart"
              size={88}
              color={AstroColors.onBrand}
              style={styles.popHeart}
            />
          </Animated.View>
        </View>
      </Pressable>

      {post.mediaType !== "TEXT" && post.content ? (
        <View style={styles.captionWrap}>
          <RichCaption
            text={post.content}
            maxLines={2}
            onReadMore={() => handlers.onOpenPost(post)}
          />
        </View>
      ) : null}

      {post.tags?.length ? (
        <View style={styles.tags}>
          {post.tags.slice(0, 2).map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tag}
              onPress={() => handlers.onTag(t)}
              hitSlop={6}
            >
              <Text style={styles.tagText}>#{prettyTag(t)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <PostActionsBar
        post={post}
        style={styles.actions}
        onLike={() => handlers.onLike(post)}
        onComment={() => handlers.onComment(post)}
        onShare={() => handlers.onShare(post)}
        onBook={() => handlers.onBook(post)}
      />
    </View>
  );
}

export default memo(FeedPostCardImpl);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Instagram jaisa: card nahi, full-width post, upar-neeche halka gap
  card: {
    backgroundColor: AstroColors.surface,
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SIDE,
    marginBottom: 10,
  },
  author: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { ...AstroType.heading, color: AstroColors.ink },
  date: { ...AstroType.micro, color: AstroColors.textMuted, marginTop: 1 },

  follow: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: AstroRadius.pill,
    borderWidth: 1.5,
    borderColor: AstroColors.brand,
  },
  followOn: {
    backgroundColor: AstroColors.brandTint,
    borderColor: AstroColors.brandTint,
  },
  followText: {
    ...AstroType.caption,
    fontWeight: "800",
    color: AstroColors.brand,
  },
  followTextOn: { color: AstroColors.brandDark },

  popWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  popHeart: {
    textShadowColor: AstroColors.mediaBadge,
    textShadowRadius: 12,
  },

  captionWrap: {
    marginTop: 12,
    paddingHorizontal: SIDE,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: SIDE,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brandTint,
  },
  tagText: { ...AstroType.micro, color: AstroColors.brand },

  actions: { paddingHorizontal: SIDE, paddingTop: 12 },
});
