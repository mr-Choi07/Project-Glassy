import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_KEY",
  authDomain: "project-glassy.firebaseapp.com",
  projectId: "project-glassy",
  storageBucket: "project-glassy.firebasestorage.app",
  messagingSenderId: "557420012496",
  appId: "1:557420012496:web:eef31b76324eefb5308fd5",
};

class AsyncStoragePersistence {
  static type = "LOCAL" as const;
  type = "LOCAL" as const;
  async _get(key: string) { return AsyncStorage.getItem(key); }
  async _set(key: string, value: string) { await AsyncStorage.setItem(key, value); }
  async _remove(key: string) { await AsyncStorage.removeItem(key); }
  _addListener(_k: string, _l: unknown) {}
  _removeListener(_k: string, _l: unknown) {}
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: new AsyncStoragePersistence() as any,
});

export default app;
