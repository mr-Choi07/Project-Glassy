import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Thermometer, Waves, Wind } from "lucide-react-native";
import React, { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

// ─── 스팟 메타데이터 ───────────────────────────────────────────────────────
const SPOT_META: Record<string, { name: string; region: string; lat: number; lon: number; emoji: string; photo: string }> = {
  songjeong: {
    name: "송정 해수욕장", region: "부산 해운대구",
    lat: 35.1786, lon: 129.2075, emoji: "🐚",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
  },
  dadaepo: {
    name: "다대포 해수욕장", region: "부산 사하구",
    lat: 35.0476, lon: 128.9610, emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=900&q=80",
  },
};

// ─── 타입 ─────────────────────────────────────────────────────────────────
interface HourData {
  time: string; hour: number;
  waveHeight: number; waveDirection: number; wavePeriod: number;
  swellHeight: number; swellPeriod: number;
  waterTemp: number;
  windSpeed: number; windDirection: number; windGusts: number;
  airTemp: number; precipitation: number; uvIndex: number; cloudCover: number;
}

// ─── 색상 헬퍼 ────────────────────────────────────────────────────────────
const waveTextColor = (h: number) => h < 0.5 ? Colors.textSubtle : h < 1.0 ? "#22C55E" : h < 1.8 ? Colors.primary : h < 2.5 ? "#F97316" : "#EF4444";
const waveBg        = (h: number) => h < 0.5 ? "rgba(100,116,139,0.15)" : h < 1.0 ? "rgba(34,197,94,0.18)" : h < 1.8 ? "rgba(14,165,233,0.2)" : h < 2.5 ? "rgba(249,115,22,0.22)" : "rgba(239,68,68,0.22)";
const windTextColor = (w: number) => w < 10 ? "#22C55E" : w < 20 ? "#EAB308" : w < 40 ? "#F97316" : "#EF4444";
const windBg        = (w: number) => w < 10 ? "rgba(34,197,94,0.15)" : w < 20 ? "rgba(234,179,8,0.18)" : w < 40 ? "rgba(249,115,22,0.2)" : "rgba(239,68,68,0.2)";
const tempTextColor = (t: number) => t < 15 ? "#60A5FA" : t < 20 ? Colors.primary : t < 25 ? "#22C55E" : "#F97316";
const tempBg        = (t: number) => t < 15 ? "rgba(96,165,250,0.2)" : t < 20 ? "rgba(14,165,233,0.15)" : t < 25 ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.18)";

const windArrow = (deg: number) => {
  const a = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return a[Math.round(deg / 45) % 8];
};

const waveLabel = (h: number) => h < 0.5 ? "FLAT" : h < 1.0 ? "SMALL" : h < 1.8 ? "GOOD" : h < 2.5 ? "SOLID" : "EPIC";

// ─── 지도 (OSM 하단 툴바 숨김) ────────────────────────────────────────────
function MapView({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.025}%2C${lat - 0.015}%2C${lon + 0.025}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lon}`;
  if (Platform.OS === "web") {
    // 컨테이너로 overflow:hidden → 하단 31px 툴바 잘라냄
    return createElement(
      "div",
      { style: { height: 190, overflow: "hidden", borderRadius: 14, border: `1px solid ${Colors.border}`, marginBottom: 0 } },
      createElement("iframe", { src, style: { width: "100%", height: 222, border: "none" }, loading: "lazy", title: name }),
    );
  }
  return (
    <View style={mS.native}>
      <Text style={mS.coords}>{lat.toFixed(4)}, {lon.toFixed(4)}</Text>
      <Text style={mS.sub}>{name}</Text>
    </View>
  );
}
const mS = StyleSheet.create({
  native: { padding: 20, alignItems: "center", gap: 6, backgroundColor: Colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  coords: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  sub:    { color: Colors.textMuted, fontSize: 12 },
});

// ─── 주간 바차트 ──────────────────────────────────────────────────────────
function WeekBarChart({ values, color, unit, labels, max: maxProp }: { values: number[]; color: string; unit: string; labels: string[]; max?: number }) {
  const H = 64;
  const max = maxProp ?? Math.max(...values.filter(v => v > 0), 1);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: H, gap: 4, marginBottom: 4 }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: H }}>
            <Text style={{ fontSize: 9, color, fontWeight: "700", marginBottom: 2 }}>{v.toFixed(1)}</Text>
            <View style={{ width: "100%", height: Math.max((v / max) * (H - 18), 2), backgroundColor: color, borderRadius: 4, opacity: 0.85 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row" }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: Colors.textSubtle, fontWeight: "600" }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── 시간별 테이블 ───────────────────────────────────────────────────────
const COL_W = 54;
const ROW_H = { time: 32, main: 52, sub: 36 };

function HourlyTable({ hours, currentH }: { hours: HourData[]; currentH: number }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!scrollRef.current || !hours.length) return;
    const idx = hours.findIndex(h => h.hour === currentH);
    const x = Math.max(0, (idx - 1)) * COL_W;
    setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 100);
  }, [hours, currentH]);

  const LABEL_W = 58;

  return (
    <View style={[tS.wrapper, { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border }]}>
      {/* 컬럼 헤더 행 */}
      <View style={{ flexDirection: "row", backgroundColor: Colors.bgSurface }}>
        {/* 고정 레이블 영역 */}
        <View style={{ width: LABEL_W, borderRightWidth: 1, borderRightColor: Colors.border }}>
          <View style={[tS.labelCell, { height: ROW_H.time }]}>
            <Text style={tS.labelText}>시각</Text>
          </View>
          <View style={[tS.labelCell, { height: ROW_H.main, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Waves size={13} color={Colors.primary} />
            <Text style={[tS.labelText, { color: Colors.primary }]}>파고</Text>
          </View>
          <View style={[tS.labelCell, { height: ROW_H.sub, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Text style={tS.labelText}>주기·너울</Text>
          </View>
          <View style={[tS.labelCell, { height: ROW_H.main, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Thermometer size={13} color={Colors.accent} />
            <Text style={[tS.labelText, { color: Colors.accent }]}>수온</Text>
          </View>
          <View style={[tS.labelCell, { height: ROW_H.main, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Wind size={13} color="#94A3B8" />
            <Text style={[tS.labelText, { color: Colors.textMuted }]}>풍속</Text>
          </View>
          <View style={[tS.labelCell, { height: ROW_H.sub, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Text style={tS.labelText}>강수·UV</Text>
          </View>
        </View>

        {/* 스크롤 영역 */}
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View>
            {/* 시간 행 */}
            <View style={{ flexDirection: "row" }}>
              {hours.map((h, i) => {
                const isNow = h.hour === currentH;
                return (
                  <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.time, backgroundColor: isNow ? "rgba(14,165,233,0.18)" : "transparent", borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: isNow ? "800" : "600", color: isNow ? Colors.primary : Colors.textMuted }}>
                      {`${h.hour}시`}
                    </Text>
                    {isNow && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary }} />}
                  </View>
                );
              })}
            </View>

            {/* 파고 행 */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.border }}>
              {hours.map((h, i) => {
                const isNow = h.hour === currentH;
                return (
                  <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: waveBg(h.waveHeight), borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: waveTextColor(h.waveHeight) }}>{h.waveHeight.toFixed(1)}</Text>
                    <Text style={{ fontSize: 9, color: waveTextColor(h.waveHeight), fontWeight: "700" }}>m</Text>
                    {isNow && <Text style={{ fontSize: 8, color: waveTextColor(h.waveHeight), fontWeight: "700" }}>{waveLabel(h.waveHeight)}</Text>}
                  </View>
                );
              })}
            </View>

            {/* 주기·너울 행 */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.sub, borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                  <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: "600" }}>{h.wavePeriod.toFixed(0)}s</Text>
                  <Text style={{ fontSize: 10, color: Colors.textSubtle }}>{h.swellHeight.toFixed(1)}m</Text>
                </View>
              ))}
            </View>

            {/* 수온 행 */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: tempBg(h.waterTemp), borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: tempTextColor(h.waterTemp) }}>{h.waterTemp.toFixed(0)}</Text>
                  <Text style={{ fontSize: 9, color: tempTextColor(h.waterTemp), fontWeight: "700" }}>°C</Text>
                </View>
              ))}
            </View>

            {/* 풍속 행 */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: windBg(h.windSpeed), borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: windTextColor(h.windSpeed) }}>
                    {windArrow(h.windDirection)}{h.windSpeed.toFixed(0)}
                  </Text>
                  <Text style={{ fontSize: 9, color: windTextColor(h.windSpeed) }}>km/h</Text>
                </View>
              ))}
            </View>

            {/* 강수·UV 행 */}
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.sub, borderLeftWidth: i === 0 ? 0 : 0.5, borderLeftColor: Colors.border }]}>
                  <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: "600" }}>☔{h.precipitation}%</Text>
                  <Text style={{ fontSize: 10, color: Colors.textSubtle }}>UV{h.uvIndex.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const tS = StyleSheet.create({
  wrapper:   { overflow: "hidden" },
  labelCell: { alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 4 },
  labelText: { fontSize: 10, fontWeight: "700", color: Colors.textMuted, textAlign: "center" },
  cell:      { alignItems: "center", justifyContent: "center" },
});

// ─── 현재 상태 요약 카드 ──────────────────────────────────────────────────
function CurrentCard({ cur }: { cur: HourData }) {
  return (
    <View style={ccS.card}>
      <View style={ccS.topRow}>
        <View style={[ccS.badge, { borderColor: waveTextColor(cur.waveHeight) }]}>
          <Text style={[ccS.badgeText, { color: waveTextColor(cur.waveHeight) }]}>{waveLabel(cur.waveHeight)}</Text>
        </View>
        <Text style={ccS.timeLabel}>현재 {cur.hour}시 기준</Text>
      </View>
      <View style={ccS.grid}>
        <Metric icon="🌊" label="파고" value={`${cur.waveHeight.toFixed(1)}m`} sub={`주기 ${cur.wavePeriod.toFixed(0)}s`} color={waveTextColor(cur.waveHeight)} />
        <Metric icon="🌡" label="수온" value={`${cur.waterTemp.toFixed(0)}°C`} sub={`기온 ${cur.airTemp.toFixed(0)}°C`} color={tempTextColor(cur.waterTemp)} />
        <Metric icon="💨" label="풍속" value={`${cur.windSpeed.toFixed(0)}km/h`} sub={`돌풍 ${cur.windGusts.toFixed(0)}km/h`} color={windTextColor(cur.windSpeed)} />
        <Metric icon="🌊" label="너울" value={`${cur.swellHeight.toFixed(1)}m`} sub={`${cur.swellPeriod.toFixed(0)}s 주기`} color={Colors.textMuted} />
        <Metric icon="☁" label="구름" value={`${cur.cloudCover}%`} sub="" color={Colors.textSubtle} />
        <Metric icon="🌞" label="UV" value={`${cur.uvIndex.toFixed(0)}`} sub={cur.uvIndex < 3 ? "낮음" : cur.uvIndex < 6 ? "보통" : "높음"} color={Colors.textMuted} />
      </View>
    </View>
  );
}

function Metric({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <View style={ccS.metricBox}>
      <Text style={ccS.metricIcon}>{icon}</Text>
      <Text style={ccS.metricLabel}>{label}</Text>
      <Text style={[ccS.metricValue, { color }]}>{value}</Text>
      {sub ? <Text style={ccS.metricSub}>{sub}</Text> : null}
    </View>
  );
}

const ccS = StyleSheet.create({
  card:        { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  topRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  badge:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  badgeText:   { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  timeLabel:   { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBox:   { width: "30%", backgroundColor: Colors.bgSurface, borderRadius: 14, padding: 12, alignItems: "center", gap: 2, borderWidth: 1, borderColor: Colors.border, flexGrow: 1 },
  metricIcon:  { fontSize: 18 },
  metricLabel: { fontSize: 10, color: Colors.textSubtle, fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "800" },
  metricSub:   { fontSize: 10, color: Colors.textSubtle },
});

// ─── 메인 ─────────────────────────────────────────────────────────────────
export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const spot   = SPOT_META[id ?? ""];

  const [chartTab, setChartTab] = useState<"today" | "week">("today");
  const [todayHours, setTodayHours] = useState<HourData[]>([]);
  const [weekData,   setWeekData]   = useState<{ labels: string[]; wave: number[]; temp: number[]; wind: number[] } | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [currentH] = useState(new Date().getHours());

  useEffect(() => {
    if (!spot) return;
    (async () => {
      try {
        const [marineRes, weatherRes] = await Promise.all([
          axios.get(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}` +
            `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature` +
            `&timezone=Asia%2FSeoul&forecast_days=7`,
          ),
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}` +
            `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation_probability,uv_index,cloud_cover` +
            `&timezone=Asia%2FSeoul&forecast_days=7`,
          ),
        ]);

        const m = marineRes.data.hourly;
        const w = weatherRes.data.hourly;
        const times: string[] = m.time;
        const todayStr = new Date().toISOString().split("T")[0];

        // 오늘 24시간
        const todayIdxs = times.reduce<number[]>((a, t, i) => { if (t.startsWith(todayStr)) a.push(i); return a; }, []);
        const hours: HourData[] = todayIdxs.map(i => ({
          time: times[i],
          hour: new Date(times[i]).getHours(),
          waveHeight:   m.wave_height[i]  ?? 0,
          waveDirection:m.wave_direction[i]?? 0,
          wavePeriod:   m.wave_period[i]  ?? 0,
          swellHeight:  m.swell_wave_height[i] ?? 0,
          swellPeriod:  m.swell_wave_period[i] ?? 0,
          waterTemp:    m.sea_surface_temperature[i] ?? 0,
          windSpeed:    w.wind_speed_10m[i] ?? 0,
          windDirection:w.wind_direction_10m[i] ?? 0,
          windGusts:    w.wind_gusts_10m[i] ?? 0,
          airTemp:      w.temperature_2m[i] ?? 0,
          precipitation:w.precipitation_probability[i] ?? 0,
          uvIndex:      w.uv_index[i] ?? 0,
          cloudCover:   w.cloud_cover[i] ?? 0,
        }));
        setTodayHours(hours);

        // 주간 일평균
        const days: Record<string, { wave: number[]; temp: number[]; wind: number[] }> = {};
        times.forEach((t, i) => {
          const d = t.split("T")[0];
          if (!days[d]) days[d] = { wave: [], temp: [], wind: [] };
          if (m.wave_height[i]  != null) days[d].wave.push(m.wave_height[i]);
          if (m.sea_surface_temperature[i] != null) days[d].temp.push(m.sea_surface_temperature[i]);
          if (w.wind_speed_10m[i] != null) days[d].wind.push(w.wind_speed_10m[i]);
        });
        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
        const dn  = ["일", "월", "화", "수", "목", "금", "토"];
        const wkE = Object.entries(days).slice(0, 7);
        setWeekData({
          labels: wkE.map(([d]) => dn[new Date(d).getDay()]),
          wave:   wkE.map(([, v]) => avg(v.wave)),
          temp:   wkE.map(([, v]) => avg(v.temp)),
          wind:   wkE.map(([, v]) => avg(v.wind)),
        });
      } catch (_) {
        // 오류 시 임의값
        const mockH: HourData[] = Array.from({ length: 24 }, (_, i) => ({
          time: "", hour: i,
          waveHeight: parseFloat((Math.random() * 1.5 + 0.3).toFixed(2)),
          waveDirection: Math.floor(Math.random() * 360),
          wavePeriod: parseFloat((Math.random() * 5 + 5).toFixed(1)),
          swellHeight: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)),
          swellPeriod: parseFloat((Math.random() * 4 + 6).toFixed(1)),
          waterTemp: parseFloat((Math.random() * 4 + 19).toFixed(1)),
          windSpeed: parseFloat((Math.random() * 20 + 5).toFixed(1)),
          windDirection: Math.floor(Math.random() * 360),
          windGusts: parseFloat((Math.random() * 10 + 10).toFixed(1)),
          airTemp: parseFloat((Math.random() * 6 + 20).toFixed(1)),
          precipitation: Math.floor(Math.random() * 30),
          uvIndex: parseFloat((Math.random() * 8).toFixed(1)),
          cloudCover: Math.floor(Math.random() * 80),
        }));
        setTodayHours(mockH);
        const dn = ["일", "월", "화", "수", "목", "금", "토"];
        setWeekData({
          labels: Array.from({ length: 7 }, (_, i) => dn[(new Date().getDay() + i) % 7]),
          wave: Array.from({ length: 7 }, () => parseFloat((Math.random() * 1.5 + 0.3).toFixed(2))),
          temp: Array.from({ length: 7 }, () => parseFloat((Math.random() * 4 + 19).toFixed(1))),
          wind: Array.from({ length: 7 }, () => parseFloat((Math.random() * 20 + 5).toFixed(1))),
        });
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  if (!spot) {
    return <SafeAreaView style={s.safe}><Text style={{ color: Colors.text, textAlign: "center", marginTop: 40 }}>스팟 정보 없음</Text></SafeAreaView>;
  }

  const curHour = todayHours.find(h => h.hour === currentH) ?? todayHours[0];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* 사진 헤더 */}
        <View style={s.photoWrap}>
          <Image source={{ uri: spot.photo }} style={s.photo} resizeMode="cover" />
          <View style={s.photoOverlay} />
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.photoInfo}>
            <Text style={s.photoEmoji}>{spot.emoji}</Text>
            <Text style={s.photoName}>{spot.name}</Text>
            <Text style={s.photoRegion}>{spot.region}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* 지도 */}
          <Text style={s.sectionTitle}>📍 위치</Text>
          <View style={{ marginBottom: 20 }}>
            <MapView lat={spot.lat} lon={spot.lon} name={spot.name} />
          </View>

          {/* 현재 상태 요약 */}
          {!fetching && curHour && <CurrentCard cur={curHour} />}

          {/* 차트 탭 */}
          <Text style={s.sectionTitle}>📊 파도 데이터</Text>
          <View style={s.tabRow}>
            {(["today", "week"] as const).map(t => (
              <TouchableOpacity key={t} style={[s.tabBtn, chartTab === t && s.tabBtnActive]} onPress={() => setChartTab(t)}>
                <Text style={[s.tabBtnText, chartTab === t && s.tabBtnTextActive]}>{t === "today" ? "오늘 (1시간)" : "이번 주"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {fetching ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={s.loadingText}>데이터 불러오는 중...</Text>
            </View>
          ) : chartTab === "today" ? (
            todayHours.length > 0 && <HourlyTable hours={todayHours} currentH={currentH} />
          ) : weekData ? (
            <View style={wS.card}>
              <View style={wS.row}>
                <Waves size={14} color={Colors.primary} />
                <Text style={[wS.rowLabel, { color: Colors.primary }]}>파고 (m)</Text>
              </View>
              <WeekBarChart values={weekData.wave} color={Colors.primary} unit="m" labels={weekData.labels} max={3} />
              <View style={[wS.row, { marginTop: 20 }]}>
                <Thermometer size={14} color={Colors.accent} />
                <Text style={[wS.rowLabel, { color: Colors.accent }]}>수온 (°C)</Text>
              </View>
              <WeekBarChart values={weekData.temp} color={Colors.accent} unit="°C" labels={weekData.labels} max={30} />
              <View style={[wS.row, { marginTop: 20 }]}>
                <Wind size={14} color="#94A3B8" />
                <Text style={[wS.rowLabel, { color: Colors.textMuted }]}>풍속 (km/h)</Text>
              </View>
              <WeekBarChart values={weekData.wind} color={Colors.warning} unit="km/h" labels={weekData.labels} max={50} />
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 24 },
  body:    { paddingHorizontal: 20, paddingTop: 20 },

  photoWrap:    { height: 220, position: "relative" },
  photo:        { width: "100%", height: "100%" },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  backBtn:      { position: "absolute", top: 16, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  photoInfo:    { position: "absolute", bottom: 18, left: 20 },
  photoEmoji:   { fontSize: 26, marginBottom: 4 },
  photoName:    { color: "#fff", fontSize: 22, fontWeight: "800" },
  photoRegion:  { color: "rgba(255,255,255,0.8)", fontSize: 13 },

  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: "800", marginBottom: 12 },
  tabRow:       { flexDirection: "row", gap: 8, marginBottom: 14 },
  tabBtn:       { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", backgroundColor: Colors.bgSurface },
  tabBtnActive: { borderColor: Colors.primary, backgroundColor: "rgba(14,165,233,0.12)" },
  tabBtnText:   { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
  tabBtnTextActive: { color: Colors.primary },

  loadingBox:  { alignItems: "center", gap: 10, paddingVertical: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
});

const wS = StyleSheet.create({
  card:     { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  row:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  rowLabel: { fontSize: 13, fontWeight: "700" },
});
