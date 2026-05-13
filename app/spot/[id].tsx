import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Thermometer, Waves, Wind } from "lucide-react-native";
import React, { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

// ─── 스팟 메타데이터 ───────────────────────────────────────────────────────
const SPOT_META: Record<string, {
  name: string; region: string;
  lat: number; lon: number;
  apiLat: number; apiLon: number;
  emoji: string; photo: string; cameraIds?: string[];
}> = {
  songjeong: {
    name: "송정 해수욕장", region: "부산 해운대구",
    lat: 35.1786, lon: 129.2075,
    apiLat: 35.1718, apiLon: 129.2218,
    emoji: "🐚",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
    cameraIds: ["tQ9tse8cTy4", "ACK9lGbi2m0"],
  },
  haeundae: {
    name: "해운대 해수욕장", region: "부산 해운대구",
    lat: 35.1588, lon: 129.1604,
    apiLat: 35.1466, apiLon: 129.1674,
    emoji: "🏖️",
    photo: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
    cameraIds: ["olQi21eGcwQ"],
  },
  dadaepo: {
    name: "다대포 해수욕장", region: "부산 사하구",
    lat: 35.0476, lon: 128.9610,
    apiLat: 35.0365, apiLon: 128.9515,
    emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=900&q=80",
  },
  gwanganri: {
    name: "광안리 해수욕장", region: "부산 수영구",
    lat: 35.1530, lon: 129.1185,
    apiLat: 35.1395, apiLon: 129.1185,
    emoji: "🌉",
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
    cameraIds: ["jmVmZlsQIL8"],
  },
};

const SPOT_CONFIG: Record<string, { aspect: number; swellWindow: [number, number]; shelterFactor: number }> = {
  songjeong: { aspect: 120, swellWindow: [55,  205], shelterFactor: 0.95 },
  haeundae:  { aspect: 155, swellWindow: [100, 220], shelterFactor: 0.80 },
  dadaepo:   { aspect: 215, swellWindow: [155, 270], shelterFactor: 0.75 },
  gwanganri: { aspect: 180, swellWindow: [145, 215], shelterFactor: 0.35 },
};

function swellEff(waveDir: number, win: [number, number]): number {
  const a = ((waveDir % 360) + 360) % 360;
  const inWin = win[0] <= win[1] ? a >= win[0] && a <= win[1] : a >= win[0] || a <= win[1];
  if (inWin) return 1.0;
  const d = Math.min(
    Math.abs(((a - win[0] + 540) % 360) - 180),
    Math.abs(((a - win[1] + 540) % 360) - 180),
  );
  if (d < 25) return 0.60;
  if (d < 50) return 0.30;
  return 0.10;
}

function getWindQuality(windDir: number, aspect: number): { label: string; color: string } {
  const offshore = (aspect + 180) % 360;
  const diff = Math.abs(((windDir - offshore + 540) % 360) - 180);
  if (diff < 40)  return { label: "오프쇼어 ✦", color: "#10B981" };
  if (diff < 80)  return { label: "크로스오프",  color: "#22C55E" };
  if (diff < 115) return { label: "크로스",      color: "#EAB308" };
  if (diff < 150) return { label: "크로스온",    color: "#F97316" };
  return            { label: "온쇼어",          color: "#EF4444" };
}

interface HourData {
  time: string; hour: number;
  waveHeight: number; waveDirection: number; wavePeriod: number;
  swellHeight: number; swellPeriod: number; waterTemp: number;
  windSpeed: number; windDirection: number; windGusts: number;
  airTemp: number; precipitation: number; uvIndex: number; cloudCover: number;
  weatherCode: number;
}
interface DayDetail {
  label: string; date: string;
  wave: number; waveDir: number; wavePeriod: number;
  temp: number; wind: number; windDir: number;
  airTemp: number; precip: number; weatherCode: number;
}

const WMO: Record<number, { text: string; emoji: string }> = {
  0: { text: "맑음", emoji: "☀️" }, 1: { text: "대체로맑음", emoji: "🌤" },
  2: { text: "부분구름", emoji: "⛅" }, 3: { text: "흐림", emoji: "☁️" },
  45: { text: "안개", emoji: "🌫" }, 48: { text: "짙은안개", emoji: "🌫" },
  51: { text: "가랑비", emoji: "🌦" }, 53: { text: "보슬비", emoji: "🌦" },
  55: { text: "이슬비", emoji: "🌧" }, 61: { text: "약한비", emoji: "🌧" },
  63: { text: "비", emoji: "🌧" }, 65: { text: "강한비", emoji: "⛈" },
  71: { text: "약한눈", emoji: "🌨" }, 73: { text: "눈", emoji: "❄️" },
  75: { text: "강한눈", emoji: "❄️" }, 80: { text: "소나기", emoji: "🌦" },
  81: { text: "소나기", emoji: "🌧" }, 82: { text: "강한소나기", emoji: "⛈" },
  95: { text: "뇌우", emoji: "⛈" }, 99: { text: "강한뇌우", emoji: "⛈" },
};
const getWeather = (code: number) => WMO[code] ?? { text: "알수없음", emoji: "🌈" };

const waveColor = (h: number, C: ThemeColors) =>
  h < 0.5 ? C.textSubtle : h < 1.0 ? "#22C55E" : h < 1.8 ? C.primary : h < 2.5 ? "#F97316" : "#EF4444";
const waveBg = (h: number) =>
  h < 0.5 ? "rgba(100,116,139,0.15)" : h < 1.0 ? "rgba(34,197,94,0.18)" : h < 1.8 ? "rgba(14,165,233,0.2)" : h < 2.5 ? "rgba(249,115,22,0.22)" : "rgba(239,68,68,0.22)";
const windColor = (w: number) =>
  w < 10 ? "#22C55E" : w < 20 ? "#EAB308" : w < 40 ? "#F97316" : "#EF4444";
const windBg = (w: number) =>
  w < 10 ? "rgba(34,197,94,0.15)" : w < 20 ? "rgba(234,179,8,0.18)" : w < 40 ? "rgba(249,115,22,0.2)" : "rgba(239,68,68,0.2)";
const tempColor = (t: number, C: ThemeColors) =>
  t < 15 ? "#60A5FA" : t < 20 ? C.primary : t < 25 ? "#22C55E" : "#F97316";
const tempBg = (t: number) =>
  t < 15 ? "rgba(96,165,250,0.2)" : t < 20 ? "rgba(14,165,233,0.15)" : t < 25 ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.18)";

const windArrow = (deg: number) => ["↓","↙","←","↖","↑","↗","→","↘"][Math.round(deg / 45) % 8];
const dirLabel  = (deg: number) => ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];
const waveLabel = (h: number) => h < 0.5 ? "FLAT" : h < 1.0 ? "SMALL" : h < 1.8 ? "GOOD" : h < 2.5 ? "SOLID" : "EPIC";

function calcMulttae(date: Date, C: ThemeColors) {
  const refNewMoon = new Date("2024-01-11T00:00:00Z").getTime();
  const lunarPeriod = 29.53058867 * 24 * 3600 * 1000;
  let phase = ((date.getTime() - refNewMoon) % lunarPeriod) / lunarPeriod;
  if (phase < 0) phase += 1;
  const ld = Math.floor(phase * 29.53) + 1;
  let m = ld === 8 || ld === 23 ? 0
        : ld > 8 && ld < 23     ? ld - 8
        : ld > 23               ? ld - 23
        : ld + 6;
  const label = m === 0 ? "조금" : `${m}물`;
  const desc  = m === 0 ? "조류 가장 약함" : m <= 2 ? "약한 조류" : m <= 5 ? "조류 보통" : m <= 8 ? "조류 강함" : m === 9 ? "사리·강한 조류" : m <= 12 ? "조류 강함" : "조류 약해짐";
  const color = m === 0 ? C.success : m <= 3 ? C.primary : m <= 6 ? "#EAB308" : "#F97316";
  return { number: m, label, desc, color };
}

async function fetchAiRec(spotName: string, cur: HourData, multtaeLabel: string): Promise<string> {
  const cacheKey = `glassy_ai_${spotName}_${new Date().toISOString().split("T")[0]}`;
  try { const c = await AsyncStorage.getItem(cacheKey); if (c) return c; } catch (_) {}
  const prompt =
    `서핑코치. 3줄만(이모지포함).\n` +
    `${spotName} 파고${cur.waveHeight.toFixed(1)}m 파주기${cur.wavePeriod.toFixed(0)}s ` +
    `풍속${cur.windSpeed.toFixed(0)}km/h 수온${cur.waterTemp.toFixed(0)}°C 물때${multtaeLabel}\n` +
    `1)적합레벨 2)슈트두께 3)보드추천`;
  try {
    const ai = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: { maxOutputTokens: 400 },
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = result.response.text().trim();
    AsyncStorage.setItem(cacheKey, text).catch(() => {});
    return text;
  } catch (e: any) {
    return `AI 추천 불가 (${e?.message ?? "오류"})`;
  }
}

// ─── 라이브 카메라 ────────────────────────────────────────────────────────
function LiveCamera({ cameraId, name }: { cameraId: string; name: string }) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const videoH = Math.round((width - 32) * 9 / 16);

  const embedUrl = `https://www.youtube.com/embed/${cameraId}?autoplay=1&mute=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3`;

  const openInYouTube = async () => {
    const appUrl = Platform.OS === "ios" ? `youtube://${cameraId}` : `vnd.youtube://${cameraId}`;
    const webUrl = `https://www.youtube.com/watch?v=${cameraId}`;
    try { await Linking.openURL(appUrl); }
    catch { await Linking.openURL(webUrl); }
  };

  if (Platform.OS === "web") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const webEmbedUrl = `${embedUrl}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;
    const MASK = "#050B14";
    return createElement("div",
      { style: { position: "relative", overflow: "hidden", borderRadius: 14, border: `1px solid ${C.border}` } },
      createElement("div",
        { style: { position: "relative", paddingTop: "56.25%" } },
        createElement("iframe", {
          src: webEmbedUrl,
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" },
          allow: "autoplay; encrypted-media; fullscreen",
          allowFullscreen: true,
          title: `${name} 라이브 카메라`,
        }),
      ),
      createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 62, backgroundColor: MASK } }),
      createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: 52, backgroundColor: MASK } }),
    );
  }

  if (embedBlocked) {
    return (
      <View style={{ height: videoH, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.bgSurface, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }}>
        <Text style={{ fontSize: 38 }}>📹</Text>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>{name} 라이브</Text>
          <Text style={{ color: C.textSubtle, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            실시간 영상은 YouTube 앱에서{"\n"}확인할 수 있어요
          </Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FF0000", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          onPress={openInYouTube}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>▶  YouTube에서 보기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ height: videoH, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: "#000" }}>
      <WebView
        source={{ uri: embedUrl, headers: { Referer: "https://www.youtube.com" } }}
        style={{ flex: 1, backgroundColor: "#000" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        originWhitelist={["*"]}
        mixedContentMode="always"
        onHttpError={(e) => { if (e.nativeEvent.statusCode >= 400) setEmbedBlocked(true); }}
        onError={() => setEmbedBlocked(true)}
      />
    </View>
  );
}

// ─── 지도 ─────────────────────────────────────────────────────────────────
function MapView({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const { colors: C } = useTheme();
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.025}%2C${lat - 0.015}%2C${lon + 0.025}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lon}`;
  if (Platform.OS === "web") {
    return createElement("div",
      { style: { height: 170, overflow: "hidden", borderRadius: 14, border: `1px solid ${C.border}` } },
      createElement("iframe", { src, style: { width: "100%", height: 202, border: "none" }, loading: "lazy", title: name }),
    );
  }
  return (
    <View style={{ padding: 18, alignItems: "center", gap: 4, backgroundColor: C.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>{lat.toFixed(4)}, {lon.toFixed(4)}</Text>
      <Text style={{ color: C.textMuted, fontSize: 12 }}>{name}</Text>
    </View>
  );
}

// ─── 간단 모드 카드 ───────────────────────────────────────────────────────
function SimpleCard({ cur, mt, aiRec, aiLoading, spotId }: {
  cur: HourData;
  mt: { number: number; label: string; desc: string; color: string } | null;
  aiRec: string;
  aiLoading: boolean;
  spotId: string;
}) {
  const { colors: C } = useTheme();
  const siS = useMemo(() => makeSimpleS(C), [C]);
  const wea = getWeather(cur.weatherCode);
  const cfg = SPOT_CONFIG[spotId];
  const wq  = cfg ? getWindQuality(cur.windDirection, cfg.aspect) : null;
  return (
    <View style={siS.wrap}>
      <View style={siS.header}>
        <View style={[siS.headerBlock, { backgroundColor: waveBg(cur.waveHeight) }]}>
          <Text style={[siS.waveNum, { color: waveColor(cur.waveHeight, C) }]}>
            {cur.waveHeight.toFixed(1)}<Text style={siS.waveUnit}>m</Text>
          </Text>
          <Text style={[siS.waveLbl, { color: waveColor(cur.waveHeight, C) }]}>{waveLabel(cur.waveHeight)}</Text>
        </View>
        <View style={[siS.headerBlock, { backgroundColor: C.bgSurface }]}>
          <Text style={siS.weatherEmoji}>{wea.emoji}</Text>
          <Text style={siS.weatherTxt}>{wea.text}</Text>
        </View>
        <View style={[siS.headerBlock, { backgroundColor: C.bgSurface }]}>
          <Text style={siS.timeNum}>{cur.hour}시</Text>
          <Text style={siS.timeSub}>기준</Text>
        </View>
      </View>
      {wq && (
        <View style={[siS.wqBadge, { borderColor: wq.color, backgroundColor: `${wq.color}18` }]}>
          <Wind size={13} color={wq.color} />
          <Text style={[siS.wqTxt, { color: wq.color }]}>{wq.label}</Text>
        </View>
      )}
      <View style={siS.grid}>
        <SiMetric emoji="💨" label="풍향·풍속"
          value={`${dirLabel(cur.windDirection)} ${windArrow(cur.windDirection)} ${cur.windSpeed.toFixed(0)}km/h`}
          color={windColor(cur.windSpeed)} C={C} />
        <SiMetric emoji="🌡" label="기온 / 수온"
          value={`${cur.airTemp.toFixed(0)}°C / ${cur.waterTemp.toFixed(0)}°C`}
          color={tempColor(cur.waterTemp, C)} C={C} />
        <SiMetric emoji="🌊" label="파향·파주기"
          value={`${dirLabel(cur.waveDirection)} / ${cur.wavePeriod.toFixed(0)}s`} C={C} />
        <SiMetric emoji="🌙" label={`물때 ${mt?.label ?? "-"}`}
          value={mt?.desc ?? "-"} color={mt?.color} C={C} />
      </View>
      <View style={siS.aiRow}>
        <Text style={siS.aiIcon}>✨</Text>
        {aiLoading
          ? <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 4 }} />
          : <Text style={siS.aiText} numberOfLines={4}>{aiRec || "AI 추천 불러오는 중..."}</Text>
        }
      </View>
    </View>
  );
}

function SiMetric({ emoji, label, value, color, C }: { emoji: string; label: string; value: string; color?: string; C: ThemeColors }) {
  const siS = useMemo(() => makeSimpleS(C), [C]);
  return (
    <View style={siS.metric}>
      <Text style={siS.mEmoji}>{emoji}</Text>
      <Text style={siS.mLabel}>{label}</Text>
      <Text style={[siS.mValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function makeSimpleS(C: ThemeColors) {
  return StyleSheet.create({
    wrap:        { gap: 10 },
    header:      { flexDirection: "row", gap: 8 },
    headerBlock: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: C.border },
    waveNum:     { fontSize: 26, fontWeight: "800", lineHeight: 32 },
    waveUnit:    { fontSize: 14, fontWeight: "700" },
    waveLbl:     { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    weatherEmoji:{ fontSize: 26 },
    weatherTxt:  { color: C.text, fontSize: 11, fontWeight: "700", textAlign: "center" },
    timeNum:     { color: C.text, fontSize: 22, fontWeight: "800" },
    timeSub:     { color: C.textSubtle, fontSize: 12, fontWeight: "600" },
    wqBadge:     { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
    wqTxt:       { fontSize: 13, fontWeight: "800" },
    grid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metric:      { flex: 1, minWidth: "47%", backgroundColor: C.bgSurface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: C.border },
    mEmoji:      { fontSize: 18 },
    mLabel:      { color: C.textSubtle, fontSize: 11, fontWeight: "700" },
    mValue:      { color: C.text, fontSize: 14, fontWeight: "800" },
    aiRow:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(14,165,233,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(14,165,233,0.2)" },
    aiIcon:      { fontSize: 15, marginTop: 1 },
    aiText:      { flex: 1, color: C.text, fontSize: 13, lineHeight: 20 },
  });
}

// ─── 상세 모드 카드 ───────────────────────────────────────────────────────
function DetailCard({ cur, mt, lastUpdate }: {
  cur: HourData;
  mt: { number: number; label: string; desc: string; color: string } | null;
  lastUpdate: string;
}) {
  const { colors: C } = useTheme();
  const dtS = useMemo(() => makeDetailS(C), [C]);
  const wea = getWeather(cur.weatherCode);
  return (
    <View style={dtS.card}>
      <View style={dtS.titleRow}>
        <Text style={dtS.titleTime}>{cur.hour}시 기준</Text>
        {lastUpdate ? <Text style={dtS.titleUpdate}>갱신 {lastUpdate}</Text> : null}
        <Text style={{ fontSize: 22 }}>{wea.emoji}</Text>
      </View>
      <Text style={dtS.sec}>🌊 파도</Text>
      <View style={dtS.row3}>
        <DtItem label="파고" value={`${cur.waveHeight.toFixed(1)}m`} color={waveColor(cur.waveHeight, C)} C={C} />
        <DtItem label="파향" value={`${dirLabel(cur.waveDirection)} (${cur.waveDirection}°)`} C={C} />
        <DtItem label="파주기" value={`${cur.wavePeriod.toFixed(0)}s`} C={C} />
        <DtItem label="너울고" value={`${cur.swellHeight.toFixed(1)}m`} C={C} />
        <DtItem label="너울주기" value={`${cur.swellPeriod.toFixed(0)}s`} C={C} />
      </View>
      <View style={dtS.divider} />
      <Text style={dtS.sec}>💨 바람</Text>
      <View style={dtS.row3}>
        <DtItem label="풍향" value={`${dirLabel(cur.windDirection)} ${windArrow(cur.windDirection)}`} C={C} />
        <DtItem label="풍속" value={`${cur.windSpeed.toFixed(0)}km/h`} color={windColor(cur.windSpeed)} C={C} />
        <DtItem label="돌풍" value={`${cur.windGusts.toFixed(0)}km/h`} color={cur.windGusts > 40 ? "#EF4444" : undefined} C={C} />
      </View>
      <View style={dtS.divider} />
      <Text style={dtS.sec}>🌡 기상</Text>
      <View style={dtS.row3}>
        <DtItem label="날씨" value={`${wea.emoji} ${wea.text}`} C={C} />
        <DtItem label="기온" value={`${cur.airTemp.toFixed(0)}°C`} C={C} />
        <DtItem label="수온" value={`${cur.waterTemp.toFixed(0)}°C`} color={tempColor(cur.waterTemp, C)} C={C} />
        <DtItem label="강수확률" value={`${cur.precipitation}%`} C={C} />
        <DtItem label="UV" value={`${cur.uvIndex.toFixed(0)}`} C={C} />
        <DtItem label="구름" value={`${cur.cloudCover}%`} C={C} />
      </View>
      {mt && (
        <>
          <View style={dtS.divider} />
          <Text style={dtS.sec}>🌙 물때</Text>
          <View style={[dtS.multtae, { borderColor: mt.color }]}>
            <Text style={[dtS.multtaeNum, { color: mt.color }]}>{mt.label}</Text>
            <Text style={[dtS.multtaeDesc, { color: mt.color }]}>{mt.desc}</Text>
            <View style={dtS.bar}>
              {Array.from({ length: 15 }, (_, i) => (
                <View key={i} style={[dtS.dot, {
                  backgroundColor: (mt.number === 0 && i === 0) || i + 1 === mt.number ? mt.color : C.border,
                  width:  (mt.number === 0 && i === 0) || i + 1 === mt.number ? 14 : 8,
                  height: (mt.number === 0 && i === 0) || i + 1 === mt.number ? 14 : 8,
                }]} />
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function DtItem({ label, value, color, C }: { label: string; value: string; color?: string; C: ThemeColors }) {
  const dtS = useMemo(() => makeDetailS(C), [C]);
  return (
    <View style={dtS.item}>
      <Text style={dtS.itemLabel}>{label}</Text>
      <Text style={[dtS.itemValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function makeDetailS(C: ThemeColors) {
  return StyleSheet.create({
    card:       { backgroundColor: C.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
    titleRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
    titleTime:  { color: C.text, fontSize: 15, fontWeight: "800", flex: 1 },
    titleUpdate:{ color: C.textSubtle, fontSize: 11 },
    sec:        { color: C.textMuted, fontSize: 12, fontWeight: "800" },
    divider:    { height: 1, backgroundColor: C.border },
    row3:       { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    item:       { minWidth: "30%", flex: 1, backgroundColor: C.bgSurface, borderRadius: 10, padding: 10, gap: 2, borderWidth: 1, borderColor: C.border },
    itemLabel:  { color: C.textSubtle, fontSize: 10, fontWeight: "600" },
    itemValue:  { color: C.text, fontSize: 13, fontWeight: "700" },
    multtae:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: C.bgSurface, flexWrap: "wrap" },
    multtaeNum: { fontSize: 18, fontWeight: "800" },
    multtaeDesc:{ fontSize: 12, fontWeight: "600", flex: 1 },
    bar:        { flexDirection: "row", alignItems: "center", gap: 4 },
    dot:        { borderRadius: 10 },
  });
}

// ─── 시간별 테이블 ────────────────────────────────────────────────────────
const COL_W = 72;
const ROW_H = { time: 44, main: 70, sub: 50 };
const LABEL_W = 74;

function HourlyTable({ hours, currentH }: { hours: HourData[]; currentH: number }) {
  const { colors: C } = useTheme();
  const tS = useMemo(() => makeTableS(C), [C]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!scrollRef.current || !hours.length) return;
    const idx = hours.findIndex(h => h.hour === currentH);
    const x = Math.max(0, idx - 1) * COL_W;
    setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 100);
  }, [hours, currentH]);

  return (
    <View style={[tS.wrap, { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border }]}>
      <View style={{ flexDirection: "row", backgroundColor: C.bgSurface }}>
        <View style={{ width: LABEL_W, borderRightWidth: 1, borderRightColor: C.border }}>
          {([
            { label: "시각",     icon: null,                                           h: ROW_H.time },
            { label: "파고",     icon: <Waves size={14} color={C.primary} />,         h: ROW_H.main },
            { label: "주기·너울", icon: null,                                           h: ROW_H.sub },
            { label: "수온",     icon: <Thermometer size={14} color={C.accent} />,    h: ROW_H.main },
            { label: "풍속",     icon: <Wind size={14} color={C.textMuted} />,        h: ROW_H.main },
            { label: "강수·UV",  icon: null,                                           h: ROW_H.sub },
          ] as const).map((row, ri) => (
            <View key={ri} style={[tS.labelCell, { height: row.h, borderTopWidth: ri === 0 ? 0 : 1, borderTopColor: C.border }]}>
              {row.icon}
              <Text style={tS.labelTxt}>{row.label}</Text>
            </View>
          ))}
        </View>
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View>
            <View style={{ flexDirection: "row" }}>
              {hours.map((h, i) => {
                const now = h.hour === currentH;
                return (
                  <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.time, backgroundColor: now ? "rgba(14,165,233,0.18)" : "transparent", borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                    <Text style={{ fontSize: 14, fontWeight: now ? "800" : "600", color: now ? C.primary : C.textMuted }}>{h.hour}시</Text>
                    {now && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary }} />}
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: waveBg(h.waveHeight), borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: waveColor(h.waveHeight, C) }}>{h.waveHeight.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: waveColor(h.waveHeight, C), fontWeight: "700" }}>m</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.sub, borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                  <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: "700" }}>{h.wavePeriod.toFixed(0)}s</Text>
                  <Text style={{ fontSize: 13, color: C.textSubtle }}>{h.swellHeight.toFixed(1)}m</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: tempBg(h.waterTemp), borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: tempColor(h.waterTemp, C) }}>{h.waterTemp.toFixed(0)}</Text>
                  <Text style={{ fontSize: 12, color: tempColor(h.waterTemp, C), fontWeight: "700" }}>°C</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.main, backgroundColor: windBg(h.windSpeed), borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: windColor(h.windSpeed) }}>{windArrow(h.windDirection)}{h.windSpeed.toFixed(0)}</Text>
                  <Text style={{ fontSize: 12, color: windColor(h.windSpeed) }}>km/h</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
              {hours.map((h, i) => (
                <View key={i} style={[tS.cell, { width: COL_W, height: ROW_H.sub, borderLeftWidth: i ? 0.5 : 0, borderLeftColor: C.border }]}>
                  <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: "700" }}>☔{h.precipitation}%</Text>
                  <Text style={{ fontSize: 13, color: C.textSubtle }}>UV{h.uvIndex.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function makeTableS(C: ThemeColors) {
  return StyleSheet.create({
    wrap:      { overflow: "hidden" },
    labelCell: { alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4 },
    labelTxt:  { fontSize: 11, fontWeight: "700", color: C.textMuted, textAlign: "center" },
    cell:      { alignItems: "center", justifyContent: "center" },
  });
}

// ─── 일별 예보 카드 ───────────────────────────────────────────────────────
function DayForecastCard({ day, onClose }: { day: DayDetail; onClose: () => void }) {
  const { colors: C } = useTheme();
  const dfS = useMemo(() => makeDfS(C), [C]);
  const wea = getWeather(day.weatherCode);
  return (
    <View style={dfS.card}>
      <View style={dfS.header}>
        <View style={[dfS.block, { backgroundColor: waveBg(day.wave) }]}>
          <Text style={[dfS.waveNum, { color: waveColor(day.wave, C) }]}>
            {day.wave.toFixed(1)}<Text style={dfS.waveUnit}>m</Text>
          </Text>
          <Text style={[dfS.waveLbl, { color: waveColor(day.wave, C) }]}>{waveLabel(day.wave)}</Text>
        </View>
        <View style={[dfS.block, { backgroundColor: C.bgSurface }]}>
          <Text style={dfS.weatherEmoji}>{wea.emoji}</Text>
          <Text style={dfS.weatherTxt}>{wea.text}</Text>
        </View>
        <View style={[dfS.block, { backgroundColor: C.bgSurface }]}>
          <Text style={dfS.dayNum}>{day.label}</Text>
          <Text style={dfS.dayDate}>{day.date ? day.date.slice(5).replace("-", "/") : "예보"}</Text>
        </View>
      </View>
      <View style={dfS.grid}>
        <DfMetric emoji="💨" label="풍향·풍속"
          value={`${dirLabel(day.windDir)} ${windArrow(day.windDir)} ${day.wind.toFixed(0)}km/h`}
          color={windColor(day.wind)} C={C} />
        <DfMetric emoji="🌡" label="기온 / 수온"
          value={`${day.airTemp.toFixed(0)}°C / ${day.temp.toFixed(0)}°C`}
          color={tempColor(day.temp, C)} C={C} />
        <DfMetric emoji="🌊" label="파향·파주기"
          value={`${dirLabel(day.waveDir)} / ${day.wavePeriod.toFixed(0)}s`} C={C} />
        <DfMetric emoji="☔" label="강수확률"
          value={`${day.precip.toFixed(0)}%`}
          color={day.precip > 50 ? "#60A5FA" : C.textMuted} C={C} />
      </View>
      <TouchableOpacity style={dfS.closeBtn} onPress={onClose}>
        <Text style={dfS.closeTxt}>닫기 ✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function DfMetric({ emoji, label, value, color, C }: { emoji: string; label: string; value: string; color?: string; C: ThemeColors }) {
  const dfS = useMemo(() => makeDfS(C), [C]);
  return (
    <View style={dfS.metric}>
      <Text style={dfS.mEmoji}>{emoji}</Text>
      <Text style={dfS.mLabel}>{label}</Text>
      <Text style={[dfS.mValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function makeDfS(C: ThemeColors) {
  return StyleSheet.create({
    card:        { backgroundColor: C.bgCard, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.primary, gap: 10, marginTop: 14 },
    header:      { flexDirection: "row", gap: 8 },
    block:       { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 3, borderWidth: 1, borderColor: C.border },
    waveNum:     { fontSize: 28, fontWeight: "800", lineHeight: 34 },
    waveUnit:    { fontSize: 14, fontWeight: "700" },
    waveLbl:     { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    weatherEmoji:{ fontSize: 28 },
    weatherTxt:  { color: C.text, fontSize: 11, fontWeight: "700", textAlign: "center" },
    dayNum:      { color: C.text, fontSize: 22, fontWeight: "800" },
    dayDate:     { color: C.textSubtle, fontSize: 11, fontWeight: "600" },
    grid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metric:      { flex: 1, minWidth: "47%", backgroundColor: C.bgSurface, borderRadius: 12, padding: 12, gap: 3, borderWidth: 1, borderColor: C.border },
    mEmoji:      { fontSize: 16 },
    mLabel:      { color: C.textSubtle, fontSize: 10, fontWeight: "700" },
    mValue:      { color: C.text, fontSize: 13, fontWeight: "800" },
    closeBtn:    { alignSelf: "center", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    closeTxt:    { color: C.textMuted, fontSize: 12, fontWeight: "700" },
  });
}

// ─── 주간 바차트 ──────────────────────────────────────────────────────────
function WeekBarChart({ values, color, labels, max: maxProp, onBarPress, selectedIdx }: {
  values: number[]; color: string; labels: string[]; max?: number;
  onBarPress?: (i: number) => void; selectedIdx?: number | null;
}) {
  const { colors: C } = useTheme();
  const H = 100;
  const max = maxProp ?? Math.max(...values.filter(v => v > 0), 1);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: H, gap: 6, marginBottom: 6 }}>
        {values.map((v, i) => {
          const isSelected = selectedIdx === i;
          return (
            <TouchableOpacity
              key={i}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: H }}
              onPress={() => onBarPress?.(i)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, color: isSelected ? "#fff" : color, fontWeight: "800", marginBottom: 4 }}>{v.toFixed(1)}</Text>
              <View style={{
                width: "100%",
                height: Math.max(4, (v / max) * (H - 28)),
                backgroundColor: color,
                borderRadius: 6,
                opacity: isSelected ? 1 : 0.65,
                borderWidth: isSelected ? 2 : 0,
                borderColor: "#fff",
              }} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: "row" }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 13, color: selectedIdx === i ? C.primary : C.textSubtle, fontWeight: selectedIdx === i ? "800" : "700" }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────
export default function SpotDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { colors: C } = useTheme();
  const s  = useMemo(() => makeMainS(C), [C]);
  const wS = useMemo(() => makeWeekS(C), [C]);
  const spot = SPOT_META[id ?? ""];

  const [mainTab,     setMainTab]    = useState<"today" | "week">("today");
  const [dayMode,     setDayMode]    = useState<"simple" | "detail">("simple");
  const [todayHours,  setTodayHours] = useState<HourData[]>([]);
  const [weekData,    setWeekData]   = useState<{ labels: string[]; wave: number[]; temp: number[]; wind: number[]; details: DayDetail[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [fetching,    setFetching]   = useState(true);
  const [lastUpdate,  setLastUpdate] = useState("");
  const [aiRec,       setAiRec]      = useState("");
  const [aiLoading,   setAiLoading]  = useState(false);
  const [multtae,     setMulttae]    = useState<{ number: number; label: string; desc: string; color: string } | null>(null);
  const [mapOpen,     setMapOpen]    = useState(false);
  const [camOpen,     setCamOpen]    = useState(false);
  const [camView,     setCamView]    = useState(0);
  const [currentH]    = useState(new Date().getHours());

  useEffect(() => {
    if (!spot) return;
    (async () => {
      try {
        const [marineRes, weatherRes] = await Promise.all([
          axios.get(
            `https://marine-api.open-meteo.com/v1/marine` +
            `?latitude=${spot.apiLat}&longitude=${spot.apiLon}` +
            `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature` +
            `&timezone=Asia%2FSeoul&forecast_days=7`,
          ),
          axios.get(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${spot.lat}&longitude=${spot.lon}` +
            `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation_probability,uv_index,cloud_cover,weather_code` +
            `&timezone=Asia%2FSeoul&forecast_days=7`,
          ),
        ]);
        const m = marineRes.data.hourly;
        const w = weatherRes.data.hourly;
        const times: string[] = m.time;
        const todayStr = new Date().toISOString().split("T")[0];
        const now = new Date();
        setLastUpdate(`${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);

        const todayIdxs = times.reduce<number[]>((a, t, i) => { if (t.startsWith(todayStr)) a.push(i); return a; }, []);
        const hours: HourData[] = todayIdxs.map(i => ({
          time: times[i], hour: parseInt(times[i].split("T")[1]),
          waveHeight:    m.wave_height[i]              ?? 0,
          waveDirection: m.wave_direction[i]            ?? 0,
          wavePeriod:    m.wave_period[i]               ?? 0,
          swellHeight:   m.swell_wave_height[i]         ?? 0,
          swellPeriod:   m.swell_wave_period[i]         ?? 0,
          waterTemp:     m.sea_surface_temperature[i]   ?? 0,
          windSpeed:     w.wind_speed_10m[i]            ?? 0,
          windDirection: w.wind_direction_10m[i]        ?? 0,
          windGusts:     w.wind_gusts_10m[i]            ?? 0,
          airTemp:       w.temperature_2m[i]            ?? 0,
          precipitation: w.precipitation_probability[i] ?? 0,
          uvIndex:       w.uv_index[i]                  ?? 0,
          cloudCover:    w.cloud_cover[i]               ?? 0,
          weatherCode:   w.weather_code[i]              ?? 0,
        }));

        const cfg = SPOT_CONFIG[id ?? ""];
        const correctedHours = hours.map(h => {
          if (!cfg) return h;
          const eff = swellEff(h.waveDirection, cfg.swellWindow);
          const f   = cfg.shelterFactor * eff;
          return { ...h, waveHeight: parseFloat((h.waveHeight * f).toFixed(2)), swellHeight: parseFloat((h.swellHeight * f).toFixed(2)) };
        });
        setTodayHours(correctedHours);

        const mt = calcMulttae(new Date(), C);
        setMulttae(mt);

        const days: Record<string, { wave: number[]; waveDir: number[]; wavePeriod: number[]; temp: number[]; wind: number[]; windDir: number[]; airTemp: number[]; precip: number[]; weatherCodes: number[] }> = {};
        times.forEach((t, i) => {
          const d = t.split("T")[0];
          if (!days[d]) days[d] = { wave: [], waveDir: [], wavePeriod: [], temp: [], wind: [], windDir: [], airTemp: [], precip: [], weatherCodes: [] };
          const dd = days[d];
          if (m.wave_height[i]             != null) dd.wave.push(m.wave_height[i]);
          if (m.wave_direction[i]          != null) dd.waveDir.push(m.wave_direction[i]);
          if (m.wave_period[i]             != null) dd.wavePeriod.push(m.wave_period[i]);
          if (m.sea_surface_temperature[i] != null) dd.temp.push(m.sea_surface_temperature[i]);
          if (w.wind_speed_10m[i]          != null) dd.wind.push(w.wind_speed_10m[i]);
          if (w.wind_direction_10m[i]      != null) dd.windDir.push(w.wind_direction_10m[i]);
          if (w.temperature_2m[i]          != null) dd.airTemp.push(w.temperature_2m[i]);
          if (w.precipitation_probability[i] != null) dd.precip.push(w.precipitation_probability[i]);
          if (w.weather_code[i]            != null) dd.weatherCodes.push(w.weather_code[i]);
        });
        const avg  = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
        const mode = (arr: number[]) => {
          if (!arr.length) return 0;
          const f: Record<number, number> = {};
          arr.forEach(v => { f[v] = (f[v] ?? 0) + 1; });
          return Number(Object.entries(f).sort((a, b) => b[1] - a[1])[0][0]);
        };
        const dn  = ["일","월","화","수","목","금","토"];
        const wkE = Object.entries(days).slice(0, 7);
        setWeekData({
          labels:  wkE.map(([d]) => dn[new Date(d).getDay()]),
          wave: wkE.map(([, v]) => { const raw = avg(v.wave); const dir = avg(v.waveDir); return cfg ? parseFloat((raw * cfg.shelterFactor * swellEff(dir, cfg.swellWindow)).toFixed(2)) : raw; }),
          temp:    wkE.map(([, v]) => avg(v.temp)),
          wind:    wkE.map(([, v]) => avg(v.wind)),
          details: wkE.map(([date, v]) => {
            const rawWave = avg(v.wave); const wdir = avg(v.waveDir);
            const corrWave = cfg ? parseFloat((rawWave * cfg.shelterFactor * swellEff(wdir, cfg.swellWindow)).toFixed(2)) : rawWave;
            return {
              label: dn[new Date(date).getDay()], date,
              wave: corrWave, waveDir: wdir, wavePeriod: avg(v.wavePeriod),
              temp: avg(v.temp), wind: avg(v.wind), windDir: avg(v.windDir),
              airTemp: avg(v.airTemp), precip: avg(v.precip), weatherCode: mode(v.weatherCodes),
            };
          }),
        });

        const curIdx = hours.findIndex(h => h.hour === currentH);
        const curH   = hours[curIdx >= 0 ? curIdx : 0];
        if (curH) {
          setAiLoading(true);
          fetchAiRec(spot.name, curH, mt.label).then(setAiRec).finally(() => setAiLoading(false));
        }
      } catch (_) {
        const mt = calcMulttae(new Date(), C);
        setMulttae(mt);
        const mockH: HourData[] = Array.from({ length: 24 }, (_, i) => ({
          time: "", hour: i,
          waveHeight: parseFloat((Math.random() * 1.5 + 0.3).toFixed(2)),
          waveDirection: Math.floor(Math.random() * 360), wavePeriod: parseFloat((Math.random() * 5 + 5).toFixed(1)),
          swellHeight: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)), swellPeriod: parseFloat((Math.random() * 4 + 6).toFixed(1)),
          waterTemp: parseFloat((Math.random() * 4 + 19).toFixed(1)),
          windSpeed: parseFloat((Math.random() * 20 + 5).toFixed(1)), windDirection: Math.floor(Math.random() * 360),
          windGusts: parseFloat((Math.random() * 10 + 10).toFixed(1)), airTemp: parseFloat((Math.random() * 6 + 20).toFixed(1)),
          precipitation: Math.floor(Math.random() * 30), uvIndex: parseFloat((Math.random() * 8).toFixed(1)),
          cloudCover: Math.floor(Math.random() * 80), weatherCode: [0,1,2,3,61,80][Math.floor(Math.random() * 6)],
        }));
        setTodayHours(mockH);
        const dn2 = ["일","월","화","수","목","금","토"];
        setWeekData({
          labels:  Array.from({ length: 7 }, (_, i) => dn2[(new Date().getDay() + i) % 7]),
          wave:    Array.from({ length: 7 }, () => parseFloat((Math.random() * 1.5 + 0.3).toFixed(2))),
          temp:    Array.from({ length: 7 }, () => parseFloat((Math.random() * 4 + 19).toFixed(1))),
          wind:    Array.from({ length: 7 }, () => parseFloat((Math.random() * 20 + 5).toFixed(1))),
          details: Array.from({ length: 7 }, (_, i) => ({
            label: dn2[(new Date().getDay() + i) % 7], date: "",
            wave: parseFloat((Math.random() * 1.5 + 0.3).toFixed(2)), waveDir: Math.floor(Math.random() * 360), wavePeriod: parseFloat((Math.random() * 5 + 5).toFixed(1)),
            temp: parseFloat((Math.random() * 4 + 19).toFixed(1)), wind: parseFloat((Math.random() * 20 + 5).toFixed(1)), windDir: Math.floor(Math.random() * 360),
            airTemp: parseFloat((Math.random() * 6 + 20).toFixed(1)), precip: Math.floor(Math.random() * 40), weatherCode: [0,1,2,3,61,80][Math.floor(Math.random() * 6)],
          })),
        });
        setAiRec("API 연결 실패 — AI 추천을 불러오지 못했습니다.");
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  if (!spot) {
    return <SafeAreaView style={s.safe}><Text style={{ color: C.text, textAlign: "center", marginTop: 40 }}>스팟 정보 없음</Text></SafeAreaView>;
  }

  const curHour = todayHours.find(h => h.hour === currentH) ?? todayHours[0];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
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
        <View style={s.photoBtnRow}>
          <TouchableOpacity style={[s.photoBtn, mapOpen && s.photoBtnActive]} onPress={() => setMapOpen(v => !v)}>
            <Text style={s.photoBtnIcon}>📍</Text>
            <Text style={s.photoBtnTxt}>{mapOpen ? "닫기" : "지도"}</Text>
          </TouchableOpacity>
          {spot.cameraIds && spot.cameraIds.length > 0 && (
            <TouchableOpacity style={[s.photoBtn, camOpen && s.photoBtnActive]} onPress={() => { setCamOpen(v => !v); setCamView(0); }}>
              <Text style={s.photoBtnIcon}>📷</Text>
              <Text style={s.photoBtnTxt}>{camOpen ? "닫기" : "라이브"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {camOpen && spot.cameraIds && spot.cameraIds.length > 0 && (
        <View style={s.camWrap}>
          {spot.cameraIds.length > 1 && (
            <View style={s.camTabRow}>
              {spot.cameraIds.map((_, i) => (
                <TouchableOpacity key={i} style={[s.camTab, camView === i && s.camTabActive]} onPress={() => setCamView(i)}>
                  <Text style={[s.camTabTxt, camView === i && s.camTabTxtActive]}>뷰 {i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <LiveCamera cameraId={spot.cameraIds[camView]} name={spot.name} />
        </View>
      )}

      {mapOpen && (
        <View style={s.mapWrap}>
          <MapView lat={spot.lat} lon={spot.lon} name={spot.name} />
        </View>
      )}

      <View style={s.mainTabRow}>
        {(["today", "week"] as const).map(t => (
          <TouchableOpacity key={t} style={[s.mainTab, mainTab === t && s.mainTabActive]} onPress={() => setMainTab(t)}>
            <Text style={[s.mainTabTxt, mainTab === t && s.mainTabTxtActive]}>
              {t === "today" ? "오늘" : "이번 주"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {fetching ? (
          <View style={s.loading}>
            <ActivityIndicator color={C.primary} />
            <Text style={s.loadingTxt}>실시간 데이터 불러오는 중...</Text>
          </View>
        ) : mainTab === "today" ? (
          <>
            <View style={s.modeRow}>
              <TouchableOpacity style={[s.modePill, dayMode === "simple" && s.modePillActive]} onPress={() => setDayMode("simple")}>
                <Text style={[s.modePillTxt, dayMode === "simple" && s.modePillTxtActive]}>간단</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modePill, dayMode === "detail" && s.modePillActive]} onPress={() => setDayMode("detail")}>
                <Text style={[s.modePillTxt, dayMode === "detail" && s.modePillTxtActive]}>상세</Text>
              </TouchableOpacity>
            </View>
            {curHour && dayMode === "simple" ? (
              <SimpleCard cur={curHour} mt={multtae} aiRec={aiRec} aiLoading={aiLoading} spotId={id ?? ""} />
            ) : curHour ? (
              <>
                <DetailCard cur={curHour} mt={multtae} lastUpdate={lastUpdate} />
                <Text style={s.tableTitle}>시간별</Text>
                <HourlyTable hours={todayHours} currentH={currentH} />
              </>
            ) : null}
          </>
        ) : (
          weekData ? (
            <>
              <View style={wS.card}>
                <View style={wS.row}><Waves size={15} color={C.primary} /><Text style={[wS.lbl, { color: C.primary }]}>파고 (m)</Text></View>
                <WeekBarChart values={weekData.wave} color={C.primary} labels={weekData.labels} max={3}
                  onBarPress={i => setSelectedDay(prev => prev === i ? null : i)} selectedIdx={selectedDay} />
                <View style={[wS.row, { marginTop: 28 }]}><Thermometer size={15} color={C.accent} /><Text style={[wS.lbl, { color: C.accent }]}>수온 (°C)</Text></View>
                <WeekBarChart values={weekData.temp} color={C.accent} labels={weekData.labels} max={30}
                  onBarPress={i => setSelectedDay(prev => prev === i ? null : i)} selectedIdx={selectedDay} />
                <View style={[wS.row, { marginTop: 28 }]}><Wind size={15} color={C.textMuted} /><Text style={[wS.lbl, { color: C.textMuted }]}>풍속 (km/h)</Text></View>
                <WeekBarChart values={weekData.wind} color="#EAB308" labels={weekData.labels} max={50}
                  onBarPress={i => setSelectedDay(prev => prev === i ? null : i)} selectedIdx={selectedDay} />
              </View>
              {selectedDay !== null && weekData.details[selectedDay] && (
                <DayForecastCard day={weekData.details[selectedDay]} onClose={() => setSelectedDay(null)} />
              )}
            </>
          ) : null
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeMainS(C: ThemeColors) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

    photoWrap:    { height: 160, position: "relative" },
    photo:        { width: "100%", height: "100%" },
    photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
    backBtn:      { position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
    photoInfo:    { position: "absolute", bottom: 14, left: 16 },
    photoEmoji:   { fontSize: 20, marginBottom: 2 },
    photoName:    { color: "#fff", fontSize: 19, fontWeight: "800" },
    photoRegion:  { color: "rgba(255,255,255,0.8)", fontSize: 12 },

    photoBtnRow:    { position: "absolute", bottom: 14, right: 14, flexDirection: "row", gap: 8 },
    photoBtn:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)" },
    photoBtnActive: { backgroundColor: "rgba(14,165,233,0.85)", borderColor: "rgba(255,255,255,0.8)" },
    photoBtnIcon:   { fontSize: 14 },
    photoBtnTxt:    { color: "#fff", fontSize: 13, fontWeight: "800" },

    camWrap:         { paddingHorizontal: 16, paddingTop: 10 },
    camTabRow:       { flexDirection: "row", gap: 8, marginBottom: 8 },
    camTab:          { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border },
    camTabActive:    { backgroundColor: "rgba(14,165,233,0.18)", borderColor: C.primary },
    camTabTxt:       { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    camTabTxtActive: { color: C.primary },
    mapWrap:         { paddingHorizontal: 16, paddingTop: 10 },

    mainTabRow:      { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    mainTab:         { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border },
    mainTabActive:   { backgroundColor: "rgba(14,165,233,0.14)", borderColor: C.primary },
    mainTabTxt:      { color: C.textMuted, fontSize: 14, fontWeight: "700" },
    mainTabTxtActive:{ color: C.primary },

    modeRow:          { flexDirection: "row", alignSelf: "flex-start", marginBottom: 12, backgroundColor: C.bgSurface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
    modePill:         { paddingHorizontal: 18, paddingVertical: 7 },
    modePillActive:   { backgroundColor: C.primary },
    modePillTxt:      { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    modePillTxtActive:{ color: "#fff" },

    tableTitle: { color: C.textMuted, fontSize: 12, fontWeight: "800", marginBottom: 8, marginTop: 14 },
    loading:    { alignItems: "center", gap: 10, paddingVertical: 40 },
    loadingTxt: { color: C.textMuted, fontSize: 14 },
  });
}

function makeWeekS(C: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.bgCard, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border },
    row:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    lbl:  { fontSize: 14, fontWeight: "800" },
  });
}
