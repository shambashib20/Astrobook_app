import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ─── Token Storage — tokens sirf yahin se padhe/likhe jaate hain ─────────────
// Android/iOS pe SecureStore (Keystore/Keychain se encrypted). Web pe
// SecureStore available nahi hai, wahan AsyncStorage fallback.

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

const useSecureStore = Platform.OS !== "web";

async function getItem(key: string): Promise<string | null> {
  return useSecureStore
    ? SecureStore.getItemAsync(key)
    : AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (useSecureStore) await SecureStore.setItemAsync(key, value);
  else await AsyncStorage.setItem(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (useSecureStore) await SecureStore.deleteItemAsync(key);
  else await AsyncStorage.removeItem(key);
}

// Purane builds tokens AsyncStorage mein rakhte the. Pehli baar padhte waqt
// unhe SecureStore mein shift karo, taaki update ke baad users logout na hon.
let migration: Promise<void> | null = null;

function migrateFromAsyncStorage(): Promise<void> {
  if (!useSecureStore) return Promise.resolve();

  if (!migration) {
    migration = (async () => {
      try {
        const [[, legacyAccess], [, legacyRefresh]] =
          await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
        if (!legacyAccess && !legacyRefresh) return;

        const alreadySecure = await SecureStore.getItemAsync(REFRESH_KEY);
        if (!alreadySecure && legacyRefresh) {
          await SecureStore.setItemAsync(REFRESH_KEY, legacyRefresh);
          if (legacyAccess) {
            await SecureStore.setItemAsync(ACCESS_KEY, legacyAccess);
          }
        }
        await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
      } catch (err) {
        console.warn("[tokenStorage] AsyncStorage se migration fail hua:", err);
        migration = null; // agli baar dobara try hoga
      }
    })();
  }
  return migration;
}

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    await migrateFromAsyncStorage();
    return getItem(ACCESS_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    await migrateFromAsyncStorage();
    return getItem(REFRESH_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await migrateFromAsyncStorage();
    await Promise.all([
      setItem(ACCESS_KEY, accessToken),
      setItem(REFRESH_KEY, refreshToken),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_KEY), deleteItem(REFRESH_KEY)]);
  },
};