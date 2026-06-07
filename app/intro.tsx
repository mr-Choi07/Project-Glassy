import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// ────────────────────────────────────────────────────────────
// Slide 1 — 실시간 파도 데이터
// ────────────────────────────────────────────────────────────
function WaveChartSlide() {
  const bars = [
    { height: 55, color: Colors.primary },
    { height: 80, color: Colors.accent },
    { height: 45, color: Colors.wave },
    { height: 70, color: Colors.primary },
    { height: 60, color: Colors.primaryDark },
    { height: 90, color: Colors.accent },
    { height: 50, color: Colors.wave },
  ];
  const anims = useRef(bars.map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const barAnims = bars.map((_, i) =>
      Animated.timing(anims[i], {
        toValue: 1,
        duration: 600,
        delay: 300 + i * 80,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      })
    );
    Animated.stagger(80, barAnims).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* 태그 */}
      <View style={styles.tagRow}>
        <View style={styles.liveChip}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.tagLabel}>실시간 해양 데이터</Text>
      </View>

      {/* 타이틀 */}
      <Text style={styles.slideTitle}>{"파도 상태를\n한눈에"}</Text>
      <Text style={styles.slideDesc}>{"바람, 파고, 수온까지\n지금 이 순간의 바다를 보여드려요."}</Text>

      {/* 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>파고 현황 · 양양</Text>
          <View style={styles.goodPill}>
            <Text style={styles.goodText}>GOOD ✦</Text>
          </View>
        </View>

        {/* 애니메이션 바 차트 */}
        <View style={styles.chartRow}>
          {bars.map((bar, i) => (
            <View key={i} style={styles.barWrap}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    backgroundColor: bar.color,
                    height: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, bar.height],
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* 스탯 행 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1.4m</Text>
            <Text style={styles.statLabel}>파고</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12kt</Text>
            <Text style={styles.statLabel}>풍속</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>19°</Text>
            <Text style={styles.statLabel}>수온</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────
// Slide 2 — AI 코치
// ────────────────────────────────────────────────────────────
const AI_MESSAGE = "오늘 양양 파도는 초급자에게 적합해요. 오전 9시가 가장 좋은 타이밍입니다 🤙";

function AiCoachSlide() {
  const [displayedText, setDisplayedText] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.timing(cardAnim, {
      toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    Animated.timing(scoreAnim, {
      toValue: 82, duration: 1200, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(AI_MESSAGE.slice(0, i));
      if (i >= AI_MESSAGE.length) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View style={[styles.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.tagRow}>
        <View style={styles.aiChip}>
          <Text style={styles.aiChipText}>✦ AI</Text>
        </View>
        <Text style={styles.tagLabel}>Glassy AI 코치</Text>
      </View>

      <Text style={styles.slideTitle}>{"AI가 파도를\n분석해드려요"}</Text>
      <Text style={styles.slideDesc}>{"복잡한 데이터 해석은 AI에게 맡기고\n서핑에만 집중하세요."}</Text>

      <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        {/* 스코어 */}
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>오늘의 서핑 지수</Text>
            <Animated.Text style={styles.scoreValue}>
              {scoreAnim.interpolate({ inputRange: [0, 82], outputRange: ["0", "82"] })}
            </Animated.Text>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>😎</Text>
            <Text style={styles.scoreCircleLabel}>GOOD</Text>
          </View>
        </View>

        {/* 타이핑 말풍선 */}
        <View style={styles.bubble}>
          <View style={styles.bubbleAvatar}>
            <Text style={styles.bubbleAvatarText}>G</Text>
          </View>
          <View style={styles.bubbleBody}>
            <Text style={styles.bubbleText}>{displayedText}</Text>
            {displayedText.length < AI_MESSAGE.length && (
              <Text style={styles.cursor}>|</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────
// Slide 3 — 시작하기
// ────────────────────────────────────────────────────────────
function StartSlide() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const staggerAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    Animated.stagger(120, staggerAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 500, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const features = ["📍 전국 서핑 스팟 실시간 정보", "🤖 AI 파도 분석 & 코칭", "📊 나만의 서핑 로그 기록"];

  return (
    <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
      <Animated.Text style={[styles.bigEmoji, { transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }]}>
        🏄
      </Animated.Text>

      <Text style={styles.slideTitle}>{"지금 바로\n파도를 만나요"}</Text>
      <Text style={styles.slideDesc}>{"Glassy와 함께라면\n바다가 더 가까워집니다."}</Text>

      <View style={styles.featureList}>
        {features.map((f, i) => (
          <Animated.View
            key={i}
            style={[
              styles.featureItem,
              {
                opacity: staggerAnims[i],
                transform: [{ translateX: staggerAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              },
            ]}
          >
            <Text style={styles.featureText}>{f}</Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
const SLIDES = [WaveChartSlide, AiCoachSlide, StartSlide];

export default function IntroScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isLast = current === SLIDES.length - 1;

  const goTo = useCallback((next: number) => {
    const dir = next > current ? 1 : -1;
    slideAnim.setValue(dir * SCREEN_W);
    setCurrent(next);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [current, slideAnim]);

  const SlideComponent = SLIDES[current];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 배경 orbs */}
      <View style={styles.orbTR} />
      <View style={styles.orbBL} />
      <View style={styles.orbCenter} />

      <View style={styles.root}>
        {/* 브랜드 */}
        <Text style={styles.brand}>Glassy</Text>

        {/* 슬라이드 영역 */}
        <Animated.View style={[styles.slideWrap, { transform: [{ translateX: slideAnim }] }]}>
          <SlideComponent key={current} />
        </Animated.View>

        {/* 하단 */}
        <View style={styles.bottom}>
          {/* 닷 인디케이터 */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)}>
                <Animated.View style={[styles.dot, i === current && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* 버튼 */}
          <View style={styles.btnRow}>
            {current > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => goTo(current - 1)}>
                <Text style={styles.backBtnText}>←</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, current === 0 && styles.nextBtnFull]}
              onPress={() => isLast ? router.push("/signup") : goTo(current + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>{isLast ? "서핑 시작하기 🤙" : "다음"}</Text>
            </TouchableOpacity>
          </View>

          {isLast && (
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
    position: "absolute", top: -100, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(14,165,233,0.13)",
  },
  orbBL: {
    position: "absolute", bottom: -120, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(6,182,212,0.09)",
  },
  orbCenter: {
    position: "absolute", top: "40%", right: -120,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(14,165,233,0.06)",
  },
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  brand: {
    color: Colors.primary, fontSize: 17, fontWeight: "800",
    letterSpacing: 0.5, marginBottom: 16,
  },

  // 슬라이드
  slideWrap: { flex: 1 },
  slideContent: { flex: 1 },

  tagRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(34,197,94,0.3)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { color: Colors.success, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  aiChip: {
    backgroundColor: "rgba(14,165,233,0.15)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(14,165,233,0.3)",
  },
  aiChipText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  tagLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },

  slideTitle: {
    color: Colors.text, fontSize: 32, lineHeight: 40,
    fontWeight: "800", marginBottom: 10,
  },
  slideDesc: {
    color: Colors.textMuted, fontSize: 15, lineHeight: 23, marginBottom: 20,
  },

  // 카드
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 24,
    padding: 20, borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  cardTitle: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  goodPill: {
    backgroundColor: "rgba(14,165,233,0.15)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(14,165,233,0.25)",
  },
  goodText: { color: Colors.primary, fontSize: 11, fontWeight: "800" },

  // 차트
  chartRow: { height: 90, flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 16 },
  barWrap: { flex: 1, height: 90, justifyContent: "flex-end" },
  bar: { borderRadius: 8, width: "100%" },

  // 스탯
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  // AI 스코어
  scoreRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  scoreLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  scoreValue: { color: Colors.primary, fontSize: 42, fontWeight: "800" },
  scoreCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(14,165,233,0.12)",
    borderWidth: 1, borderColor: "rgba(14,165,233,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  scoreCircleText: { fontSize: 22 },
  scoreCircleLabel: { color: Colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  // 말풍선
  bubble: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: Colors.bgSurface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  bubbleAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  bubbleAvatarText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  bubbleBody: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 22 },
  cursor: { color: Colors.primary, fontSize: 14, fontWeight: "800" },

  // 슬라이드 3
  bigEmoji: { fontSize: 72, textAlign: "center", marginBottom: 24, marginTop: 8 },
  featureList: { gap: 10, marginTop: 4 },
  featureItem: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  featureText: { color: Colors.text, fontSize: 15, fontWeight: "600" },

  // 하단
  bottom: { paddingTop: 16 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bgSurface },
  dotActive: { width: 28, borderRadius: 4, backgroundColor: Colors.primary },
  btnRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  backBtn: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { color: Colors.textMuted, fontSize: 20 },
  nextBtn: {
    flex: 1, height: 54, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  nextBtnFull: { flex: 1 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  loginLink: {
    textAlign: "center", color: Colors.textMuted, fontSize: 14, fontWeight: "500",
  },
});
