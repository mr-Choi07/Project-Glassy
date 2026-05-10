// Metro resolves @firebase/auth to dist/rn/index.js (React Native build) via the
// "react-native" field in @firebase/auth/package.json. That build exports
// getReactNativePersistence, but TypeScript uses the browser types which don't.
// This augments both entry points so tsc doesn't error.
import { Persistence } from "firebase/auth";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: AsyncStorageLike): Persistence;
}

declare module "@firebase/auth" {
  export function getReactNativePersistence(storage: AsyncStorageLike): Persistence;
}
