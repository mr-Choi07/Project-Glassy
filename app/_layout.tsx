import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GlassyThemeProvider, useTheme } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

function SplashOverlay({ bg, primary, isDark }: { bg: string; primary: string; isDark: boolean }) {
  const fade   = useRef(new Animated.Value(0)).current;
  const wave   = useRef(new Animated.Value(0)).current;
  const dot1   = useRef(new Animated.Value(0.3)).current;
  const dot2   = useRef(new Animated.Value(0.3)).current;
  const dot3   = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(wave, { toValue:  8, duration: 700, useNativeDriver: true }),
        Animated.timing(wave, { toValue:  0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    const dotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      ).start();
    dotAnim(dot1, 0);
    dotAnim(dot2, 200);
    dotAnim(dot3, 400);
  }, []);

  const borderColor = isDark ? "rgba(14,165,233,0.25)" : "rgba(2,132,199,0.2)";
  const subtleText  = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";

  return (
    <Animated.View style={[styles.splash, { backgroundColor: bg, opacity: fade }]} pointerEvents="none">
      <Animated.Text style={[styles.splashWave, { transform: [{ translateY: wave }] }]}>🌊</Animated.Text>
      <Text style={[styles.splashTitle, { color: primary }]}>Glassy</Text>
      <Text style={[styles.splashSub, { color: subtleText }]}>서퍼를 위한 스마트 가이드</Text>
      <View style={[styles.splashCard, { borderColor }]}>
        <Text style={[styles.splashCardText, { color: subtleText }]}>파도 데이터 불러오는 중</Text>
        <View style={styles.splashDots}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.splashDot, { backgroundColor: primary, opacity: d }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

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
      {showOverlay && <SplashOverlay bg={C.bg} primary={C.primary} isDark={isDark} />}
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
  splash:         { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: "center", alignItems: "center", gap: 8 },
  splashWave:     { fontSize: 56, marginBottom: 4 },
  splashTitle:    { fontSize: 42, fontWeight: "900", letterSpacing: -1 },
  splashSub:      { fontSize: 14, fontWeight: "500", marginBottom: 32 },
  splashCard:     { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  splashCardText: { fontSize: 13, fontWeight: "600" },
  splashDots:     { flexDirection: "row", gap: 5 },
  splashDot:      { width: 6, height: 6, borderRadius: 3 },
});
