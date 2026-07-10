import { usersService } from "@/features/users/services";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Foreground mein bhi notification dikhe (banner + sound) — default Expo
// behavior kabhi-kabhi foreground notifications ko silently drop kar deta hai
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    // Android 8+ silently drop karta hai bina channel ke — koi error bhi nahi deta
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9d0399",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null; // user ne deny kiya — silently skip, feature bina notif ke bhi kaam karega
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("[Push] EAS projectId nahi mila app.json mein");
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data;
  } catch (err) {
    console.warn("[Push] token fetch fail hua:", err);
    return null;
  }
}

// Notification tap karne pe kahan navigate karna hai — data.type ke hisaab se
function getDeepLinkForNotification(data: Record<string, any>): string | null {
  const { type, appointmentId } = data;
  switch (type) {
    case "session_waiting":
    case "session_reminder":
      return appointmentId ? `/(user)/session/${appointmentId}` : null;
    case "booking_confirmed":
      return appointmentId ? `/(user)/booking-confirmation?appointmentId=${appointmentId}` : null;
    case "new_booking":
      return "/(astrologer)/sessions";
    case "booking_cancelled":
    case "payment_failed":
      return "/(user)/my-bookings";
    default:
      return null;
  }
}

export function usePushNotifications(enabled: boolean = true) {
  const router = useRouter();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (registeredRef.current) return;
    registeredRef.current = true;

    registerForPushNotificationsAsync().then((token) => {
      if (!token) return;
      usersService
        .registerPushToken(token, Platform.OS as "ios" | "android")
        .catch((err) => console.warn("[Push] backend registration fail:", err));
    });

    // Tap-to-open — app background/killed dono se aane wale taps handle karta hai
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      const href = getDeepLinkForNotification(data ?? {});
      if (href) router.push(href as any);
    });

    return () => sub.remove();
  }, [enabled]);
}
