import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDES = [
  {
    title: "서핑 정보를 더 간편하게",
    description: "실시간 바다 상태와 차트를 한 화면에서 확인할 수 있어요.",
    tag: "실시간 상태",
    value: "Live",
  },
  {
    title: "필요한 정보만 빠르게",
    description: "복잡한 설명 없이 자주 보는 데이터 중심으로 구성했습니다.",
    tag: "차트 중심",
    value: "Clean",
  },
  {
    title: "바로 시작해보세요",
    description: "회원가입 후 Glassy의 기능을 바로 이용할 수 있습니다.",
    tag: "빠른 시작",
    value: "Ready",
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  const nextSlide = () => {
    if (isLastSlide) {
      router.push("/signup");
      return;
    }

    setCurrentSlide((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (currentSlide === 0) return;
    setCurrentSlide((prev) => prev - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <View style={styles.container}>
        <View>
          <Text style={styles.brand}>Glassy</Text>

          <View style={styles.heroCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {currentSlide + 1} / {SLIDES.length}
                </Text>
              </View>
              <Text style={styles.miniLabel}>{slide.tag}</Text>
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>오늘의 요약</Text>
                <View style={styles.previewDot} />
              </View>
              <View style={styles.previewChart}>
                <View style={[styles.bar, styles.barShort]} />
                <View style={[styles.bar, styles.barTall]} />
                <View style={[styles.bar, styles.barMid]} />
              </View>
              <View style={styles.previewFooter}>
                <View>
                  <Text style={styles.previewValue}>{slide.value}</Text>
                  <Text style={styles.previewCaption}>핵심 상태</Text>
                </View>
                <View style={styles.previewPill}>
                  <Text style={styles.previewPillText}>정리된 화면</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentSlide && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                currentSlide === 0 && styles.disabledButton,
              ]}
              onPress={prevSlide}
              disabled={currentSlide === 0}
            >
              <Text style={styles.secondaryButtonText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={nextSlide}>
              <Text style={styles.primaryButtonText}>
                {isLastSlide ? "시작하기" : "다음"}
              </Text>
            </TouchableOpacity>
          </View>

          {isLastSlide ? (
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.loginLink}>이미 계정이 있으면 로그인</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  backgroundOrbTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#DBEAFE",
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -100,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#E0F2FE",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  brand: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 18,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 360,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  miniLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: 12,
  },
  description: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  previewCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  previewTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  previewChart: {
    height: 88,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
  },
  bar: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#BFDBFE",
  },
  barShort: {
    height: 34,
  },
  barTall: {
    height: 78,
    backgroundColor: "#60A5FA",
  },
  barMid: {
    height: 56,
    backgroundColor: "#93C5FD",
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  previewValue: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  previewCaption: {
    color: "#64748B",
    fontSize: 13,
  },
  previewPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewPillText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    backgroundColor: "#2563EB",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loginLink: {
    marginTop: 16,
    textAlign: "center",
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
