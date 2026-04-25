import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const GEMINI_API_KEY = "AIzaSyAVksNaNgOquObDjm23Qq_I__4UpMfCyqw";
const KMA_AUTH_KEY = "PUcoXsS7SiSHKF7Eu3okRg";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SURF_POINTS = [
  { id: "jungmun",   name: "중문",  lat: 33.24, lon: 126.41, area: "제주도남부앞바다", emoji: "🌊" },
  { id: "yangyang",  name: "양양",  lat: 38.02, lon: 128.71, area: "강원북부앞바다",  emoji: "🏄" },
  { id: "songjeong", name: "송정",  lat: 35.17, lon: 129.2,  area: "남해동부앞바다",  emoji: "🐚" },
  { id: "pohang",    name: "포항",  lat: 36.1,  lon: 129.43, area: "경북남부앞바다",  emoji: "⚡" },
];

function getCondition(height: number): { label: string; color: string } {
  if (height < 0.5) return { label: "FLAT",     color: Colors.textSubtle };
  if (height < 1.0) return { label: "SMALL",    color: Colors.textMuted };
  if (height < 1.8) return { label: "GOOD ✦",  color: Colors.primary };
  if (height < 2.5) return { label: "SOLID",    color: Colors.accent };
  return              { label: "EPIC 🔥",       color: Colors.warning };
}

export default function HomeScreen() {
  const [selectedPoint, setSelectedPoint] = useState(SURF_POINTS[0]);
  const [surfBriefing, setSurfBriefing] = useState("");
  const [waveHeight, setWaveHeight] = useState<number | null>(null);
  const [wavePeriod, setWavePeriod] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getSurfForecast = useCallback(
    async (point = selectedPoint, forceRefresh = false) => {
      setLoading(true);
      try {
        const cacheKey = `surf_v2_${point.id}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !forceRefresh) {
          const { content, height, period, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) {
            setSurfBriefing(content); setWaveHeight(height); setWavePeriod(period);
            setLoading(false); return;
          }
        }

        const meteoRes = await axios.get(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${point.lat}&longitude=${point.lon}&hourly=wave_height,wave_period&timezone=Asia%2FSeoul&forecast_days=1`
        );
        const h = new Date().getHours();
        const height = meteoRes.data.hourly.wave_height[h];
        const period = meteoRes.data.hourly.wave_period[h];

        let warningStatus = "정상";
        try {
          const kmaRes = await axios.get(
            `https://apihub.kma.go.kr/api/typ01/url/wrn_reg.php?authKey=${KMA_AUTH_KEY}`,
            { timeout: 3000 }
          );
          const raw = kmaRes.data || "";
          const inArea = raw.includes(point.area.replace(" ", ""));
          if (inArea && raw.includes("경보")) warningStatus = "풍랑경보";
          else if (inArea && raw.includes("주의보")) warningStatus = "풍랑주의보";
        } catch (_) {}

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
          `지역: ${point.name}, 파고: ${height}m, 주기: ${period}초, 특보: ${warningStatus}. 너는 전문 서핑 코치야. 서퍼 말투로 딱 한 줄만 브리핑해줘. 🤙`
        );
        const briefingText = result.response.text().trim();

        setSurfBriefing(briefingText); setWaveHeight(height); setWavePeriod(period);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ content: briefingText, height, period, timestamp: Date.now() }));
      } catch (error: any) {
        setSurfBriefing(`분석 실패: ${error.message?.substring(0, 40)}`);
      } finally {
        setLoading(false); setRefreshing(false);
      }
    },
    [selectedPoint],
  );

  useEffect(() => { getSurfForecast(); }, [getSurfForecast]);

  const handlePointChange = (point: typeof SURF_POINTS[0]) => {
    setSelectedPoint(point);
    getSurfForecast(point);
  };

  const condition = waveHeight !== null ? getCondition(waveHeight) : null;
  const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); getSurfForecast(selectedPoint, true); }} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Good surfing 🤙</Text>
            <Text style={styles.headerTitle}>파도 브리핑</Text>
          </View>
          <View style={styles.timeBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>

        {/* Spot tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {SURF_POINTS.map((point) => (
            <TouchableOpacity
              key={point.id}
              style={[styles.tab, selectedPoint.id === point.id && styles.tabActive]}
              onPress={() => handlePointChange(point)}
            >
              <Text style={styles.tabEmoji}>{point.emoji}</Text>
              <Text style={[styles.tabText, selectedPoint.id === point.id && styles.tabTextActive]}>{point.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Wave data card */}
        <View style={styles.waveCard}>
          <View style={styles.waveCardTop}>
            <Text style={styles.waveCardName}>{selectedPoint.name}</Text>
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

        {/* AI Briefing card */}
        <View style={styles.briefingCard}>
          <View style={styles.briefingTop}>
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeText}>🏄 Glassy AI 코치</Text>
            </View>
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

          <TouchableOpacity style={styles.refreshBtn} onPress={() => getSurfForecast(selectedPoint, true)}>
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

  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  headerSub:    { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  headerTitle:  { color: Colors.text, fontSize: 26, fontWeight: "800" },
  timeBadge:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.bgCard, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  liveDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  timeText:     { color: Colors.textMuted, fontSize: 12, fontWeight: "700" },

  tabsScroll:   { marginBottom: 16 },
  tabsContent:  { gap: 8, paddingRight: 4 },
  tab:          { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:    { backgroundColor: "rgba(14,165,233,0.15)", borderColor: Colors.primary },
  tabEmoji:     { fontSize: 14 },
  tabText:      { fontWeight: "700", color: Colors.textMuted, fontSize: 14 },
  tabTextActive:{ color: Colors.primary },

  waveCard:     { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  waveCardTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  waveCardName: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  conditionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  conditionText:  { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  loadingRow:   { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  loadingText:  { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },

  statsRow:     { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgSurface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  statBox:      { flex: 1, alignItems: "center" },
  statValue:    { color: Colors.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  statLabel:    { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
  statDivider:  { width: 1, height: 36, backgroundColor: Colors.border },

  briefingCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border },
  briefingTop:  { marginBottom: 14 },
  coachBadge:   { alignSelf: "flex-start", backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.25)", marginBottom: 8 },
  coachBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  briefingTitle:  { color: Colors.text, fontSize: 17, fontWeight: "800" },
  briefingText:   { color: Colors.textMuted, fontSize: 16, lineHeight: 26, fontWeight: "600", marginBottom: 18 },
  refreshBtn:     { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  refreshBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
});
