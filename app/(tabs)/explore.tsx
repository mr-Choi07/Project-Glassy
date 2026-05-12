import { useRouter } from "expo-router";
import { MapPin, Navigation, Waves, Wind } from "lucide-react-native";
import React, { createElement, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

const SPOTS = [
  {
    id: "songjeong" as const,
    name: "송정 해수욕장",
    region: "부산 해운대구",
    lat: 35.1786,
    lon: 129.2075,
    level: "초중급",
    tags: ["도심 접근성", "일몰 뷰", "초보 가능"],
    desc: "부산 도심에서 가장 가까운 서핑 스팟. 지하철·버스로 접근이 쉽고, 파도가 비교적 완만해 입문자도 즐길 수 있다. 해 질 무렵 오렌지빛 노을이 일품.",
    bestSeason: "연중 (9~11월 최고)",
    waveType: "비치 브레이크",
    levelColor: Colors.primary,
    emoji: "🐚",
  },
  {
    id: "dadaepo" as const,
    name: "다대포 해수욕장",
    region: "부산 사하구",
    lat: 35.0476,
    lon: 128.9610,
    level: "초급",
    tags: ["초보 추천", "넓은 백사장", "낙조 명소"],
    desc: "부산 서쪽 끝에 위치한 광활한 해변. 파도가 완만하고 수심이 얕아 입문자에게 최적이다. 낙조 명소로 유명하며 가족 단위 서퍼에게 인기.",
    bestSeason: "5~10월",
    waveType: "비치 브레이크",
    levelColor: Colors.success,
    emoji: "🌊",
  },
];

function MapEmbed({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
  if (Platform.OS === "web") {
    return createElement(
      "div",
      { style: { height: 160, overflow: "hidden", borderRadius: 14, border: `1px solid ${Colors.border}`, marginTop: 4 } },
      createElement("iframe", {
        src,
        style: { width: "100%", height: 192, border: "none" },
        loading: "lazy",
        title: `${name} 지도`,
      })
    );
  }
  return (
    <View style={mapStyles.nativeBox}>
      <MapPin size={20} color={Colors.primary} />
      <Text style={mapStyles.nativeText}>{name} — {lat.toFixed(4)}, {lon.toFixed(4)}</Text>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  nativeBox:  { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: Colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  nativeText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
});

export default function ExploreScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const { userProfile, setSelectedSpots } = useAuth();

  const handleToggleFavorite = async (spotId: "songjeong" | "dadaepo") => {
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
          <MapPin size={15} color={Colors.primary} />
          <Text style={styles.bannerText}>Glassy가 선별한 부산 서핑 스팟 2곳</Text>
        </View>

        {SPOTS.map((spot) => {
          const isFavorite = (userProfile?.selectedSpotIds ?? []).includes(spot.id);
          const isOpen     = selected === spot.id;
          return (
            <TouchableOpacity
              key={spot.id}
              style={[styles.card, isOpen && styles.cardActive]}
              onPress={() => setSelected(isOpen ? null : spot.id)}
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
                  <View style={[styles.levelBadge, { borderColor: spot.levelColor }]}>
                    <Text style={[styles.levelText, { color: spot.levelColor }]}>{spot.level}</Text>
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
                  <Text style={styles.detailDesc}>{spot.desc}</Text>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Wind size={14} color={Colors.textMuted} />
                      <Text style={styles.detailLabel}>베스트 시즌</Text>
                      <Text style={styles.detailValue}>{spot.bestSeason}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Waves size={14} color={Colors.textMuted} />
                      <Text style={styles.detailLabel}>파도 타입</Text>
                      <Text style={styles.detailValue}>{spot.waveType}</Text>
                    </View>
                  </View>

                  {/* 지도 */}
                  <MapEmbed lat={spot.lat} lon={spot.lon} name={spot.name} />

                  {/* 하단 버튼 */}
                  <View style={styles.detailBtnRow}>
                    <TouchableOpacity
                      style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                      onPress={() => handleToggleFavorite(spot.id)}
                    >
                      <Navigation size={14} color={isFavorite ? Colors.success : Colors.primary} />
                      <Text style={[styles.favBtnText, isFavorite && { color: Colors.success }]}>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  content:  { paddingHorizontal: 20, paddingTop: 12 },

  header:      { marginBottom: 18 },
  headerSub:   { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  headerTitle: { color: Colors.text, fontSize: 26, fontWeight: "800" },

  banner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(14,165,233,0.08)", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(14,165,233,0.2)", marginBottom: 20 },
  bannerText: { color: Colors.textMuted, fontSize: 14, fontWeight: "500" },

  card:       { backgroundColor: Colors.bgCard, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  cardActive: { borderColor: Colors.primary },

  favBadge:     { alignSelf: "flex-start", backgroundColor: "rgba(16,185,129,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)", marginBottom: 10 },
  favBadgeText: { color: Colors.success, fontSize: 11, fontWeight: "700" },

  cardTop:      { gap: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  spotEmoji:    { fontSize: 20 },
  cardName:     { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 2 },
  cardRegion:   { color: Colors.textMuted, fontSize: 13, fontWeight: "500" },
  levelBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  levelText:    { fontSize: 12, fontWeight: "800" },
  tagRow:       { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag:          { backgroundColor: Colors.bgSurface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  tagText:      { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },

  cardDetail:    { gap: 12 },
  detailDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  detailDesc:    { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },
  detailRow:     { flexDirection: "row", gap: 12 },
  detailItem:    { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border },
  detailLabel:   { color: Colors.textSubtle, fontSize: 11, fontWeight: "600", marginTop: 4 },
  detailValue:   { color: Colors.text, fontSize: 13, fontWeight: "700" },

  detailBtnRow:    { flexDirection: "row", gap: 10, marginTop: 8 },
  favBtn:          { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: "rgba(14,165,233,0.08)", justifyContent: "center" },
  favBtnActive:    { borderColor: Colors.success, backgroundColor: "rgba(16,185,129,0.08)" },
  favBtnText:      { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  detailPageBtn:   { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgSurface, alignItems: "center" },
  detailPageBtnText:{ color: Colors.text, fontSize: 14, fontWeight: "700" },

  expandHint:     { alignItems: "center", marginTop: 14 },
  expandHintText: { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
});
