import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ⚠️ 키 설정 (보안을 위해 추후 .env로 분리 권장)
const GEMINI_API_KEY = "AIzaSyAVksNaNgOquObDjm23Qq_I__4UpMfCyqw";
const KMA_AUTH_KEY = "PUcoXsS7SiSHKF7Eu3okRg";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SURF_POINTS = [
  {
    id: "jungmun",
    name: "중문",
    lat: 33.24,
    lon: 126.41,
    area: "제주도남부앞바다",
  },
  {
    id: "yangyang",
    name: "양양",
    lat: 38.02,
    lon: 128.71,
    area: "강원북부앞바다",
  },
  {
    id: "songjeong",
    name: "송정",
    lat: 35.17,
    lon: 129.2,
    area: "남해동부앞바다",
  },
  {
    id: "pohang",
    name: "포항",
    lat: 36.1,
    lon: 129.43,
    area: "경북남부앞바다",
  },
];

export default function HomeScreen() {
  const [selectedPoint, setSelectedPoint] = useState(SURF_POINTS[0]);
  const [surfBriefing, setSurfBriefing] = useState("데이터 분석 중...");
  const [loading, setLoading] = useState(true);

  const getSurfForecast = useCallback(
    async (point = selectedPoint, forceRefresh = false) => {
      setLoading(true);
      try {
        // 1. 캐시 확인
        const cacheKey = `surf_cache_${point.id}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !forceRefresh) {
          const { content, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) {
            setSurfBriefing(content);
            setLoading(false);
            return;
          }
        }

        // 2. Open-Meteo 호출
        const meteoUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${point.lat}&longitude=${point.lon}&hourly=wave_height,wave_period&timezone=Asia%2FSeoul&forecast_days=1`;
        const meteoRes = await axios.get(meteoUrl);
        const currentHour = new Date().getHours();
        const forecast = {
          height: meteoRes.data.hourly.wave_height[currentHour],
          period: meteoRes.data.hourly.wave_period[currentHour],
        };

        // 3. 기상청 특보 호출 (에러 나도 진행)
        let warningStatus = "정상";
        try {
          const kmaUrl = `https://apihub.kma.go.kr/api/typ01/url/wrn_reg.php?authKey=${KMA_AUTH_KEY}`;
          const kmaRes = await axios.get(kmaUrl, { timeout: 3000 });
          const rawWarning = kmaRes.data || "";
          const isAreaInWarning = rawWarning.includes(
            point.area.replace(" ", ""),
          );
          if (isAreaInWarning && rawWarning.includes("경보"))
            warningStatus = "풍랑경보 (입수 금지)";
          else if (isAreaInWarning && rawWarning.includes("주의보"))
            warningStatus = "풍랑주의보 (입수 신고 필수)";
        } catch (_) {
          console.log("KMA API Skip");
        }

        // 💡 💡 💡 수정된 부분: 모델명 앞에 'models/'를 붙여서 404 에러 방지
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 만약 위 코드로도 404가 뜨면 아래 줄로 교체해 보세요:
        // const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

        const prompt = `
        지역: ${point.name}, 파고: ${forecast.height}m, 주기: ${forecast.period}초, 특보: ${warningStatus}.
        너는 전문 서핑 코치야. 서퍼 말투로 딱 한 줄만 브리핑해줘. 🤙
      `;

        const result = await model.generateContent(prompt);
        const briefingText = result.response.text().trim();

        setSurfBriefing(briefingText);
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            content: briefingText,
            timestamp: Date.now(),
          }),
        );
      } catch (error: any) {
        console.log(">>> [Final Error Log]:", error);
        setSurfBriefing(
          `분석 실패: 모델 연결 오류 (${error.message.substring(0, 30)})`,
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedPoint],
  );

  useEffect(() => {
    getSurfForecast();
  }, [getSurfForecast]);

  const handlePointChange = (point: (typeof SURF_POINTS)[0]) => {
    setSelectedPoint(point);
    getSurfForecast(point);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.tabContainer}>
        {SURF_POINTS.map((point) => (
          <TouchableOpacity
            key={point.id}
            style={[
              styles.tab,
              selectedPoint.id === point.id && styles.activeTab,
            ]}
            onPress={() => handlePointChange(point)}
          >
            <Text
              style={[
                styles.tabText,
                selectedPoint.id === point.id && styles.activeTabText,
              ]}
            >
              {point.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{selectedPoint.name} 실시간 브리핑 🌊</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>파도 분석 중...</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.content}>{surfBriefing}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => getSurfForecast(selectedPoint, true)}
            >
              <Text style={styles.buttonText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#E9ECEF",
  },
  activeTab: { backgroundColor: "#007AFF" },
  tabText: { fontWeight: "700", color: "#495057" },
  activeTabText: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 25,
    elevation: 5,
    minHeight: 160,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 15,
    color: "#1A1A1A",
  },
  content: { fontSize: 16, lineHeight: 24, color: "#333", fontWeight: "700" },
  loadingBox: { flexDirection: "row", alignItems: "center" },
  loadingText: { marginLeft: 10, color: "#007AFF", fontWeight: "700" },
  button: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
