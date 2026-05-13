import axios from "axios";
import { useRouter } from "expo-router";
import { MapPin, Navigation, Waves, Wind } from "lucide-react-native";
import React, { createElement, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

type LiveData = { wave: number; period: number; windSpeed: number; windDir: number; waterTemp: number };
type LiveState = LiveData | "loading" | "error" | null;

const waveColor = (h: number, C: ThemeColors) => h < 0.5 ? C.textSubtle : h < 1.0 ? "#22C55E" : h < 1.8 ? C.primary : h < 2.5 ? "#F97316" : "#EF4444";
const windColor = (w: number) => w < 10 ? "#22C55E" : w < 20 ? "#EAB308" : w < 40 ? "#F97316" : "#EF4444";
const dirLabel  = (deg: number) => ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
const waveLabel = (h: number) => h < 0.5 ? "FLAT" : h < 1.0 ? "SMALL" : h < 1.8 ? "GOOD" : h < 2.5 ? "SOLID" : "EPIC";

function spotLevelColor(level: string, C: ThemeColors): string {
  if (level === "초중급") return C.primary;
  if (level === "중급")   return C.accent;
  if (level === "초급")   return C.success;
  return C.warning;
}

const SPOTS = [
  {
    id: "songjeong" as const,
    name: "송정 해수욕장",
    region: "부산 해운대구",
    lat: 35.1786, lon: 129.2075,
    apiLat: 35.1718, apiLon: 129.2218, shelter: 0.95,
    level: "초중급",
    tags: ["도심 접근성", "일몰 뷰", "초보 가능"],
    desc: "부산 도심에서 가장 가까운 서핑 스팟. 지하철·버스로 접근이 쉽고, 파도가 비교적 완만해 입문자도 즐길 수 있다. 해 질 무렵 오렌지빛 노을이 일품.",
    bestSeason: "연중 (9~11월 최고)",
    waveType: "비치 브레이크",
    emoji: "🐚",
  },
  {
    id: "haeundae" as const,
    name: "해운대 해수욕장",
    region: "부산 해운대구",
    lat: 35.1588, lon: 129.1604,
    apiLat: 35.1466, apiLon: 129.1674, shelter: 0.80,
    level: "중급",
    tags: ["관광지", "파도 다양", "가끔 대박"],
    desc: "부산 최대 해수욕장. 스웰이 맞으면 훌륭한 파도가 들어온다. 혼잡한 시즌을 피해 이른 아침 세션을 노릴 것.",
    bestSeason: "9~11월 (스웰 시즌)",
    waveType: "비치 브레이크",
    emoji: "🏖️",
  },
  {
    id: "dadaepo" as const,
    name: "다대포 해수욕장",
    region: "부산 사하구",
    lat: 35.0476, lon: 128.9610,
    apiLat: 35.0365, apiLon: 128.9515, shelter: 0.75,
    level: "초급",
    tags: ["초보 추천", "넓은 백사장", "낙조 명소"],
    desc: "부산 서쪽 끝에 위치한 광활한 해변. 파도가 완만하고 수심이 얕아 입문자에게 최적이다. 낙조 명소로 유명하며 가족 단위 서퍼에게 인기.",
    bestSeason: "5~10월",
    waveType: "비치 브레이크",
    emoji: "🌊",
  },
  {
    id: "gwanganri" as const,
    name: "광안리 해수욕장",
    region: "부산 수영구",
    lat: 35.1530, lon: 129.1185,
    apiLat: 35.1395, apiLon: 129.1185, shelter: 0.35,
    level: "SUP 특화",
    tags: ["SUP 성지", "광안대교 뷰", "야간 세션"],
    desc: "부산 SUP의 성지. 수영만 내만 특성상 SUP과 요가에 최적이며, 광안대교를 배경으로 하는 세션은 그 자체로 인생샷.",
    bestSeason: "연중 (봄~가을 추천)",
    waveType: "내만 잔파",
    emoji: "🌉",
  },
];

function MapEmbed({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const { colors: C } = useTheme();
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
  if (Platform.OS === "web") {
    return createElement(
      "div",
      { style: { height: 160, overflow: "hidden", borderRadius: 14, border: `1px solid ${C.border}`, marginTop: 4 } },
      createElement("iframe", {
        src,
        style: { width: "100%", height: 192, border: "none" },
        loading: "lazy",
        title: `${name} 지도`,
      })
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: C.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginTop: 4 }}>
      <MapPin size={20} color={C.primary} />
      <Text style={{ color: C.textMuted, fontSize: 13, flex: 1 }}>{name} — {lat.toFixed(4)}, {lon.toFixed(4)}</Text>
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [selected, setSelected] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<Record<string, LiveState>>({});
  const { userProfile, setSelectedSpots } = useAuth();

  const fetchLive = async (spot: typeof SPOTS[number]) => {
    if (liveData[spot.id] !== null && liveData[spot.id] !== undefined) return;
    setLiveData(prev => ({ ...prev, [spot.id]: "loading" }));
    try {
      const h = new Date().getHours();
      const [marineRes, weatherRes] = await Promise.all([
        axios.get(`https://marine-api.open-meteo.com/v1/marine?latitude=${spot.apiLat}&longitude=${spot.apiLon}&hourly=wave_height,wave_period,sea_surface_temperature&timezone=Asia%2FSeoul&forecast_days=1`),
        axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}&hourly=wind_speed_10m,wind_direction_10m&timezone=Asia%2FSeoul&forecast_days=1`),
      ]);
      const m = marineRes.data.hourly;
      const w = weatherRes.data.hourly;
      const rawWave = m.wave_height[h] ?? 0;
      setLiveData(prev => ({
        ...prev,
        [spot.id]: {
          wave:      parseFloat((rawWave * spot.shelter).toFixed(2)),
          period:    m.wave_period[h] ?? 0,
          waterTemp: m.sea_surface_temperature[h] ?? 0,
          windSpeed: w.wind_speed_10m[h] ?? 0,
          windDir:   w.wind_direction_10m[h] ?? 0,
        },
      }));
    } catch {
      setLiveData(prev => ({ ...prev, [spot.id]: "error" }));
    }
  };

  const handleToggleFavorite = async (spotId: "songjeong" | "haeundae" | "dadaepo" | "gwanganri") => {
    const ids = userProfile?.selectedSpotIds ?? [];
    const next = ids.includes(spotId) ? ids.filter(id => id !== spotId) : [...ids, spotId];
    try {
      await setSelectedSpots(next);
    } catch (e: any) {
      Alert.alert("저장 실패", e?.code === "permission-denied"
        ? "Firebase Console → Firestore → 규칙에서 보안 규칙을 설정해주세요."
        : e.message ?? String(e));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerSub}>부산 서핑 명소</Text>
          <Text style={styles.headerTitle}>스팟 가이드 🗺️</Text>
        </View>

        <View style={styles.banner}>
          <MapPin size={15} color={C.primary} />
          <Text style={styles.bannerText}>Glassy가 선별한 부산 서핑 스팟 4곳</Text>
        </View>

        {SPOTS.map((spot) => {
          const isFavorite  = (userProfile?.selectedSpotIds ?? []).includes(spot.id);
          const isOpen      = selected === spot.id;
          const levelColor  = spotLevelColor(spot.level, C);
          return (
            <TouchableOpacity
              key={spot.id}
              style={[styles.card, isOpen && styles.cardActive]}
              onPress={() => { const opening = !isOpen; setSelected(opening ? spot.id : null); if (opening) fetchLive(spot); }}
              activeOpacity={0.85}
            >
              {isFavorite && (
                <View style={styles.favBadge}>
                  <Text style={styles.favBadgeText}>⭐ 즐겨찾기</Text>
                </View>
              )}

              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.spotEmoji}>{spot.emoji}</Text>
                      <Text style={styles.cardName}>{spot.name}</Text>
                    </View>
                    <Text style={styles.cardRegion}>{spot.region}</Text>
                  </View>
                  <View style={[styles.levelBadge, { borderColor: levelColor }]}>
                    <Text style={[styles.levelText, { color: levelColor }]}>{spot.level}</Text>
                  </View>
                </View>
                <View style={styles.tagRow}>
                  {spot.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {isOpen && (
                <View style={styles.cardDetail}>
                  <View style={styles.detailDivider} />

                  {(() => {
                    const ld = liveData[spot.id];
                    if (ld === "loading") return (
                      <View style={styles.liveStrip}>
                        <ActivityIndicator size="small" color={C.primary} />
                        <Text style={styles.liveLoadText}>실시간 데이터 불러오는 중...</Text>
                      </View>
                    );
                    if (ld === "error") return (
                      <View style={[styles.liveStrip, { justifyContent: "center" }]}>
                        <Text style={styles.liveErrText}>⚠ 데이터 불러오기 실패</Text>
                      </View>
                    );
                    if (!ld) return null;
                    return (
                      <View style={styles.liveStrip}>
                        <View style={styles.liveItem}>
                          <Text style={[styles.liveVal, { color: waveColor(ld.wave, C) }]}>{ld.wave.toFixed(1)}m</Text>
                          <Text style={styles.liveKey}>파고</Text>
                        </View>
                        <View style={styles.liveDivV} />
                        <View style={styles.liveItem}>
                          <Text style={[styles.liveVal, { color: waveColor(ld.wave, C) }]}>{waveLabel(ld.wave)}</Text>
                          <Text style={styles.liveKey}>컨디션</Text>
                        </View>
                        <View style={styles.liveDivV} />
                        <View style={styles.liveItem}>
                          <Text style={styles.liveVal}>{Math.round(ld.period)}<Text style={styles.liveUnit}>s</Text></Text>
                          <Text style={styles.liveKey}>주기</Text>
                        </View>
                        <View style={styles.liveDivV} />
                        <View style={styles.liveItem}>
                          <Text style={[styles.liveVal, { color: windColor(ld.windSpeed) }]}>{Math.round(ld.windSpeed)}<Text style={styles.liveUnit}>m/s</Text></Text>
                          <Text style={styles.liveKey}>{dirLabel(ld.windDir)} 바람</Text>
                        </View>
                        <View style={styles.liveDivV} />
                        <View style={styles.liveItem}>
                          <Text style={styles.liveVal}>{ld.waterTemp.toFixed(1)}<Text style={styles.liveUnit}>°C</Text></Text>
                          <Text style={styles.liveKey}>수온</Text>
                        </View>
                      </View>
                    );
                  })()}

                  <Text style={styles.detailDesc}>{spot.desc}</Text>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Wind size={14} color={C.textMuted} />
                      <Text style={styles.detailLabel}>베스트 시즌</Text>
                      <Text style={styles.detailValue}>{spot.bestSeason}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Waves size={14} color={C.textMuted} />
                      <Text style={styles.detailLabel}>파도 타입</Text>
                      <Text style={styles.detailValue}>{spot.waveType}</Text>
                    </View>
                  </View>

                  <MapEmbed lat={spot.lat} lon={spot.lon} name={spot.name} />

                  <View style={styles.detailBtnRow}>
                    <TouchableOpacity
                      style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                      onPress={() => handleToggleFavorite(spot.id)}
                    >
                      <Navigation size={14} color={isFavorite ? C.success : C.primary} />
                      <Text style={[styles.favBtnText, isFavorite && { color: C.success }]}>
                        {isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailPageBtn}
                      onPress={() => router.push(`/spot/${spot.id}` as any)}
                    >
                      <Text style={styles.detailPageBtnText}>상세보기 →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.expandHint}>
                <Text style={styles.expandHintText}>{isOpen ? "▲ 접기" : "▼ 자세히 보기"}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    content:  { paddingHorizontal: 20, paddingTop: 12 },

    header:      { marginBottom: 18 },
    headerSub:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },

    banner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(14,165,233,0.08)", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(14,165,233,0.2)", marginBottom: 20 },
    bannerText: { color: C.textMuted, fontSize: 14, fontWeight: "500" },

    card:       { backgroundColor: C.bgCard, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    cardActive: { borderColor: C.primary },

    favBadge:     { alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)", marginBottom: 10 },
    favBadgeText: { color: C.success, fontSize: 11, fontWeight: "700" },

    cardTop:      { gap: 12 },
    cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    spotEmoji:    { fontSize: 20 },
    cardName:     { color: C.text, fontSize: 18, fontWeight: "800", marginBottom: 2 },
    cardRegion:   { color: C.textMuted, fontSize: 13, fontWeight: "500" },
    levelBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
    levelText:    { fontSize: 12, fontWeight: "800" },
    tagRow:       { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    tag:          { backgroundColor: C.bgSurface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    tagText:      { color: C.textMuted, fontSize: 12, fontWeight: "600" },

    cardDetail:    { gap: 12 },
    detailDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
    detailDesc:    { color: C.textMuted, fontSize: 14, lineHeight: 22 },
    detailRow:     { flexDirection: "row", gap: 12 },
    detailItem:    { flex: 1, backgroundColor: C.bgSurface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: C.border },
    detailLabel:   { color: C.textSubtle, fontSize: 11, fontWeight: "600", marginTop: 4 },
    detailValue:   { color: C.text, fontSize: 13, fontWeight: "700" },

    detailBtnRow:     { flexDirection: "row", gap: 10, marginTop: 8 },
    favBtn:           { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.08)", justifyContent: "center" },
    favBtnActive:     { borderColor: C.success, backgroundColor: "rgba(16,185,129,0.08)" },
    favBtnText:       { color: C.primary, fontSize: 14, fontWeight: "700" },
    detailPageBtn:    { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, alignItems: "center" },
    detailPageBtnText:{ color: C.text, fontSize: 14, fontWeight: "700" },

    expandHint:     { alignItems: "center", marginTop: 14 },
    expandHintText: { color: C.textSubtle, fontSize: 12, fontWeight: "600" },

    liveStrip:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(14,165,233,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(14,165,233,0.18)", paddingVertical: 12, paddingHorizontal: 10, marginBottom: 4 },
    liveItem:     { flex: 1, alignItems: "center", gap: 3 },
    liveVal:      { color: C.text, fontSize: 15, fontWeight: "800" },
    liveUnit:     { fontSize: 10, fontWeight: "600", color: C.textMuted },
    liveKey:      { color: C.textSubtle, fontSize: 10, fontWeight: "600" },
    liveDivV:     { width: 1, height: 30, backgroundColor: C.border },
    liveLoadText: { color: C.textMuted, fontSize: 13, marginLeft: 10 },
    liveErrText:  { color: C.warning, fontSize: 13, fontWeight: "600" },
  });
}
