import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const SLIDES = [
  {
    title: "서핑 정보를\n더 간편하게",
    description: "실시간 바다 상태와 AI 분석을\n한 화면에서 확인하세요.",
    tag: "실시간 상태",
    emoji: "🌊",
    barHeights: [34, 78, 52, 62, 44],
  },
  {
    title: "필요한 정보만\n빠르게",
    description: "복잡한 설명 없이 핵심 데이터만\n깔끔하게 정리했습니다.",
    tag: "차트 중심",
    emoji: "📊",
    barHeights: [60, 44, 72, 38, 68],
  },
  {
    title: "지금 바로\n시작해보세요",
    description: "Glassy AI 코치가 오늘의 파도를\n분석해드립니다.",
    tag: "AI 코치",
    emoji: "🤙",
    barHeights: [44, 70, 54, 80, 50],
  },
];

const BAR_COLORS = [Colors.bgSurface, Colors.primary, Colors.accent, Colors.wave, Colors.primaryDark];

export default function IntroScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  const nextSlide = () => {
    if (isLastSlide) { router.push("/signup"); return; }
    setCurrentSlide((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (currentSlide === 0) return;
    setCurrentSlide((prev) => prev - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Ambient orbs */}
      <View style={styles.orbTR} />
      <View style={styles.orbBL} />

      <View style={styles.container}>
        {/* Top */}
        <View>
          <Text style={styles.brand}>Glassy</Text>

          <View style={styles.heroCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentSlide + 1} / {SLIDES.length}</Text>
              </View>
              <Text style={styles.miniLabel}>{slide.tag}</Text>
            </View>

            <Text style={styles.emojiHero}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>

            {/* Mini chart preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>파고 현황</Text>
                <View style={styles.liveTag}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <View style={styles.chart}>
                {slide.barHeights.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: BAR_COLORS[i] ?? Colors.bgSurface },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.previewFooter}>
                <View>
                  <Text style={styles.previewValue}>1.2m</Text>
                  <Text style={styles.previewCaption}>현재 파고</Text>
                </View>
                <View style={styles.conditionPill}>
                  <Text style={styles.conditionText}>GOOD ✦</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom controls */}
        <View>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentSlide && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, currentSlide === 0 && styles.disabled]}
              onPress={prevSlide}
              disabled={currentSlide === 0}
            >
              <Text style={styles.secondaryBtnText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextSlide}>
              <Text style={styles.primaryBtnText}>{isLastSlide ? "시작하기 →" : "다음"}</Text>
            </TouchableOpacity>
          </View>

          {isLastSlide && (
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.loginLink}>이미 계정이 있으신가요? 로그인</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  orbTR: {
    position: "absolute", top: -80, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(14,165,233,0.12)",
  },
  orbBL: {
    position: "absolute", bottom: -100, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(6,182,212,0.08)",
  },
  container: {
    flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
    justifyContent: "space-between",
  },
  brand: {
    color: Colors.primary, fontSize: 16, fontWeight: "800",
    letterSpacing: 0.5, marginBottom: 20,
  },
  heroCard: {
    backgroundColor: Colors.bgCard, borderRadius: 28,
    padding: 24, borderWidth: 1, borderColor: Colors.border, minHeight: 380,
  },
  cardTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  badge: {
    backgroundColor: "rgba(14,165,233,0.15)", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(14,165,233,0.25)",
  },
  badgeText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  miniLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  emojiHero: { fontSize: 40, marginBottom: 16 },
  title: {
    color: Colors.text, fontSize: 30, lineHeight: 38,
    fontWeight: "800", marginBottom: 10,
  },
  description: {
    color: Colors.textMuted, fontSize: 15, lineHeight: 23, marginBottom: 22,
  },
  previewCard: {
    backgroundColor: Colors.bgSurface, borderRadius: 20,
    padding: 18, borderWidth: 1, borderColor: Colors.border,
  },
  previewHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  previewTitle: { color: Colors.text, fontSize: 13, fontWeight: "700" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  liveText: { color: Colors.success, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  chart: { height: 80, flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 14 },
  bar: { flex: 1, borderRadius: 8 },
  previewFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  previewValue: {
    color: Colors.text, fontSize: 22, fontWeight: "800", marginBottom: 2,
  },
  previewCaption: { color: Colors.textSubtle, fontSize: 12 },
  conditionPill: {
    backgroundColor: "rgba(14,165,233,0.15)", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(14,165,233,0.25)",
  },
  conditionText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bgSurface },
  dotActive: { width: 24, borderRadius: 4, backgroundColor: Colors.primary },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  secondaryBtn: {
    flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard,
  },
  disabled: { opacity: 0.35 },
  secondaryBtnText: { color: Colors.textMuted, fontSize: 15, fontWeight: "600" },
  primaryBtn: {
    flex: 1.6, height: 54, borderRadius: 16,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  loginLink: {
    textAlign: "center", color: Colors.textMuted, fontSize: 14, fontWeight: "500",
  },
});
