// ─── Lightweight Toast (no extra native dependency) ───────────────────────
//
// React Native mein Android ka built-in `ToastAndroid` hota hai, lekin iOS pe
// aisa kuch nahi hai — isliye ek chhota cross-platform toast khud bana diya
// (koi naya npm package/native module nahi, pure JS + Animated, Expo Go aur
// dev client dono mein turant chalega, rebuild ki zaroorat nahi).
//
// Usage: kahin bhi (component ke andar ya bahar) `toast.show("message")` call
// karo — `<ToastHost />` (root layout mein mounted, ek hi baar) usse pick
// karke dikha dega. `Alert.alert(...)` ki jagah non-blocking version.

import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";
type Listener = (message: string, type: ToastType) => void;

let listener: Listener | null = null;

export const toast = {
  show(message: string, type: ToastType = "success") {
    listener?.(message, type);
  },
};

const COLORS: Record<ToastType, string> = {
  success: "#16A34A",
  error: "#DC2626",
  info: "#1A1A2E",
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (msg, t) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setMessage(msg);
      setType(t);
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(20);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          () => setVisible(false),
        );
      }, 2200);
    };

    return () => {
      listener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          bottom: insets.bottom + 90, // bottom bars/tab bar ke upar float kare
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Animated.View style={[styles.pill, { borderLeftColor: COLORS[type] }]}>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 999,
  },
  pill: {
    backgroundColor: "#1A1A2E",
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: "100%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: { color: "#FFF", fontSize: 13, fontWeight: "600" },
});