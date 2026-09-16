import Constants from "expo-constants";

// Jab koi env value na mile tab yahi use hoga (EAS builds mein EAS env se aata hai)
const FALLBACK_API_URL = "https://astrobook-backend.onrender.com";

/**
 * EXPO_PUBLIC_API_URL ke do tareeke:
 *   - Poora URL:   https://astrobook-backend.onrender.com
 *   - auto:<port>: auto:9000 → jis laptop pe Metro chal raha hai uska LAN IP
 *                  apne aap uthata hai. Har developer ka IP alag hota hai aur
 *                  WiFi badalne pe badalta hai, isliye local dev ke liye yahi rakho.
 */
function resolveApiUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return FALLBACK_API_URL;

  if (raw.startsWith("auto:")) {
    const port = raw.slice("auto:".length) || "9000";
    // hostUri = "192.168.x.x:8081" — Metro dev server ka address
    const hostUri =
      Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(":")[0];

    if (__DEV__ && host) return `http://${host}:${port}`;

    console.warn(
      "[api] auto mode mein Metro host nahi mila, fallback URL use ho raha hai",
    );
    return FALLBACK_API_URL;
  }

  return raw.replace(/\/+$/, "");
}

export const API_URL = resolveApiUrl();
export const API_BASE_URL = `${API_URL}/api/v1`;