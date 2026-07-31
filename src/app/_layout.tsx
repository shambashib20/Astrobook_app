import { useAuthStore } from "@/features/auth/store/auth.store";
import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Native splash (Astrobook logo, navy background) ko turant auto-hide nahi
// hone dena — Instagram/FB jaisa seedha "logo → app" transition chahiye,
// beech mein koi spinner screen nahi dikhni chahiye. Yeh call module-load
// pe hi hona chahiye (component render se pehle), warna race ho sakta hai.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash pehle se hi hidden ho sakta hai (fast-refresh, etc.) — safe to ignore
});

export default function RootLayout() {
  const router = useRouter();
  const { restoreSession, user } = useAuthStore();
  // Apna khud ka gate — store ka `isLoading` restoreSession() ke ANDAR hi
  // false ho jaata hai, router.replace() call hone SE PEHLE. Isse ek race
  // banta tha: Slot turant render ho jaata (stale default route ke saath,
  // jaise index.tsx) jabki naya route abhi commit ho hi raha hota — result:
  // purani (user) tabs screen background mein reh jaati aur login card
  // upar overlay dikhta (tab bar peek-through bug). Ab redirect ke BAAD
  // hi Slot render karte hain.
  const [ready, setReady] = useState(false);

  // Sirf logged-in user ke liye register karo — logged-out state mein
  // backend call 401 dega (harmless, catch ho jaata hai), lekin gate laga
  // dena zyada saaf hai
  usePushNotifications(ready && !!user);

  useEffect(() => {
    const init = async () => {
      const restored = await restoreSession();
      if (!restored) {
        router.replace("/(auth)/login" as any);
      } else {
        // User ho ya astrologer — dono hamesha feed pe hi land karte hain.
        // Astrologer apni profile se explicitly Dashboard pe navigate karta hai.
        router.replace("/(user)/feed" as any);
      }
      setReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    // Redirect commit ho chuka — ab native splash hatao, seedha destination
    // screen dikhega (spinner wala phase kabhi visible hi nahi hota).
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Init chal raha hai ya redirect abhi commit nahi hua — kuch mat dikhao
  if (!ready) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: "#121943",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator color="#9d0399" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
