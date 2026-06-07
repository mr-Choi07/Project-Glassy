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
import { ALL_SPOTS_FLAT } from "@/constants/spots";

const KMA_AUTH_KEY = process.env.EXPO_PUBLIC_KMA_AUTH_KEY!;


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

// KMA 기상특보 구역명 매핑 (API 응답 텍스트 매칭용)
const KMA_AREA: Record<string, string> = {
  songjeong: "남해동부앞바다", haeundae:  "남해동부앞바다",
  dadaepo:   "남해동부앞바다", gwanganri: "남해동부앞바다",
  jukdo: "동해중부앞바다", inggu: "동해중부앞바다", gisamun: "동해중부앞바다",
  gaetmaul: "동해중부앞바다", namae3ri: "동해중부앞바다", mulchi: "동해중부앞바다",
  seorak: "동해중부앞바다", dongsan: "동해중부앞바다", surferbeach: "동해중부앞바다",
  hajodae: "동해중부앞바다", dongho: "동해중부앞바다", naksan: "동해중부앞바다",
  jeongam: "동해중부앞바다", songjho: "동해북부앞바다", cheonjin: "동해북부앞바다",
  sokcho: "동해북부앞바다", geumjin: "동해중부앞바다", gyeongpo: "동해중부앞바다",
  daejin: "동해중부앞바다", yonghwa: "동해중부앞바다",
  jungmun: "제주도남쪽바다", ihoteu: "제주도북쪽바다", woljeong: "제주도북쪽바다", gwakji: "제주도북쪽바다",
  boheung: "동해중부앞바다", sinhangman: "동해중부앞바다", wolpo: "동해중부앞바다",
  malliopo: "서해중부앞바다",
};

// lat/lon: 해수욕장 위치(지도용), apiLat/apiLon: 오픈워터 API 포인트(파도 정확도 향상)
// ALL_SPOTS is derived from the central registry; we add the `area` field for KMA warnings.
const ALL_SPOTS = ALL_SPOTS_FLAT.map(s => ({
  id: s.id,
  name: s.name,
  lat: s.lat, lon: s.lon,
  apiLat: s.apiLat, apiLon: s.apiLon,
  emoji: s.emoji,
  area: KMA_AREA[s.id] ?? "동해중부앞바다",
}));

type Spot = typeof ALL_SPOTS[number];

// spot/[id].tsx 와 동일한 지형 차폐 계수 (shelterFactor × swell 방향 효율)
// Derived from the central registry.
const SPOT_SHELTER: Record<string, { shelterFactor: number; swellWindow: [number, number] }> = Object.fromEntries(
  ALL_SPOTS_FLAT.map(s => [s.id, { shelterFactor: s.shelterFactor, swellWindow: s.swellWindow }])
);

function swellEff(waveDir: number, win: [number, number]): number {
  const a = ((waveDir % 360) + 360) % 360;
  const inWin = win[0] <= win[1] ? a >= win[0] && a <= win[1] : a >= win[0] || a <= win[1];
  if (inWin) return 1.0;
  const d = Math.min(
    Math.abs(((a - win[0] + 540) % 360) - 180),
    Math.abs(((a - win[1] + 540) % 360) - 180),
  );
  return d < 25 ? 0.60 : d < 50 ? 0.30 : 0.10;
}

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
    // selectedSpotIds 순서를 그대로 유지 (사용자 커스텀 순서)
    return ids.map(id => ALL_SPOTS.find(s => s.id === id)).filter(Boolean) as Spot[];
  }, [userProfile?.selectedSpotIds]);

  const [selectedSpot, setSelectedSpot] = useState<Spot>(ALL_SPOTS[0]);
  const [spotInitialized, setSpotInitialized] = useState(false);
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
    async (spot: Spot = selectedSpot) => {
      setLoading(true);
      try {
        const meteoRes = await axios.get(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.apiLat}&longitude=${spot.apiLon}&hourly=wave_height,wave_direction,wave_period&timezone=Asia%2FSeoul&forecast_days=1`,
        );
        const h = new Date().getHours();
        const rawHeight = meteoRes.data.hourly.wave_height[h] ?? 0;
        const waveDir   = meteoRes.data.hourly.wave_direction[h] ?? 0;
        const period    = meteoRes.data.hourly.wave_period[h] ?? 0;
        const shelter   = SPOT_SHELTER[spot.id];
        const height    = shelter
          ? parseFloat((rawHeight * shelter.shelterFactor * swellEff(waveDir, shelter.swellWindow)).toFixed(2))
          : rawHeight;
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
        setWaveHeight(height);
        setWavePeriod(period);
      } catch (err: any) {
        // fetch 실패 시 수치 없이 진행
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSpot],
  );

  useEffect(() => {
    if (!spotInitialized) return;
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
        <View style={styles.noSpotHeader}>
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
            onRefresh={() => { setRefreshing(true); getSurfForecast(selectedSpot); }}
            tintColor={C.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Good surfing 🤙</Text>
            <Text style={styles.headerTitle}>파도 브리핑</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color={C.textSubtle} />
          </TouchableOpacity>
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
            </View>
          )}
        </View>

        {/* ── 오늘 서핑 가능? 판단 카드 ── */}
        {!loading && waveHeight !== null && (() => {
          const h = waveHeight;
          let level: "beginner" | "intermediate" | "advanced" | "flat" | "danger";
          let emoji: string, title: string, desc: string, bg: string, border: string, textCol: string;
          if (h < 0.5) {
            level = "flat"; emoji = "😴"; title = "오늘은 쉬어요";
            desc = "파도가 거의 없어요. 물놀이나 SUP은 좋아요!";
            bg = C.bgCard; border = C.border; textCol = C.textMuted;
          } else if (h < 1.0) {
            level = "beginner"; emoji = "✅"; title = "초보자 추천!";
            desc = "무릎~허리 파도. 팝업 연습하기 딱 좋은 날!";
            bg = "rgba(16,185,129,0.08)"; border = "rgba(16,185,129,0.35)"; textCol = "#10B981";
          } else if (h < 1.8) {
            level = "intermediate"; emoji = "🤙"; title = "중급 이상 추천!";
            desc = "허리~가슴 파도. 제대로 된 서핑 즐기기 좋아요.";
            bg = "rgba(14,165,233,0.08)"; border = "rgba(14,165,233,0.35)"; textCol = C.primary;
          } else if (h < 2.5) {
            level = "advanced"; emoji = "⚡"; title = "상급자 전용";
            desc = "가슴~머리 파도. 경험 있는 서퍼만 출동!";
            bg = "rgba(249,115,22,0.08)"; border = "rgba(249,115,22,0.35)"; textCol = "#F97316";
          } else {
            level = "danger"; emoji = "🔴"; title = "위험 — 자제 권고";
            desc = "오버헤드 이상의 강한 파도. 전문가 외 자제하세요.";
            bg = "rgba(239,68,68,0.08)"; border = "rgba(239,68,68,0.35)"; textCol = "#EF4444";
          }
          return (
            <View style={[styles.canSurfCard, { backgroundColor: bg, borderColor: border }]}>
              <View style={styles.canSurfLeft}>
                <Text style={styles.canSurfEmoji}>{emoji}</Text>
                <View>
                  <Text style={styles.canSurfHint}>오늘 서핑 가능?</Text>
                  <Text style={[styles.canSurfTitle, { color: textCol }]}>{title}</Text>
                  <Text style={styles.canSurfDesc}>{desc}</Text>
                </View>
              </View>
              <View style={styles.canSurfLevelCol}>
                {[
                  { lv: "초보", ok: level === "beginner" || level === "intermediate" || level === "advanced" },
                  { lv: "중급", ok: level === "intermediate" || level === "advanced" },
                  { lv: "고급", ok: level === "advanced" || level === "danger" },
                ].map(({ lv, ok }) => (
                  <View key={lv} style={styles.canSurfLevelRow}>
                    <View style={[styles.canSurfDot, { backgroundColor: ok ? textCol : C.border }]} />
                    <Text style={[styles.canSurfLevelText, ok && { color: textCol, fontWeight: "700" }]}>{lv}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ── AI 코치 카드 ── */}
        {!loading && waveHeight !== null && (() => {
          const h = waveHeight;
          const score = h < 0.5 ? 20 : h < 1.0 ? 55 : h < 1.8 ? 82 : h < 2.5 ? 70 : 40;
          const msg =
            h < 0.5 ? "오늘은 파도가 거의 없어요. 물놀이나 컨디션 관리하기 좋은 날이에요 😴" :
            h < 1.0 ? "초보자에게 딱 좋은 파도예요! 팝업 연습하기 최고의 날입니다 🤙" :
            h < 1.8 ? `오늘 ${selectedSpot.name} 파도는 중급 이상에게 적합해요. 제대로 된 라이딩 즐겨보세요 🌊` :
            h < 2.5 ? "파워풀한 파도예요. 경험 있는 서퍼라면 도전해볼 만해요 ⚡" :
            "오버헤드 이상의 강한 파도입니다. 안전에 각별히 주의하세요 🔴";
          return (
            <View style={styles.aiCard}>
              <View style={styles.aiCardTop}>
                <View style={styles.aiChip}><Text style={styles.aiChipText}>✦ AI 코치</Text></View>
                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreNum}>{score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
              <View style={styles.aiBubble}>
                <View style={styles.aiBubbleAvatar}><Text style={styles.aiBubbleAvatarText}>G</Text></View>
                <Text style={styles.aiBubbleText}>{msg}</Text>
              </View>
            </View>
          );
        })()}

        {activeSpots.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>📍 스팟 바로가기</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotChipsScroll} contentContainerStyle={styles.spotChipsContent}>
              {activeSpots.map(spot => (
                <TouchableOpacity key={spot.id} style={styles.spotChip} onPress={() => router.push(`/spot/${spot.id}` as any)}>
                  <Text style={styles.spotChipEmoji}>{spot.emoji}</Text>
                  <Text style={styles.spotChipName}>{spot.name}</Text>
                  <Text style={styles.spotChipArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

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
    centered:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, paddingBottom: 108 },

    header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    noSpotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingHorizontal: 20, paddingTop: 12 },
    headerSub:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },
    logoutBtn:   { padding: 4 },

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

    // AI 코치 카드
    aiCard:            { backgroundColor: C.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    aiCardTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    aiChip:            { backgroundColor: "rgba(14,165,233,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(14,165,233,0.3)" },
    aiChipText:        { color: C.primary, fontSize: 12, fontWeight: "800" },
    scoreWrap:         { flexDirection: "row", alignItems: "flex-end", gap: 2 },
    scoreNum:          { color: C.primary, fontSize: 28, fontWeight: "800", lineHeight: 30 },
    scoreMax:          { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 2 },
    aiBubble:          { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.bgSurface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
    aiBubbleAvatar:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    aiBubbleAvatarText:{ color: "#fff", fontSize: 13, fontWeight: "800" },
    aiBubbleText:      { flex: 1, color: C.text, fontSize: 13, lineHeight: 20 },

    sectionLabel:      { color: C.textMuted, fontSize: 13, fontWeight: "800", marginBottom: 10, marginTop: 6 },
    spotChipsScroll:   { marginBottom: 14 },
    spotChipsContent:  { gap: 8, paddingRight: 4 },
    spotChip:          { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    spotChipEmoji:     { fontSize: 16 },
    spotChipName:      { color: C.text, fontSize: 14, fontWeight: "700" },
    spotChipArrow:     { color: C.primary, fontSize: 13, fontWeight: "700" },

    tidalCard:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    tidalLeft:  { flexDirection: "row", alignItems: "center", gap: 14 },
    tidalIcon:  { fontSize: 28 },
    tidalSub:   { color: C.textSubtle, fontSize: 11, fontWeight: "700", marginBottom: 3 },
    tidalLabel: { fontSize: 20, fontWeight: "800" },
    tidalDesc:  { fontSize: 13, fontWeight: "700" },

    tipCard:  { backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    tipTitle: { color: C.textMuted, fontSize: 12, fontWeight: "800", marginBottom: 8 },
    tipText:  { color: C.text, fontSize: 15, lineHeight: 23, fontWeight: "600" },


    // 서핑 가능 판단 카드
    canSurfCard:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 20, padding: 18, borderWidth: 1.5, marginBottom: 14 },
    canSurfLeft:       { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
    canSurfEmoji:      { fontSize: 28, lineHeight: 32 },
    canSurfHint:       { color: C.textSubtle, fontSize: 11, fontWeight: "700", marginBottom: 2 },
    canSurfTitle:      { fontSize: 16, fontWeight: "800", marginBottom: 3 },
    canSurfDesc:       { color: C.textMuted, fontSize: 12, lineHeight: 18, maxWidth: 200 },
    canSurfLevelCol:   { gap: 5 },
    canSurfLevelRow:   { flexDirection: "row", alignItems: "center", gap: 5 },
    canSurfDot:        { width: 7, height: 7, borderRadius: 3.5 },
    canSurfLevelText:  { color: C.textSubtle, fontSize: 11, fontWeight: "600" },
  });
}
