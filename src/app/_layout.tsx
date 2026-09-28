import { ToastHost } from "@/components/toast";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppGate />
        {/* Root ke bahar, ek hi baar mounted — kahin se bhi toast.show() call
            karke non-blocking message dikha sakte hain (Alert.alert() ki
            jagah), poori app ke upar overlay ki tarah render hota hai */}
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppGate() {
  const router = useRouter();
  const { restoreSession } = useAuthStore();
  const [ready, setReady] = useState(false);
  const user = useAuthStore((s) => s.user);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

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
        // restoreSession() ne poora user object (isOnboarded samet) store
        // mein save kar diya hai — session valid hone ka matlab yeh NAHI
        // ki onboarding complete hai. Beech mein app band karne wale users
        // ko yahan wapas onboarding pe bhejna hai, feed pe nahi — warna
        // unka adhoora profile silently feed mein reh jaata (naam/DOB/
        // interests kabhi save hi nahi hue the, kyunki onboarding sirf
        // ek hi final submit call pe save karta hai).
        const freshUser = useAuthStore.getState().user;
        if (freshUser && !freshUser.isOnboarded) {
          router.replace("/(auth)/onboarding" as any);
        } else {
          // User ho ya astrologer — dono hamesha feed pe hi land karte hain.
          // Astrologer apni profile se explicitly Dashboard pe navigate karta hai.
          router.replace("/(user)/feed" as any);
        }
      }
      setReady(true);
    };
    init();
  }, []);

  // Beech mein session expire hua (backend ne refresh token reject kiya) —
  // login pe bhejo. Normal logout apna redirect khud karta hai.
  useEffect(() => {
    if (!ready || !sessionExpired) return;
    useAuthStore.getState().clearSessionExpired();
    router.replace("/(auth)/login" as any);
  }, [ready, sessionExpired]);

  // Init chal raha hai ya redirect abhi commit nahi hua — kuch mat dikhao
  // (SafeAreaProvider ab RootLayout mein top-level pe hai, poori app ko cover karta hai)
  if (!ready) {
    return (
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
    );
  }

  return <Slot />;
}