import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { AlertTriangle, LogOut, MapPin, Waves } from "lucide-react-native";
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
import { Colors } from "@/constants/theme";

const GEMINI_API_KEY = "REMOVED_KEY";
const KMA_AUTH_KEY   = "PUcoXsS7SiSHKF7Eu3okRg";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const ALL_SPOTS = [
  { id: "songjeong", name: "송정",  lat: 35.1786, lon: 129.2075, area: "남해동부앞바다", emoji: "🐚" },
  { id: "dadaepo",   name: "다대포", lat: 35.0476, lon: 128.9610, area: "남해동부앞바다", emoji: "🌊" },
] as const;

type Spot = typeof ALL_SPOTS[number];

function getCondition(h: number) {
  if (h < 0.5) return { label: "FLAT",    color: Colors.textSubtle };
  if (h < 1.0) return { label: "SMALL",   color: Colors.textMuted };
  if (h < 1.8) return { label: "GOOD ✦",  color: Colors.primary };
  if (h < 2.5) return { label: "SOLID",   color: Colors.accent };
  return              { label: "EPIC 🔥", color: Colors.warning };
}

export default function HomeScreen() {
  const { logout, userProfile, profileReady } = useAuth();
  const router = useRouter();

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
        const cacheKey = `surf_v2_${spot.id}`;
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
          if (inArea && raw.includes("경보"))    warning = "풍랑경보";
          else if (inArea && raw.includes("주의보")) warning = "풍랑주의보";
        } catch (_) {}
        setWarningStatus(warning);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
          `지역: ${spot.name}, 파고: ${height}m, 주기: ${period}초, 특보: ${warning}. 너는 전문 서핑 코치야. 서퍼 말투로 딱 한 줄만 브리핑해줘. 🤙`,
        );
        const briefingText = result.response.text().trim();

        setSurfBriefing(briefingText);
        setWaveHeight(height);
        setWavePeriod(period);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ content: briefingText, height, period, warning, timestamp: Date.now() }));
      } catch (err: any) {
        setSurfBriefing(`분석 실패: ${err.message?.substring(0, 40)}`);
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

  const condition = waveHeight !== null ? getCondition(waveHeight) : null;
  const timeStr   = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const noSpotSet = profileReady && (userProfile?.selectedSpotIds ?? []).length === 0;

  if (!profileReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  // 스팟 미선택: 선택 유도 화면만 표시
  if (noSpotSet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Good surfing 🤙</Text>
            <Text style={styles.headerTitle}>파도 브리핑</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color={Colors.textSubtle} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <Waves size={48} color={Colors.primary} strokeWidth={1.5} />
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
            tintColor={Colors.primary}
          />
        }
      >
        {/* 헤더 */}
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
              <LogOut size={16} color={Colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 풍랑 경보/주의보 신고서 안내 */}
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

        {/* 스팟 탭 */}
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

        {/* 파도 카드 */}
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
              <ActivityIndicator size="large" color={Colors.primary} />
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

        {/* AI 브리핑 */}
        <View style={styles.briefingCard}>
          <View style={styles.briefingTop}>
            <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>🏄 Glassy AI 코치</Text></View>
            <Text style={styles.briefingTitle}>오늘의 브리핑</Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Gemini 분석 중...</Text>
            </View>
          ) : (
            <Text style={styles.briefingText}>{surfBriefing}</Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => getSurfForecast(selectedSpot, true)}>
            <Text style={styles.refreshBtnText}>↻ 새로고침</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flex: 1 },
  content:   { paddingHorizontal: 20, paddingTop: 12 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerSub:   { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  headerTitle: { color: Colors.text, fontSize: 26, fontWeight: "800" },
  headerRight: { alignItems: "flex-end", gap: 8 },
  logoutBtn:   { padding: 4 },
  timeBadge:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.bgCard, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  liveDot:     { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  timeText:    { color: Colors.textMuted, fontSize: 12, fontWeight: "700" },

  // 스팟 미선택
  emptyCard:     { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border, width: "100%" },
  emptyTitle:    { color: Colors.text, fontSize: 20, fontWeight: "800", marginTop: 8 },
  emptyDesc:     { color: Colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center" },
  emptyBtn:      { marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, backgroundColor: Colors.primary },
  emptyBtnText:  { color: "#fff", fontSize: 15, fontWeight: "800" },

  // 풍랑 경보
  warningCard:       { backgroundColor: "#B45309", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#D97706" },
  warningCardDanger: { backgroundColor: "#991B1B", borderColor: "#EF4444" },
  warningTop:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  warningTitle:      { color: "#fff", fontSize: 15, fontWeight: "800" },
  warningDesc:       { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20 },
  warningBold:       { fontWeight: "800", color: "#fff" },

  tabsScroll:    { marginBottom: 16 },
  tabsContent:   { gap: 8, paddingRight: 4 },
  tab:           { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:     { backgroundColor: "rgba(14,165,233,0.15)", borderColor: Colors.primary },
  tabEmoji:      { fontSize: 14 },
  tabText:       { fontWeight: "700", color: Colors.textMuted, fontSize: 14 },
  tabTextActive: { color: Colors.primary },

  waveCard:      { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  waveCardTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  waveCardName:  { color: Colors.text, fontSize: 20, fontWeight: "800" },
  conditionBadge:{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  conditionText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  loadingRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  loadingText: { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },

  statsRow:    { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgSurface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  statBox:     { flex: 1, alignItems: "center" },
  statValue:   { color: Colors.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  statLabel:   { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  briefingCard:   { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border },
  briefingTop:    { marginBottom: 14 },
  coachBadge:     { alignSelf: "flex-start", backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.25)", marginBottom: 8 },
  coachBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  briefingTitle:  { color: Colors.text, fontSize: 17, fontWeight: "800" },
  briefingText:   { color: Colors.textMuted, fontSize: 16, lineHeight: 26, fontWeight: "600", marginBottom: 18 },
  refreshBtn:     { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  refreshBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
});
