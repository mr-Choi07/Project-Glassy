import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GlassyThemeProvider, useTheme } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { colors: C, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === "(tabs)";
    const inAuthPages = ["login", "signup", "intro"].includes(segments[0] as string);

    if (!user && inTabs) {
      router.replace("/intro");
      return;
    }
    if (user && inAuthPages) {
      router.replace("/(tabs)");
      return;
    }
    setSettled(true);
  }, [user, loading, segments]);

  // Mark settled once we're on the correct screen after redirect
  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === "(tabs)";
    const inAuthPages = ["login", "signup", "intro"].includes(segments[0] as string);
    if ((user && inTabs) || (!user && inAuthPages) || (!user && !inTabs && !inAuthPages)) {
      setSettled(true);
    }
  }, [segments, user, loading]);

  const showOverlay = loading || !settled;

  return (
    <>
      <Stack>
        <Stack.Screen name="intro" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      {showOverlay && (
        <View style={[styles.loadingOverlay, { backgroundColor: C.bg }]} pointerEvents="none">
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GlassyThemeProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
        </ThemeProvider>
      </AuthProvider>
    </GlassyThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
