import { MapPin, Wind, Waves, Star } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const SPOTS = [
  {
    id: "jungmun",
    name: "중문 비치",
    region: "제주도",
    level: "중급",
    rating: 4.8,
    tags: ["파워 웨이브", "오른쪽 브레이크"],
    desc: "제주도 남부의 대표 서핑 스팟. 일관된 파도와 아름다운 해안선이 특징.",
    bestSeason: "9월 ~ 11월",
    levelColor: Colors.accent,
  },
  {
    id: "yangyang",
    name: "양양 죽도",
    region: "강원도",
    level: "초급",
    rating: 4.6,
    tags: ["초보 친화", "양방향 브레이크"],
    desc: "한국 서핑의 성지. 다양한 시설과 스쿨이 있어 입문자에게 최적.",
    bestSeason: "7월 ~ 9월",
    levelColor: Colors.success,
  },
  {
    id: "songjeong",
    name: "송정 해수욕장",
    region: "부산",
    level: "초중급",
    rating: 4.4,
    tags: ["도심 접근성", "일몰 뷰"],
    desc: "부산 시내에서 접근하기 쉬운 도심 서핑 스팟. 일몰 때 특히 아름답다.",
    bestSeason: "연중",
    levelColor: Colors.primary,
  },
  {
    id: "pohang",
    name: "포항 구룡포",
    region: "경북",
    level: "고급",
    rating: 4.5,
    tags: ["강한 파도", "실력자 전용"],
    desc: "동해 북부의 강한 파도. 경험 많은 서퍼를 위한 파워풀한 브레이크.",
    bestSeason: "10월 ~ 12월",
    levelColor: Colors.warning,
  },
];

export default function ExploreScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>전국 서핑 명소</Text>
          <Text style={styles.headerTitle}>스팟 가이드 🗺️</Text>
        </View>

        {/* Info banner */}
        <View style={styles.banner}>
          <MapPin size={16} color={Colors.primary} />
          <Text style={styles.bannerText}>국내 주요 서핑 스팟 4곳을 소개합니다</Text>
        </View>

        {/* Spot cards */}
        {SPOTS.map((spot) => (
          <TouchableOpacity
            key={spot.id}
            style={[styles.card, selected === spot.id && styles.cardActive]}
            onPress={() => setSelected(selected === spot.id ? null : spot.id)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <View>
                  <Text style={styles.cardName}>{spot.name}</Text>
                  <Text style={styles.cardRegion}>{spot.region}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Star size={11} color={Colors.warning} fill={Colors.warning} />
                  <Text style={styles.ratingText}>{spot.rating}</Text>
                </View>
              </View>

              <View style={styles.cardMeta}>
                <View style={[styles.levelBadge, { borderColor: spot.levelColor }]}>
                  <Text style={[styles.levelText, { color: spot.levelColor }]}>{spot.level}</Text>
                </View>
                <View style={styles.tagRow}>
                  {spot.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Expanded detail */}
            {selected === spot.id && (
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
                    <Text style={styles.detailLabel}>난이도</Text>
                    <Text style={[styles.detailValue, { color: spot.levelColor }]}>{spot.level}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>{selected === spot.id ? "▲ 접기" : "▼ 자세히 보기"}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.bg },
  content:   { paddingHorizontal: 20, paddingTop: 12 },

  header:      { marginBottom: 18 },
  headerSub:   { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  headerTitle: { color: Colors.text, fontSize: 26, fontWeight: "800" },

  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(14,165,233,0.08)", paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(14,165,233,0.2)", marginBottom: 20,
  },
  bannerText: { color: Colors.textMuted, fontSize: 14, fontWeight: "500" },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  cardActive: { borderColor: Colors.primary },

  cardTop:      { gap: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardName:     { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 2 },
  cardRegion:   { color: Colors.textMuted, fontSize: 13, fontWeight: "500" },
  ratingBadge:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  ratingText:   { color: Colors.warning, fontSize: 13, fontWeight: "800" },

  cardMeta:   { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  levelText:  { fontSize: 12, fontWeight: "800" },
  tagRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag:        { backgroundColor: Colors.bgSurface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  tagText:    { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },

  cardDetail:   { gap: 12 },
  detailDivider:{ height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  detailDesc:   { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },
  detailRow:    { flexDirection: "row", gap: 12 },
  detailItem:   { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border },
  detailLabel:  { color: Colors.textSubtle, fontSize: 11, fontWeight: "600", marginTop: 4 },
  detailValue:  { color: Colors.text, fontSize: 14, fontWeight: "700" },

  expandHint:   { alignItems: "center", marginTop: 14 },
  expandHintText:{ color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
});
