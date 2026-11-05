/**
 * RichCaption — do kaam karta hai:
 *
 *  1. "See more / ...more" — agar caption zyada lambi ho aur maxLines diya ho
 *     toh text cut jaata hai aur neeche "...more" button aata hai.
 *     onReadMore diya ho (feed) → navigate to post detail.
 *     onReadMore na diya ho (detail) → inline expand.
 *
 *  2. Clickable links — caption mein https:// ya http:// URL detect karta
 *     hai, underline + brand color se dikhata hai, press pe Linking.openURL.
 *
 * Rendering strategy:
 *   • Collapsed (feed, maxLines set) — nested <Text> approach taaki
 *     numberOfLines kaam kare.
 *   • Expanded / no maxLines (detail screen) — View + flexWrap + TouchableOpacity.
 *     Android pe nested Text.onPress ScrollView ke andar fire nahi hota;
 *     alag TouchableOpacity components 100% reliable hain.
 *
 * SPACING FIX:
 *   style prop (jo paddingHorizontal jaisi layout values rakh sakta hai) ko
 *   wrapper <View> pe apply karo, individual token <Text> pe NAHI —
 *   warna har ek word pe padding lag jaata hai aur huge gaps aate hain.
 *
 * TOKENIZER:
 *    se har word apni trailing whitespace samet ek token banta hai.
 *   Isse spaces alag flex items nahi bante aur natural word-wrap hoti hai.
 */

import { AstroColors, AstroType } from "@/constants/astro-theme";
import { useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

// URL regex — whitespace tak greedy match, phir trailing punctuation trim.
// Pehle wala [^\s.,;!?]+ approach dot ko URL ke ANDAR bhi rok deta tha,
// jis se "https://lonelyphilosopher.in/..." do tukdon mein toot jaata tha.
const URL_REGEX = /https?:\/\/\S+/g;

// Trailing characters jo URL ka hissa nahi hote (sentence-end punctuation)
const TRAILING_PUNCT = /[.,;!?'")\]>]+$/;

type Segment = { type: "text" | "url"; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX);
  while ((match = re.exec(text)) !== null) {
    // Trailing punctuation hatao — domain dots & path slashes safe rehte hain
    const url     = match[0].replace(TRAILING_PUNCT, "");
    const urlEnd  = match.index + url.length;

    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    segments.push({ type: "url", value: url });
    last = urlEnd;
    // regex ko trimmed position se resume karao
    re.lastIndex = urlEnd;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {
    /* ignore — invalid URL ya app nahi mili */
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RichCaption({
  text,
  maxLines,
  onReadMore,
  style,
}: {
  text: string;
  /** Set karoge toh text is many lines ke baad clip hoga + "...more" button aayega */
  maxLines?: number;
  /**
   * Feed mein: post detail pe navigate karo (handlers.onOpenPost).
   * Agar nahi diya aur maxLines set hai → inline expand hoga.
   */
  onReadMore?: () => void;
  style?: TextStyle;
}) {
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const segments = parseSegments(text);
  const hasUrl = segments.some((s) => s.type === "url");

  const shouldCollapse = !!maxLines && !expanded;

  const handleReadMore = () => {
    if (onReadMore) {
      onReadMore();
    } else {
      setExpanded(true);
    }
  };

  const handleLayout = (e: { nativeEvent: { lines: { text: string }[] } }) => {
    if (!maxLines || expanded) return;
    const rendered = e.nativeEvent.lines.reduce(
      (sum, l) => sum + l.text.length,
      0,
    );
    // 3 chars tolerance for RN's "..." ellipsis at the end
    if (rendered < text.length - 3) {
      setTruncated(true);
    }
  };

  const moreButton = truncated && !expanded ? (
    <TouchableOpacity
      onPress={handleReadMore}
      hitSlop={8}
      accessibilityLabel="Show full caption"
    >
      <Text style={styles.more}>...more</Text>
    </TouchableOpacity>
  ) : null;

  // ── COLLAPSED mode (feed) ─────────────────────────────────────────────────
  if (shouldCollapse) {
    return (
      <>
        <Text
          style={[styles.text, style]}
          numberOfLines={maxLines}
          onTextLayout={handleLayout}
        >
          {segments.map((seg, i) =>
            seg.type === "url" ? (
              <Text
                key={i}
                style={styles.link}
                onPress={() => openLink(seg.value)}
                accessibilityRole="link"
              >
                {seg.value}
              </Text>
            ) : (
              <Text key={i}>{seg.value}</Text>
            ),
          )}
        </Text>
        {moreButton}
      </>
    );
  }

  // ── EXPANDED / FULL mode ──────────────────────────────────────────────────
  // Koi URL nahi → plain Text (faster & simpler)
  if (!hasUrl) {
    return (
      <>
        <Text style={[styles.text, style]}>{text}</Text>
        {moreButton}
      </>
    );
  }

  // Tokenize: /\S+\s*/ — har word apni trailing space ke saath ek token.
  // ⚠️  style → wrapper View pe (padding/layout), individual tokens pe NAHI.
  //     Agar paddingHorizontal style mein hai toh har word pe lag jaayega →
  //     text bahut spread ho jaata hai (fixed here).
  type Token = { type: "text" | "url"; value: string };
  const tokens: Token[] = [];
  for (const seg of segments) {
    if (seg.type === "url") {
      tokens.push(seg);
    } else {
      const parts = seg.value.match(/\S+\s*/g) ?? [];
      for (const part of parts) {
        if (part) tokens.push({ type: "text", value: part });
      }
    }
  }

  return (
    <>
      <View style={[styles.textWrap, style as unknown as ViewStyle]}>
        {tokens.map((token, i) =>
          token.type === "url" ? (
            <TouchableOpacity
              key={i}
              onPress={() => openLink(token.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.text, styles.link]}>{token.value}</Text>
            </TouchableOpacity>
          ) : (
            <Text key={i} style={styles.text}>{token.value}</Text>
          ),
        )}
      </View>
      {moreButton}
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    ...AstroType.body,
    color: AstroColors.text,
    lineHeight: 20,
  },
  link: {
    color: AstroColors.brand,
    textDecorationLine: "underline",
  },
  more: {
    ...AstroType.caption,
    color: AstroColors.textSecondary,
    fontWeight: "700",
    marginTop: 2,
  },
  textWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
});