const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// PROBLEM: Firebase 10 packages have browser/module fields pointing to ESM.
// Metro (React Native) resolves these via the browser field, giving ESM.
// Firebase's internal CJS bundles use require() and get CJS instances.
// Result: @firebase/app and @firebase/component exist as TWO singletons
// (ESM and CJS), so registerAuth/registerFirestore update one registry
// while Provider reads the other → "Component X has not been registered yet".
//
// FIX: Force @firebase/app and @firebase/component to always resolve to their
// CJS entry points. This gives a single shared CJS singleton for the entire
// Firebase component registry, regardless of caller.
// Also force firebase/* sub-packages to CJS so they use the same @firebase/app.

const FORCE_CJS = {
  // Core Firebase singletons — MUST be unified
  "@firebase/app":       path.resolve(__dirname, "node_modules/@firebase/app/dist/index.cjs.js"),
  "@firebase/component": path.resolve(__dirname, "node_modules/@firebase/component/dist/index.cjs.js"),
  // Sub-packages that have browser/ESM as Metro's preferred resolution
  "firebase/app":       path.resolve(__dirname, "node_modules/firebase/app/dist/index.cjs.js"),
  "firebase/auth":      path.resolve(__dirname, "node_modules/firebase/auth/dist/index.cjs.js"),
  "firebase/firestore": path.resolve(__dirname, "node_modules/firebase/firestore/dist/index.cjs.js"),
  "firebase/storage":   path.resolve(__dirname, "node_modules/firebase/storage/dist/index.cjs.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forced = FORCE_CJS[moduleName];
  if (forced) {
    return { type: "sourceFile", filePath: forced };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
