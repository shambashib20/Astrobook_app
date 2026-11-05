import { AstroColors, AstroRadius } from "@/constants/astro-theme";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

// Instagram-style bottom sheet — Modal nahi, screen ke upar absolute overlay
// (is wajah se gesture-root / Android window ke jhanjhat nahi).
//
// - Handle (aur title) ko neeche kheencho → band. Content ka scroll alag rehta hai.
// - Backdrop pe tap / Android back → band.
// - Status bar / notch: sheet kabhi safe-area ke upar nahi jaati (top inset).
// - Keyboard: phones keyboard ki position alag-alag (aur kabhi galat) report karte
//   hain, isliye hum naapte NAHI. Keyboard khulte hi sheet poori (safe-area ke
//   neeche se) khul jaati hai, aur children ko `kb.height` milti hai taaki list
//   neeche kaafi padding rakhe. Input ko sheet ke UPAR rakho — tab wo kisi bhi
//   phone pe keyboard ke peeche nahi ja sakta.
//
// Parent isko screen ke root View ke LAST child ki tarah render kare.
export type SheetKeyboard = { open: boolean; height: number };

export default function AppBottomSheet({
  visible,
  onClose,
  title,
  heightRatio = 0.72,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Screen height ka kitna hissa (0–1) */
  heightRatio?: number;
  /** Function do to keyboard ki state milegi (list ke bottom padding ke liye) */
  children: ReactNode | ((kb: SheetKeyboard) => ReactNode);
}) {
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(windowH * heightRatio);

  const [kb, setKb] = useState<SheetKeyboard>({ open: false, height: 0 });
  const [rootH, setRootH] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKb({ open: true, height: Math.round(e.endCoordinates.height) }),
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setKb({ open: false, height: 0 }),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(windowH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(sheetH);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetH,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Android back button sheet band kare, screen nahi
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          translateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 0.8) {
            onCloseRef.current();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 12,
            }).start();
          }
        },
      }),
    [translateY],
  );

  if (!mounted) return null;

  // Keyboard khula ho to sheet poori (status bar/camera ke neeche se), warna
  // normal height. Height seedha set (percent maxHeight native pe bharosemand nahi).
  const topGap = insets.top + 8;
  const maxH = rootH > 0 ? rootH - topGap : sheetH;
  const finalH = Math.max(220, kb.open ? maxH : Math.min(sheetH, maxH));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(e) => setRootH(e.nativeEvent.layout.height)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: backdrop },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
      </Animated.View>

      <View
        style={[styles.kav, { paddingTop: topGap }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { height: finalH, transform: [{ translateY }] },
          ]}
        >
          <View {...pan.panHandlers} style={styles.grabArea}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>
          <View style={styles.body}>
            {typeof children === "function" ? children(kb) : children}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: AstroColors.scrim },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: AstroColors.surface,
    borderTopLeftRadius: AstroRadius.xl + 4,
    borderTopRightRadius: AstroRadius.xl + 4,
    overflow: "hidden",
  },
  grabArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AstroColors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AstroColors.border,
  },
  title: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: AstroColors.ink,
  },
  body: { flex: 1 },
});
