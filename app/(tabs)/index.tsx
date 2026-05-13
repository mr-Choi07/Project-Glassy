import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { AlertTriangle, LogOut, Waves } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

const KMA_AUTH_KEY = process.env.EXPO_PUBLIC_KMA_AUTH_KEY!;
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

function calcMulttae(date: Date, C: ThemeColors) {
  const ref = new Date("2024-01-11T00:00:00Z").getTime();
  const period = 29.53058867 * 24 * 3600 * 1000;
  let phase = ((date.getTime() - ref) % period) / period;
  if (phase < 0) phase += 1;
  const ld = Math.floor(phase * 29.53) + 1;
  const m = ld === 8 || ld === 23 ? 0 : ld > 8 && ld < 23 ? ld - 8 : ld > 23 ? ld - 23 : ld + 6;
  const label = m === 0 ? "조금" : `${m}물`;
  const desc = m === 0 ? "조류 가장 약함" : m <= 2 ? "약한 조류" : m <= 5 ? "조류 보통" : m <= 8 ? "조류 강함" : "조류 약해짐";
  const color = m === 0 ? C.success : m <= 3 ? C.primary : m <= 6 ? "#EAB308" : "#F97316";
  return { label, desc, color };
}

const SURF_TIPS = [
  "초보는 무릎~허리 파도에서 연습하는 게 최고예요!",
  "패들링은 허리를 살짝 들고 일정한 리듬으로!",
  "파도 방향을 미리 읽고 위치를 선점하세요",
  "임팩트존에서 벗어나 안전한 곳에서 휴식하세요",
  "자외선 차단제는 귀 뒤와 발등까지 꼼꼼히!",
  "팝업은 한 번에 빠르게! 천천히 일어나면 더 어려워요",
  "서핑 전후 충분한 수분 섭취가 중요해요",
];

const ALL_SPOTS = [
  { id: "songjeong", name: "송정",   lat: 35.1786, lon: 129.2075, area: "남해동부앞바다", emoji: "🐚" },
  { id: "haeundae",  name: "해운대", lat: 35.1588, lon: 129.1604, area: "남해동부앞바다", emoji: "🏖️" },
  { id: "dadaepo",   name: "다대포", lat: 35.0476, lon: 128.9610, area: "남해동부앞바다", emoji: "🌊" },
  { id: "gwanganri", name: "광안리", lat: 35.1530, lon: 129.1185, area: "남해동부앞바다", emoji: "🌉" },
] as const;

type Spot = typeof ALL_SPOTS[number];

function getCondition(h: number, C: ThemeColors) {
  if (h < 0.5) return { label: "FLAT",    color: C.textSubtle };
  if (h < 1.0) return { label: "SMALL",   color: C.textMuted };
  if (h < 1.8) return { label: "GOOD ✦",  color: C.primary };
  if (h < 2.5) return { label: "SOLID",   color: C.accent };
  return              { label: "EPIC 🔥", color: C.warning };
}

export default function HomeScreen() {
  const { logout, userProfile, profileReady } = useAuth();
  const router = useRouter();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const activeSpots = useMemo<Spot[]>(() => {
    const ids = userProfile?.selectedSpotIds ?? [];
    if (ids.length === 0) return [];
    return ALL_SPOTS.filter(s => ids.includes(s.id as any));
  }, [userProfile?.selectedSpotIds]);

  const [selectedSpot, setSelectedSpot] = useState<Spot>(ALL_SPOTS[0]);
  const [spotInitialized, setSpotInitialized] = useState(false);
  const [surfBriefing, setSurfBriefing]     = useState("");
  const [waveHeight, setWaveHeight]         = useState<number | null>(null);
  const [wavePeriod, setWavePeriod]         = useState<number | null>(null);
  const [warningStatus, setWarningStatus]   = useState("정상");
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  useEffect(() => {
    if (!profileReady || spotInitialized) return;
    setSpotInitialized(true);
    const ids = userProfile?.selectedSpotIds ?? [];
    if (ids.length > 0) {
      const found = ALL_SPOTS.find(s => s.id === ids[0]);
      if (found) setSelectedSpot(found);
    }
  }, [profileReady, userProfile?.selectedSpotIds]);

  useEffect(() => {
    if (!spotInitialized) return;
    if (!activeSpots.find(s => s.id === selectedSpot.id) && activeSpots.length > 0) {
      setSelectedSpot(activeSpots[0]);
    }
  }, [activeSpots]);

  const getSurfForecast = useCallback(
    async (spot: Spot = selectedSpot, forceRefresh = false) => {
      setLoading(true);
      try {
        const cacheKey = `surf_v8_${spot.id}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !forceRefresh) {
          const { content, height, period, warning, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) {
            setSurfBriefing(content);
            setWaveHeight(height);
            setWavePeriod(period);
            setWarningStatus(warning ?? "정상");
            setLoading(false);
            return;
          }
        }
        const meteoRes = await axios.get(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}&hourly=wave_height,wave_period&timezone=Asia%2FSeoul&forecast_days=1`,
        );
        const h = new Date().getHours();
        const height = meteoRes.data.hourly.wave_height[h];
        const period = meteoRes.data.hourly.wave_period[h];
        let warning = "정상";
        try {
          const kmaRes = await axios.get(
            `https://apihub.kma.go.kr/api/typ01/url/wrn_reg.php?authKey=${KMA_AUTH_KEY}`,
            { timeout: 3000 },
          );
          const raw = kmaRes.data || "";
          const inArea = raw.includes(spot.area.replace(" ", ""));
          if (inArea && raw.includes("경보"))       warning = "풍랑경보";
          else if (inArea && raw.includes("주의보")) warning = "풍랑주의보";
        } catch (_) {}
        setWarningStatus(warning);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          generationConfig: { maxOutputTokens: 300 },
        });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text:
            `아래 예시처럼 딱 한 줄만 출력해. 다른 말 없이.\n\n` +
            `파고0.2m 파주기5s → 오늘의 송정파도는 발목~무릎, 슈트 3mm추천, 롱보드 입문 연습 좋음\n` +
            `파고0.6m 파주기8s → 오늘의 송정파도는 무릎~허리, 슈트 3mm추천, 롱보드·펀보드 재밌게 타기 좋음\n` +
            `파고1.2m 파주기10s → 오늘의 송정파도는 허리~가슴, 슈트 3mm추천, 숏보드 실력 향상 좋음\n` +
            `파고1.8m 파주기12s → 오늘의 송정파도는 가슴~머리, 슈트 3mm추천, 숏보드 고수만 출격\n\n` +
            `파고${height}m 파주기${period}s 특보:${warning} 스팟:${spot.name} →`,
          }] }],
        });
        const briefingText = result.response.text().trim();
        setSurfBriefing(briefingText);
        setWaveHeight(height);
        setWavePeriod(period);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ content: briefingText, height, period, warning, timestamp: Date.now() }));
      } catch (err: any) {
        setSurfBriefing(`분석 실패: ${err.message ?? String(err)}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSpot],
  );

  useEffect(() => {
    if (!spotInitialized || activeSpots.length === 0) return;
    getSurfForecast();
  }, [spotInitialized, getSurfForecast]);

  const handleSpotChange = (spot: Spot) => {
    setSelectedSpot(spot);
    getSurfForecast(spot);
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try { await logout(); } catch (_) {}
      router.replace("/intro");
    };
    if (Platform.OS === "web") {
      if ((window as any).confirm("로그아웃 하시겠습니까?")) await doLogout();
    } else {
      const { Alert } = require("react-native");
      Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const condition = waveHeight !== null ? getCondition(waveHeight, C) : null;
  const timeStr   = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const multtae   = useMemo(() => calcMulttae(new Date(), C), [C]);
  const todayTip  = SURF_TIPS[new Date().getDay()];
  const noSpotSet = profileReady && (userProfile?.selectedSpotIds ?? []).length === 0;

  if (!profileReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  if (noSpotSet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Good surfing 🤙</Text>
            <Text style={styles.headerTitle}>파도 브리핑</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color={C.textSubtle} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <Waves size={48} color={C.primary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>서핑 스팟을 선택하세요</Text>
            <Text style={styles.emptyDesc}>
              마이페이지에서 선호하는 스팟을 선택하면{"\n"}실시간 파도 데이터를 확인할 수 있어요.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/mypage")}>
              <Text style={styles.emptyBtnText}>스팟 선택하러 가기 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); getSurfForecast(selectedSpot, true); }}
            tintColor={C.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Good surfing 🤙</Text>
            <Text style={styles.headerTitle}>파도 브리핑</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.timeBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={16} color={C.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {(warningStatus === "풍랑경보" || warningStatus === "풍랑주의보") && (
          <View style={[styles.warningCard, warningStatus === "풍랑경보" && styles.warningCardDanger]}>
            <View style={styles.warningTop}>
              <AlertTriangle size={18} color="#fff" />
              <Text style={styles.warningTitle}>⚠️ {warningStatus} 발효 중</Text>
            </View>
            <Text style={styles.warningDesc}>
              현재 선택 스팟 해역에 {warningStatus}가 발효되었습니다.{"\n"}
              출수 전 반드시 <Text style={styles.warningBold}>해양경찰청 안전 신고서</Text>를 작성하세요.{"\n"}
              신고 전화: <Text style={styles.warningBold}>122</Text> (해양긴급신고)
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {activeSpots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              style={[styles.tab, selectedSpot.id === spot.id && styles.tabActive]}
              onPress={() => handleSpotChange(spot)}
            >
              <Text style={styles.tabEmoji}>{spot.emoji}</Text>
              <Text style={[styles.tabText, selectedSpot.id === spot.id && styles.tabTextActive]}>{spot.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.waveCard}>
          <View style={styles.waveCardTop}>
            <Text style={styles.waveCardName}>{selectedSpot.name}</Text>
            {condition && (
              <View style={[styles.conditionBadge, { borderColor: condition.color }]}>
                <Text style={[styles.conditionText, { color: condition.color }]}>{condition.label}</Text>
              </View>
            )}
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>파도 분석 중...</Text>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{waveHeight !== null ? `${waveHeight.toFixed(1)}m` : "--"}</Text>
                <Text style={styles.statLabel}>파고</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{wavePeriod !== null ? `${Math.round(wavePeriod)}s` : "--"}</Text>
                <Text style={styles.statLabel}>주기</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>AI</Text>
                <Text style={styles.statLabel}>코치</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.briefingCard}>
          <View style={styles.briefingTop}>
            <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>🏄 Glassy AI 코치</Text></View>
            <Text style={styles.briefingTitle}>오늘의 브리핑</Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.loadingText}>Gemini 분석 중...</Text>
            </View>
          ) : (
            <Text style={styles.briefingText}>{surfBriefing}</Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => getSurfForecast(selectedSpot, true)}>
            <Text style={styles.refreshBtnText}>↻ 새로고침</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>📍 스팟 바로가기</Text>
        <View style={styles.spotGrid}>
          {ALL_SPOTS.map(spot => (
            <TouchableOpacity key={spot.id} style={styles.spotQuickCard} onPress={() => router.push(`/spot/${spot.id}` as any)}>
              <View style={styles.spotQuickEmojiWrap}>
                <Text style={styles.spotQuickEmoji}>{spot.emoji}</Text>
              </View>
              <View style={styles.spotQuickInfo}>
                <Text style={styles.spotQuickName}>{spot.name}</Text>
                <Text style={styles.spotQuickArrow}>보기 →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tidalCard}>
          <View style={styles.tidalLeft}>
            <Text style={styles.tidalIcon}>🌙</Text>
            <View>
              <Text style={styles.tidalSub}>오늘의 물때</Text>
              <Text style={[styles.tidalLabel, { color: multtae.color }]}>{multtae.label}</Text>
            </View>
          </View>
          <Text style={[styles.tidalDesc, { color: multtae.color }]}>{multtae.desc}</Text>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 오늘의 서핑 팁</Text>
          <Text style={styles.tipText}>{todayTip}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea:  { flex: 1, backgroundColor: C.bg },
    scroll:    { flex: 1 },
    content:   { paddingHorizontal: 20, paddingTop: 12 },
    centered:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

    header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    headerSub:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },
    headerRight: { alignItems: "flex-end", gap: 8 },
    logoutBtn:   { padding: 4 },
    timeBadge:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.bgCard, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    liveDot:     { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.success },
    timeText:    { color: C.textMuted, fontSize: 12, fontWeight: "700" },

    emptyCard:     { backgroundColor: C.bgCard, borderRadius: 24, padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.border, width: "100%" },
    emptyTitle:    { color: C.text, fontSize: 20, fontWeight: "800", marginTop: 8 },
    emptyDesc:     { color: C.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center" },
    emptyBtn:      { marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, backgroundColor: C.primary },
    emptyBtnText:  { color: "#fff", fontSize: 15, fontWeight: "800" },

    warningCard:       { backgroundColor: "#B45309", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#D97706" },
    warningCardDanger: { backgroundColor: "#991B1B", borderColor: "#EF4444" },
    warningTop:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    warningTitle:      { color: "#fff", fontSize: 15, fontWeight: "800" },
    warningDesc:       { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20 },
    warningBold:       { fontWeight: "800", color: "#fff" },

    tabsScroll:    { marginBottom: 16 },
    tabsContent:   { gap: 8, paddingRight: 20 },
    tab:           { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    tabActive:     { backgroundColor: "rgba(14,165,233,0.15)", borderColor: C.primary },
    tabEmoji:      { fontSize: 14 },
    tabText:       { fontWeight: "700", color: C.textMuted, fontSize: 14 },
    tabTextActive: { color: C.primary },

    waveCard:      { backgroundColor: C.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    waveCardTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    waveCardName:  { color: C.text, fontSize: 20, fontWeight: "800" },
    conditionBadge:{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
    conditionText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

    loadingRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
    loadingText: { color: C.textMuted, fontWeight: "600", fontSize: 14 },

    statsRow:    { flexDirection: "row", alignItems: "center", backgroundColor: C.bgSurface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
    statBox:     { flex: 1, alignItems: "center" },
    statValue:   { color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
    statLabel:   { color: C.textSubtle, fontSize: 12, fontWeight: "600" },
    statDivider: { width: 1, height: 36, backgroundColor: C.border },

    sectionLabel:       { color: C.textMuted, fontSize: 13, fontWeight: "800", marginBottom: 10, marginTop: 6 },
    spotGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
    spotQuickCard:      { width: "47.5%", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    spotQuickEmojiWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bgSurface, alignItems: "center", justifyContent: "center" },
    spotQuickEmoji:     { fontSize: 20 },
    spotQuickInfo:      { flex: 1 },
    spotQuickName:      { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 2 },
    spotQuickArrow:     { color: C.primary, fontSize: 12, fontWeight: "700" },

    tidalCard:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    tidalLeft:  { flexDirection: "row", alignItems: "center", gap: 14 },
    tidalIcon:  { fontSize: 28 },
    tidalSub:   { color: C.textSubtle, fontSize: 11, fontWeight: "700", marginBottom: 3 },
    tidalLabel: { fontSize: 20, fontWeight: "800" },
    tidalDesc:  { fontSize: 13, fontWeight: "700" },

    tipCard:  { backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    tipTitle: { color: C.textMuted, fontSize: 12, fontWeight: "800", marginBottom: 8 },
    tipText:  { color: C.text, fontSize: 15, lineHeight: 23, fontWeight: "600" },

    briefingCard:   { backgroundColor: C.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    briefingTop:    { marginBottom: 14 },
    coachBadge:     { alignSelf: "flex-start", backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.25)", marginBottom: 8 },
    coachBadgeText: { color: C.primary, fontSize: 12, fontWeight: "700" },
    briefingTitle:  { color: C.text, fontSize: 17, fontWeight: "800" },
    briefingText:   { color: C.textMuted, fontSize: 16, lineHeight: 26, fontWeight: "600", marginBottom: 18 },
    refreshBtn:     { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    refreshBtnText: { color: C.textMuted, fontSize: 13, fontWeight: "700" },
  });
}
