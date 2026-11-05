import UserAvatar from "@/components/UserAvatar";
import {
  AstroColors,
  AstroRadius,
  AstroShadow,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Sheet ke UPAR (title ke neeche) pinned comment box: apna avatar + input + send.
// Upar rakha hai taaki keyboard ki position kuch bhi ho, input kabhi na chhupe.
export default function CommentComposer({
  avatarUri,
  name,
  userId,
  posting,
  autoFocus,
  onSubmit,
}: {
  avatarUri?: string | null;
  name?: string | null;
  userId?: string | null;
  posting: boolean;
  autoFocus?: boolean;
  /** true return kare to input clear hoga */
  onSubmit: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const canSend = text.trim().length > 0 && !posting;

  useEffect(() => {
    if (!autoFocus) return;
    // Sheet ke slide-in ke baad focus, warna keyboard animation atakti hai
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const send = async () => {
    if (!canSend) return;
    const value = text;
    setText("");
    const ok = await onSubmit(value);
    if (!ok) setText(value); // fail hua to likha hua wapas
  };

  return (
    <View style={styles.wrap}>
      <UserAvatar uri={avatarUri} name={name} id={userId} size={34} />
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Write a comment…"
          placeholderTextColor={AstroColors.textMuted}
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={send}
        />
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={send}
        disabled={!canSend}
        accessibilityLabel="Comment bhejo"
      >
        <LinearGradient
          colors={
            canSend
              ? [AstroColors.brandLight, AstroColors.brandDark]
              : [AstroColors.border, AstroColors.border]
          }
          style={[styles.sendBtn, canSend && AstroShadow.soft]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={AstroColors.onBrand} />
          ) : (
            <Feather
              name="send"
              size={16}
              color={canSend ? AstroColors.onBrand : AstroColors.textMuted}
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AstroColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AstroColors.border,
  },
  inputWrap: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    maxHeight: 110,
    justifyContent: "center",
    backgroundColor: AstroColors.canvas,
    borderRadius: AstroRadius.xl,
    borderWidth: 1,
    borderColor: AstroColors.border,
    paddingHorizontal: 14,
  },
  input: {
    ...AstroType.body,
    color: AstroColors.text,
    paddingVertical: 8,
  },
  sendBtn: {
    width: MIN_TOUCH - 4,
    height: MIN_TOUCH - 4,
    borderRadius: (MIN_TOUCH - 4) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
