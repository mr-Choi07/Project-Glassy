import axios from "axios";
import { useRouter } from "expo-router";
import { MapPin, Navigation, Waves, Wind } from "lucide-react-native";
import React, { createElement, useMemo, useRef, useState } from "react";
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
import { REGION_GROUPS, SPOT_REGIONS, SpotData } from "@/constants/spots";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

type LiveData = { wave: number; period: number; windSpeed: number; windDir: number; waterTemp: number };
type LiveState = LiveData | "loading" | "error" | null;

const waveColor = (h: number, C: ThemeColors) => h < 0.5 ? C.textSubtle : h < 1.0 ? "#22C55E" : h < 1.8 ? C.primary : h < 2.5 ? "#F97316" : "#EF4444";
const windColor = (w: number) => w < 3 ? "#22C55E" : w < 6 ? "#EAB308" : w < 11 ? "#F97316" : "#EF4444";
const dirLabel  = (deg: number) => ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
const waveLabel = (h: number) => h < 0.5 ? "FLAT" : h < 1.0 ? "SMALL" : h < 1.8 ? "GOOD" : h < 2.5 ? "SOLID" : "EPIC";

function spotLevelColor(level: string, C: ThemeColors): string {
  if (level === "초중급") return C.primary;
  if (level === "중급")   return C.accent;
  if (level === "초급")   return C.success;
  return C.warning;
}

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

  const [selected, setSelected]           = useState<string | null>(null);
  const [liveData, setLiveData]           = useState<Record<string, LiveState>>({});
  const [activeGroup, setActiveGroup]     = useState("gangwon");   // 통합 탭
  const [activeSubRegion, setActiveSubRegion] = useState("yangyang"); // 세부 탭
  const tabScrollRef = useRef<ScrollView>(null);
  const { userProfile, setSelectedSpots } = useAuth();

  // 현재 통합 그룹의 세부 지역 목록
  const currentGroup = useMemo(
    () => REGION_GROUPS.find(g => g.id === activeGroup) ?? REGION_GROUPS[0],
    [activeGroup],
  );
  const subRegions = useMemo(
    () => currentGroup.subIds.map(id => SPOT_REGIONS.find(r => r.id === id)!).filter(Boolean),
    [currentGroup],
  );
  // 세부 탭이 하나면 그냥 전체 스팟, 여러 개면 선택된 세부 탭의 스팟
  const activeSpots = useMemo(() => {
    if (subRegions.length <= 1) return subRegions[0]?.spots ?? [];
    const sub = subRegions.find(r => r.id === activeSubRegion) ?? subRegions[0];
    return sub?.spots ?? [];
  }, [subRegions, activeSubRegion]);

  const fetchLive = async (spot: SpotData) => {
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
          wave:      parseFloat((rawWave * spot.shelterFactor).toFixed(2)),
          period:    m.wave_period[h] ?? 0,
          waterTemp: m.sea_surface_temperature[h] ?? 0,
          windSpeed: (w.wind_speed_10m[h] ?? 0) / 3.6,
          windDir:   w.wind_direction_10m[h] ?? 0,
        },
      }));
    } catch {
      setLiveData(prev => ({ ...prev, [spot.id]: "error" }));
    }
  };

  const handleToggleFavorite = async (spotId: string) => {
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

  const totalSpots = SPOT_REGIONS.reduce((acc, r) => acc + r.spots.length, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.headerSub}>전국 서핑 명소</Text>
          <Text style={styles.headerTitle}>스팟 가이드 🗺️</Text>
        </View>
        <View style={styles.totalBadge}>
          <MapPin size={12} color={C.primary} />
          <Text style={styles.totalBadgeText}>{totalSpots}곳</Text>
        </View>
      </View>

      {/* 1단계: 통합 지역 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {REGION_GROUPS.map(group => {
          const isActive = group.id === activeGroup;
          const count = group.subIds.reduce((n, id) => n + (SPOT_REGIONS.find(r => r.id === id)?.spots.length ?? 0), 0);
          return (
            <TouchableOpacity key={group.id}
              style={[styles.regionTab, isActive && styles.regionTabActive]}
              onPress={() => { setActiveGroup(group.id); setActiveSubRegion(group.subIds[0]); setSelected(null); }}
            >
              <Text style={[styles.regionTabText, isActive && styles.regionTabTextActive]} numberOfLines={1}>{group.label}</Text>
              <Text style={[styles.regionTabCount, isActive && { color: C.primary }]} numberOfLines={1}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2단계: 세부 지역 탭 (세부 지역 2개 이상일 때만) */}
      {subRegions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.subTabScroll} contentContainerStyle={styles.subTabContent}>
          {subRegions.map(sub => {
            const isActive = sub.id === activeSubRegion;
            return (
              <TouchableOpacity key={sub.id}
                style={[styles.subTab, isActive && styles.subTabActive]}
                onPress={() => { setActiveSubRegion(sub.id); setSelected(null); }}
              >
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]} numberOfLines={1}>
                  {sub.label.replace(/^강원 /, "").replace(/^경북 /, "")}
                </Text>
                <Text style={[styles.subTabCount, isActive && { color: C.primary }]}>{sub.spots.length}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.listCard}>
          {activeSpots.map((spot, idx) => {
            const isFavorite = (userProfile?.selectedSpotIds ?? []).includes(spot.id);
            const isOpen     = selected === spot.id;
            const levelColor = spotLevelColor(spot.level ?? "", C);
            const isLast     = idx === activeSpots.length - 1;
            return (
              <View key={spot.id}>
                {/* 한 줄 행 */}
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => { const opening = !isOpen; setSelected(opening ? spot.id : null); if (opening) fetchLive(spot); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.listEmoji}>{spot.emoji}</Text>
                  <View style={styles.listMid}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.listName}>{spot.name}</Text>
                      {isFavorite && <Text style={{ fontSize: 11 }}>⭐</Text>}
                    </View>
                    <Text style={styles.listRegion} numberOfLines={1}>{spot.region}</Text>
                  </View>
                  {spot.level ? (
                    <View style={[styles.levelBadge, { borderColor: levelColor }]}>
                      <Text style={[styles.levelText, { color: levelColor }]}>{spot.level}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.chevron, isOpen && { color: C.primary }]}>{isOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {/* 펼침 상세 */}
                {isOpen && (
                  <View style={styles.cardDetail}>
                    {(() => {
                      const ld = liveData[spot.id];
                      if (ld === "loading") return (
                        <View style={styles.liveStrip}>
                          <ActivityIndicator size="small" color={C.primary} />
                          <Text style={styles.liveLoadText}>데이터 불러오는 중...</Text>
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
                            <Text style={[styles.liveVal, { color: windColor(ld.windSpeed) }]}>{ld.windSpeed.toFixed(1)}<Text style={styles.liveUnit}>m/s</Text></Text>
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

                    {spot.desc ? <Text style={styles.detailDesc}>{spot.desc}</Text> : null}

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

                {!isLast && !isOpen && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    content:  { paddingHorizontal: 16, paddingTop: 8 },

    headerWrap:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
    headerSub:        { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle:      { color: C.text, fontSize: 26, fontWeight: "800" },
    totalBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(14,165,233,0.10)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.2)" },
    totalBadgeText:   { color: C.primary, fontSize: 12, fontWeight: "700" },

    tabScroll:         { borderBottomWidth: 1, borderBottomColor: C.border, flexGrow: 0, flexShrink: 0 },
    tabContent:        { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
    regionTab:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, flexDirection: "row", alignItems: "center", gap: 5 },
    regionTabActive:   { borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    regionTabText:     { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    regionTabTextActive:{ color: C.primary },
    regionTabCount:    { color: C.textSubtle, fontSize: 11, fontWeight: "700" },
    regionTabCount:    { color: C.textSubtle, fontSize: 11, fontWeight: "700" },

    regionHeader:     { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 12 },
    regionHeaderLine: { flex: 1, height: 1, backgroundColor: C.border },
    regionHeaderText: { color: C.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, paddingHorizontal: 4 },

    subTabScroll:      { borderBottomWidth: 1, borderBottomColor: C.border, flexGrow: 0, flexShrink: 0, backgroundColor: C.bgSurface },
    subTabContent:     { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    subTab:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 4 },
    subTabActive:      { backgroundColor: "rgba(14,165,233,0.12)" },
    subTabText:        { color: C.textSubtle, fontSize: 12, fontWeight: "700" },
    subTabTextActive:  { color: C.primary },
    subTabCount:       { color: C.textSubtle, fontSize: 11, fontWeight: "600" },

    // 리스트 카드 (전체 컨테이너)
    listCard:   { backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 8 },
    listRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    listEmoji:  { fontSize: 22, width: 30, textAlign: "center" },
    listMid:    { flex: 1, gap: 2 },
    listName:   { color: C.text, fontSize: 15, fontWeight: "700" },
    listRegion: { color: C.textSubtle, fontSize: 12 },
    chevron:    { color: C.textSubtle, fontSize: 12, fontWeight: "700", marginLeft: 4 },
    rowDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

    levelBadge:   { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 16, borderWidth: 1.5 },
    levelText:    { fontSize: 11, fontWeight: "800" },

    cardDetail:    { paddingHorizontal: 16, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
    detailDesc:    { color: C.textMuted, fontSize: 13, lineHeight: 20 },

    detailBtnRow:     { flexDirection: "row", gap: 10 },
    favBtn:           { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.08)", justifyContent: "center" },
    favBtnActive:     { borderColor: C.success, backgroundColor: "rgba(16,185,129,0.08)" },
    favBtnText:       { color: C.primary, fontSize: 13, fontWeight: "700" },
    detailPageBtn:    { flex: 1, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, alignItems: "center" },
    detailPageBtnText:{ color: C.text, fontSize: 13, fontWeight: "700" },

    liveStrip:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(14,165,233,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(14,165,233,0.18)", paddingVertical: 10, paddingHorizontal: 8 },
    liveItem:     { flex: 1, alignItems: "center", gap: 3 },
    liveVal:      { color: C.text, fontSize: 14, fontWeight: "800" },
    liveUnit:     { fontSize: 10, fontWeight: "600", color: C.textMuted },
    liveKey:      { color: C.textSubtle, fontSize: 10, fontWeight: "600" },
    liveDivV:     { width: 1, height: 28, backgroundColor: C.border },
    liveLoadText: { color: C.textMuted, fontSize: 13, marginLeft: 10 },
    liveErrText:  { color: C.warning, fontSize: 13, fontWeight: "600" },
  });
}
