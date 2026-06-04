import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { ALL_SPOTS_FLAT } from "@/constants/spots";
import { db } from "@/lib/firebase";
import {
  addDoc, collection, deleteDoc, doc,
  onSnapshot, query, serverTimestamp, where,
} from "firebase/firestore";
import { BarChart2, Plus, Trash2, Waves } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SURF_SPOTS = ALL_SPOTS_FLAT.map(s => ({
  id: s.id,
  name: s.name,
  emoji: s.emoji,
  lat: s.apiLat,
  lon: s.apiLon,
}));


type TabType = "log" | "stats";

interface OfficialData { wave: number; wind: number; waterTemp: number }

const BOARD_TYPES = ["롱보드", "숏보드", "패들보드", "윈드서핑", "포일서핑"];

interface SurfLog {
  id: string;
  spotId: string;
  date: string;
  waveHeight: number;
  waveLabel?: string;
  actualWave?: string;
  boardType?: string;
  duration: number;
  notes: string;
  official?: OfficialData;
  createdAt: any;
}

async function fetchOfficial(lat: number, lon: number): Promise<OfficialData | null> {
  try {
    const h = new Date().getHours();
    const [mar, wea] = await Promise.all([
      axios.get(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,sea_surface_temperature&timezone=Asia%2FSeoul&forecast_days=1`),
      axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m&timezone=Asia%2FSeoul&forecast_days=1`),
    ]);
    return {
      wave:      mar.data.hourly.wave_height[h]             ?? 0,
      wind:      (wea.data.hourly.wind_speed_10m[h] ?? 0) / 3.6,
      waterTemp: mar.data.hourly.sea_surface_temperature[h] ?? 0,
    };
  } catch { return null; }
}

// ─── 달력 ────────────────────────────────────────────────────────────
function SurfCalendar({ logs, C, styles }: { logs: SurfLog[]; C: ThemeColors; styles: any }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const surfDates = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(log => {
      const [y, m] = log.date.split("-").map(Number);
      if (y === viewYear && m === viewMonth + 1) set.add(log.date);
    });
    return set;
  }, [logs, viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const today = new Date();
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const flat: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 7의 배수로 패딩해서 행이 항상 완성되도록
  while (flat.length % 7 !== 0) flat.push(null);
  const rows: (number | null)[][] = [];
  for (let r = 0; r < flat.length / 7; r++) rows.push(flat.slice(r * 7, r * 7 + 7));

  const monthLabel     = `${viewYear}.${String(viewMonth + 1).padStart(2, "0")}`;
  const monthCount     = surfDates.size;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.calArrow}>
          <Text style={styles.calArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.calTitleWrap}>
          <Text style={styles.calMonth}>{monthLabel}</Text>
          {monthCount > 0 && (
            <View style={styles.calCountBadge}>
              <Text style={styles.calCountText}>🏄 {monthCount}회</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={nextMonth}
          style={[styles.calArrow, isCurrentMonth && { opacity: 0.25 }]}
        >
          <Text style={styles.calArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekRow}>
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <Text
            key={d}
            style={[
              styles.calWeekDay,
              i === 0 && { color: "#EF4444" },
              i === 6 && { color: C.primary },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((day, ci) => {
              const dateStr = day
                ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const isSurf  = day ? surfDates.has(dateStr) : false;
              const isToday = isCurrentMonth && !!day && day === now.getDate();
              const isSun   = ci === 0;
              const isSat   = ci === 6;
              return (
                <View key={ci} style={styles.calCell}>
                  {day ? (
                    <View style={[
                      styles.calDayBg,
                      isSurf  && { backgroundColor: C.primary },
                      isToday && !isSurf && { borderWidth: 1.5, borderColor: C.primary },
                    ]}>
                      <Text style={[
                        styles.calDayText,
                        isSurf  && { color: "#fff", fontWeight: "800" },
                        isToday && !isSurf && { color: C.primary, fontWeight: "800" },
                        !isSurf && !isToday && isSun && { color: "#EF4444" },
                        !isSurf && !isToday && isSat && { color: C.primary },
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.calLegend}>
        <View style={[styles.calLegendDot, { backgroundColor: C.primary }]} />
        <Text style={styles.calLegendText}>서핑한 날</Text>
      </View>
    </View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────
export default function LogScreen() {
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles  = useMemo(() => makeStyles(C), [C]);
  const mStyles = useMemo(() => makeMStyles(C), [C]);

  const [activeTab, setActiveTab] = useState<TabType>("log");
  const [logs,      setLogs]      = useState<SurfLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving,    setSaving]    = useState(false);

  const [spotId,       setSpotId]       = useState("songjeong");
  const [actualWave,   setActualWave]   = useState("");
  const [boardType,    setBoardType]    = useState("");
  const [durationText, setDurationText] = useState("");
  const [notes,        setNotes]        = useState("");
  const [official,     setOfficial]     = useState<OfficialData | null>(null);
  const [fetchingW,    setFetchingW]    = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "surflogs"),
      where("uid", "==", user.uid),
    );
    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as SurfLog))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setLogs(sorted);
      setLoading(false);
    }, (err) => { setLoading(false); Alert.alert("데이터 오류", err.message); });
    return unsub;
  }, [user?.uid]);

  // ── 통계 ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!logs.length) return null;
    const totalSessions = logs.length;
    const totalMinutes  = logs.reduce((s, l) => s + (l.duration || 0), 0);
    const spotCounts    = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.spotId] = (acc[l.spotId] || 0) + 1; return acc;
    }, {});
    const topEntry = Object.entries(spotCounts).sort((a, b) => b[1] - a[1])[0];
    const topSpot  = SURF_SPOTS.find(s => s.id === topEntry?.[0]);
    const avgDur   = Math.round(totalMinutes / totalSessions);
    return { totalSessions, totalMinutes, topSpot, avgDur };
  }, [logs]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { month: `${d.getMonth() + 1}월`, count: logs.filter(l => l.date.startsWith(key)).length };
    });
  }, [logs]);

  const maxMonthCount = Math.max(...monthlyData.map(d => d.count), 1);

  // ── 기록 ─────────────────────────────────────────────────────────
  const loadOfficial = async (id: string) => {
    const spot = SURF_SPOTS.find(s => s.id === id);
    if (!spot) return;
    setFetchingW(true); setOfficial(null);
    const data = await fetchOfficial(spot.lat, spot.lon);
    setOfficial(data); setFetchingW(false);
  };

  const openModal = () => {
    setSpotId("songjeong");
    setActualWave(""); setBoardType("");
    setDurationText(""); setNotes(""); setOfficial(null);
    setModalOpen(true); loadOfficial("songjeong");
  };

  const handleSpotChange = (id: string) => { setSpotId(id); loadOfficial(id); };

  const handleSave = async () => {
    if (!user) { Alert.alert("오류", "로그인이 필요합니다."); return; }
    const waveNum    = parseFloat(actualWave);
    const durationNum = parseInt(durationText, 10);
    if (isNaN(waveNum) || waveNum <= 0) {
      Alert.alert("입력 오류", "파고를 올바르게 입력해주세요. (예: 0.8)"); return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert("입력 오류", "서핑 시간을 올바르게 입력해주세요."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "surflogs"), {
        uid: user!.uid, spotId,
        date: new Date().toISOString().split("T")[0],
        waveHeight: waveNum,
        ...(boardType ? { boardType } : {}),
        duration: durationNum, notes: notes.trim(),
        ...(official ? { official } : {}),
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert("저장 실패", e.message ?? String(e));
    } finally { setSaving(false); }
  };

  const handleDelete = (logId: string) => {
    Alert.alert("삭제", "이 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        try { await deleteDoc(doc(db, "surflogs", logId)); }
        catch (e: any) { Alert.alert("삭제 실패", e.message ?? String(e)); }
      }},
    ]);
  };

  function condLabel(h: number) {
    if (h < 0.5) return { label: "FLAT",  color: C.textSubtle };
    if (h < 1.0) return { label: "SMALL", color: C.textMuted };
    if (h < 1.8) return { label: "GOOD",  color: C.primary };
    if (h < 2.5) return { label: "SOLID", color: C.accent };
    return              { label: "EPIC",  color: C.warning };
  }

  const spotMeta = (id: string) => SURF_SPOTS.find(s => s.id === id) ?? SURF_SPOTS[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSub}>나의 서핑</Text>
          <Text style={styles.headerTitle}>서핑 기록 🏄</Text>
        </View>
        {activeTab === "log" && (
          <TouchableOpacity style={styles.addBtn} onPress={openModal}>
            <Plus size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {(["log", "stats"] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === "log"
              ? <Waves size={14} color={activeTab === tab ? "#fff" : C.textSubtle} strokeWidth={2} />
              : <BarChart2 size={14} color={activeTab === tab ? "#fff" : C.textSubtle} strokeWidth={2} />
            }
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "log" ? "기록" : "통계"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 기록 탭 ── */}
      {activeTab === "log" && (
        loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : logs.length === 0 ? (
          <View style={styles.centered}>
            <Waves size={48} color={C.textSubtle} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={styles.emptyDesc}>+ 버튼으로 첫 서핑 기록을 남겨보세요 🤙</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openModal}>
              <Text style={styles.emptyBtnText}>첫 기록 추가</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <SurfCalendar logs={logs} C={C} styles={styles} />

            {logs.map((log) => {
              const spot = spotMeta(log.spotId);
              const cond = condLabel(log.waveHeight);
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logTop}>
                    <View style={styles.logLeft}>
                      <Text style={styles.logSpotEmoji}>{spot.emoji}</Text>
                      <View>
                        <Text style={styles.logSpotName}>{spot.name}</Text>
                        <Text style={styles.logDate}>{log.date}</Text>
                      </View>
                    </View>
                    <View style={styles.logRight}>
                      <View style={[styles.condBadge, { borderColor: cond.color }]}>
                        <Text style={[styles.condText, { color: cond.color }]}>{cond.label}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                        <Trash2 size={14} color={C.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.logStats}>
                    <View style={styles.logStat}>
                      <Text style={styles.logStatVal}>
                        {log.actualWave ? `${log.actualWave}m` : (log.waveLabel ?? `${log.waveHeight.toFixed(1)}m`)}
                      </Text>
                      <Text style={styles.logStatLabel}>파고</Text>
                    </View>
                    <View style={styles.logStatDiv} />
                    <View style={styles.logStat}>
                      <Text style={styles.logStatVal}>{log.duration}분</Text>
                      <Text style={styles.logStatLabel}>서핑 시간</Text>
                    </View>
                    {log.boardType && (
                      <>
                        <View style={styles.logStatDiv} />
                        <View style={styles.logStat}>
                          <Text style={styles.logStatVal}>{log.boardType}</Text>
                          <Text style={styles.logStatLabel}>보드</Text>
                        </View>
                      </>
                    )}
                  </View>
                  {log.official && (
                    <View style={styles.officialRow}>
                      <Text style={styles.officialTag}>공식 📊</Text>
                      <Text style={styles.officialVal}>🌊 {log.official.wave.toFixed(1)}m</Text>
                      <Text style={styles.officialDot}>·</Text>
                      <Text style={styles.officialVal}>💨 {log.official.wind.toFixed(1)}m/s</Text>
                      <Text style={styles.officialDot}>·</Text>
                      <Text style={styles.officialVal}>🌡 {log.official.waterTemp.toFixed(0)}°C</Text>
                    </View>
                  )}
                  {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        )
      )}

      {/* ── 통계 탭 ── */}
      {activeTab === "stats" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {!stats ? (
            <View style={[styles.centered, { marginTop: 60 }]}>
              <BarChart2 size={48} color={C.textSubtle} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
              <Text style={styles.emptyDesc}>기록을 추가하면 통계가 생성돼요 📊</Text>
            </View>
          ) : (
            <>
              {/* 누적 통계 */}
              <Text style={styles.sectionTitle}>📊 누적 기록</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statsCell}>
                  <Text style={styles.statsBig}>{stats.totalSessions}</Text>
                  <Text style={styles.statsLabel}>총 세션</Text>
                  <Text style={styles.statsUnit}>내가 바다에 입수한 횟수</Text>
                </View>
                <View style={styles.statsDivV} />
                <View style={styles.statsCell}>
                  <Text style={styles.statsBig}>
                    {stats.totalMinutes >= 60
                      ? `${Math.floor(stats.totalMinutes / 60)}h`
                      : `${stats.totalMinutes}m`}
                  </Text>
                  <Text style={styles.statsLabel}>누적 시간</Text>
                  <Text style={styles.statsUnit}>모든 세션 합산</Text>
                </View>
                <View style={styles.statsDivV} />
                <View style={styles.statsCell}>
                  <Text style={styles.statsBig}>{stats.avgDur}분</Text>
                  <Text style={styles.statsLabel}>평균 시간</Text>
                  <Text style={styles.statsUnit}>세션당 평균</Text>
                </View>
              </View>

              {/* 최애 스팟 */}
              {stats.topSpot && (
                <View style={styles.topSpotCard}>
                  <View>
                    <Text style={styles.topSpotLabel}>⭐ 최애 스팟</Text>
                    <View style={styles.topSpotRow}>
                      <Text style={styles.topSpotEmoji}>{stats.topSpot.emoji}</Text>
                      <Text style={styles.topSpotName}>{stats.topSpot.name}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 월별 그래프 */}
              <Text style={styles.sectionTitle}>📅 월별 서핑 횟수</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartBars}>
                  {monthlyData.map((d) => {
                    const barH  = d.count > 0 ? Math.max(8, Math.round((d.count / maxMonthCount) * 100)) : 3;
                    const isMax = d.count === maxMonthCount && d.count > 0;
                    return (
                      <View key={d.month} style={styles.chartBarWrap}>
                        <Text style={styles.chartBarCount}>{d.count > 0 ? `${d.count}` : ""}</Text>
                        <View style={styles.chartBarTrack}>
                          <View style={[
                            styles.chartBarFill,
                            { height: barH, backgroundColor: isMax ? C.primary : `${C.primary}55` },
                          ]} />
                        </View>
                        <Text style={[styles.chartBarLabel, isMax && { color: C.primary, fontWeight: "800" }]}>
                          {d.month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.chartHint}>최근 6개월</Text>
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* 기록 추가 모달 */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={mStyles.overlay}>
          <ScrollView
            style={mStyles.scrollWrap}
            contentContainerStyle={mStyles.sheet}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={mStyles.title}>새 서핑 기록 🏄</Text>

            <Text style={mStyles.label}>스팟</Text>
            <View style={mStyles.spotGrid}>
              {SURF_SPOTS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[mStyles.spotChip, spotId === s.id && mStyles.spotChipActive]}
                  onPress={() => handleSpotChange(s.id)}
                >
                  <Text style={mStyles.spotEmoji}>{s.emoji}</Text>
                  <Text style={[mStyles.spotName, spotId === s.id && mStyles.spotNameActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={mStyles.officialStrip}>
              {fetchingW ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : official ? (
                <>
                  <Text style={mStyles.officialStripLabel}>현재</Text>
                  <Text style={mStyles.officialStripItem}>🌊 {official.wave.toFixed(1)}m</Text>
                  <Text style={mStyles.officialStripSep}>·</Text>
                  <Text style={mStyles.officialStripItem}>💨 {official.wind.toFixed(1)}m/s</Text>
                  <Text style={mStyles.officialStripSep}>·</Text>
                  <Text style={mStyles.officialStripItem}>🌡 {official.waterTemp.toFixed(0)}°C</Text>
                </>
              ) : (
                <Text style={mStyles.officialStripNone}>기상 데이터 불러오는 중...</Text>
              )}
            </View>

            <Text style={mStyles.label}>파고</Text>
            <View style={mStyles.durationInputRow}>
              <TextInput
                style={[mStyles.durationInput, { fontSize: 22 }]}
                value={actualWave}
                onChangeText={text => setActualWave(text.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="예) 0.8"
                placeholderTextColor={C.textSubtle}
                maxLength={5}
              />
              <Text style={mStyles.durationUnit}>m</Text>
            </View>

            <Text style={mStyles.label}>보드 종류 (선택)</Text>
            <View style={[mStyles.chipRow, { flexWrap: "wrap" }]}>
              {BOARD_TYPES.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[mStyles.boardChip, boardType === b && mStyles.chipActive]}
                  onPress={() => setBoardType(prev => prev === b ? "" : b)}
                >
                  <Text style={[mStyles.chipMain, boardType === b && mStyles.chipMainActive]} numberOfLines={1}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mStyles.label}>서핑 시간 (분)</Text>
            <View style={mStyles.durationInputRow}>
              <TextInput
                style={mStyles.durationInput}
                value={durationText}
                onChangeText={text => setDurationText(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="예) 90"
                placeholderTextColor={C.textSubtle}
                maxLength={4}
              />
              <Text style={mStyles.durationUnit}>분</Text>
            </View>
            <View style={mStyles.durationHintRow}>
              {[30, 60, 90].map(v => (
                <TouchableOpacity
                  key={v}
                  style={mStyles.durationHintChip}
                  onPress={() => setDurationText(prev => {
                    const cur = parseInt(prev, 10) || 0;
                    return String(cur + v);
                  })}
                >
                  <Text style={mStyles.durationHintText}>+{v}분</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[mStyles.durationHintChip, { borderColor: C.error }]}
                onPress={() => setDurationText("")}
              >
                <Text style={[mStyles.durationHintText, { color: C.error }]}>초기화</Text>
              </TouchableOpacity>
            </View>

            <Text style={mStyles.label}>메모 (선택)</Text>
            <TextInput
              style={[mStyles.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="파도, 혼잡도, 장비, 느낀 점..."
              placeholderTextColor={C.textSubtle}
            />

            <View style={mStyles.btnRow}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={mStyles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={mStyles.saveText}>저장</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    scroll:   { flex: 1 },
    list:     { paddingHorizontal: 20, paddingTop: 4 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },

    headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
    headerSub:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },
    addBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },

    tabBar:           { flexDirection: "row", marginHorizontal: 20, marginBottom: 14, backgroundColor: C.bgSurface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border },
    tabBtn:           { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
    tabBtnActive:     { backgroundColor: C.primary },
    tabBtnText:       { color: C.textSubtle, fontSize: 13, fontWeight: "700" },
    tabBtnTextActive: { color: "#fff" },

    emptyTitle:   { color: C.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
    emptyDesc:    { color: C.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
    emptyBtn:     { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, backgroundColor: C.primary },
    emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    logCard:      { backgroundColor: C.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
    logTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    logLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
    logSpotEmoji: { fontSize: 24 },
    logSpotName:  { color: C.text, fontSize: 16, fontWeight: "700" },
    logDate:      { color: C.textMuted, fontSize: 12, marginTop: 2 },
    logRight:     { flexDirection: "row", alignItems: "center", gap: 10 },
    condBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5 },
    condText:     { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
    deleteBtn:    { padding: 4 },
    logStats:     { flexDirection: "row", alignItems: "center", backgroundColor: C.bgSurface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
    logStat:      { flex: 1, alignItems: "center" },
    logStatVal:   { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 2 },
    logStatLabel: { color: C.textSubtle, fontSize: 11, fontWeight: "600" },
    logStatDiv:   { width: 1, height: 28, backgroundColor: C.border },
    logNotes:     { color: C.textMuted, fontSize: 13, lineHeight: 20, marginTop: 12 },
    officialRow:  { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 10 },
    officialTag:  { color: C.textSubtle, fontSize: 11, fontWeight: "700" },
    officialVal:  { color: C.textMuted, fontSize: 12, fontWeight: "600" },
    officialDot:  { color: C.border, fontSize: 12 },

    // 달력
    calCard:       { backgroundColor: C.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    calHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    calArrow:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    calArrowText:  { color: C.text, fontSize: 20, fontWeight: "700", lineHeight: 22 },
    calTitleWrap:  { alignItems: "center", gap: 4 },
    calMonth:      { color: C.text, fontSize: 16, fontWeight: "800" },
    calCountBadge: { backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.25)" },
    calCountText:  { color: C.primary, fontSize: 11, fontWeight: "700" },
    calWeekRow:    { flexDirection: "row", marginBottom: 6 },
    calWeekDay:    { flex: 1, textAlign: "center", color: C.textSubtle, fontSize: 11, fontWeight: "700", paddingVertical: 4 },
    calGrid:       { gap: 2 },
    calRow:        { flexDirection: "row" },
    calCell:       { flex: 1, alignItems: "center", paddingVertical: 3 },
    calDayBg:      { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    calDayText:    { color: C.text, fontSize: 13, fontWeight: "500" },
    calLegend:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
    calLegendDot:  { width: 10, height: 10, borderRadius: 5 },
    calLegendText: { color: C.textSubtle, fontSize: 11, fontWeight: "600" },

    // 통계
    sectionTitle: { color: C.text, fontSize: 16, fontWeight: "800", marginBottom: 10, marginTop: 4 },
    statsGrid:    { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
    statsCell:    { flex: 1, alignItems: "center", gap: 2 },
    statsDivV:    { width: 1, height: 50, backgroundColor: C.border },
    statsBig:     { color: C.primary, fontSize: 26, fontWeight: "800" },
    statsLabel:   { color: C.textSubtle, fontSize: 11, fontWeight: "600" },
    statsUnit:    { color: C.textSubtle, fontSize: 10, fontWeight: "500", textAlign: "center", marginTop: 2 },
    topSpotCard:  { backgroundColor: C.bgCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    topSpotLabel: { color: C.textSubtle, fontSize: 12, fontWeight: "700", marginBottom: 8 },
    topSpotRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
    topSpotEmoji: { fontSize: 26 },
    topSpotName:  { color: C.text, fontSize: 20, fontWeight: "800" },

    chartCard:     { backgroundColor: C.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
    chartBars:     { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 6 },
    chartBarWrap:  { flex: 1, alignItems: "center", gap: 4 },
    chartBarCount: { color: C.textSubtle, fontSize: 10, fontWeight: "700", height: 14 },
    chartBarTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
    chartBarFill:  { width: "100%", borderRadius: 6 },
    chartBarLabel: { color: C.textSubtle, fontSize: 11, fontWeight: "600" },
    chartHint:     { color: C.textSubtle, fontSize: 11, textAlign: "right", marginTop: 8 },
  });
}

function makeMStyles(C: ThemeColors) {
  return StyleSheet.create({
    overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    scrollWrap: { maxHeight: "92%" },
    sheet:      { backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 50, borderWidth: 1, borderColor: C.border },
    title:      { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 20 },
    label:      { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
    input:      { borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgSurface, paddingHorizontal: 16, paddingVertical: 12, color: C.text, fontSize: 15 },

    spotGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    spotChip:       { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface },
    spotChipActive: { borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    spotEmoji:      { fontSize: 15 },
    spotName:       { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    spotNameActive: { color: C.primary },

    officialStrip:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, backgroundColor: C.bgSurface, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, minHeight: 42 },
    officialStripLabel: { color: C.textSubtle, fontSize: 11, fontWeight: "700", marginRight: 2 },
    officialStripItem:  { color: C.text, fontSize: 13, fontWeight: "700" },
    officialStripSep:   { color: C.border, fontSize: 13 },
    officialStripNone:  { color: C.textSubtle, fontSize: 12 },

    chipRow:        { flexDirection: "row", gap: 6 },
    chip:           { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, gap: 2 },
    boardChip:      { alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, minWidth: 72 },
    chipActive:     { borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    chipMain:       { color: C.textMuted, fontSize: 13, fontWeight: "800" },
    chipMainActive: { color: C.primary },

    durationInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    durationInput:    { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
    durationUnit:     { color: C.textMuted, fontSize: 16, fontWeight: "700" },
    durationHintRow:  { flexDirection: "row", gap: 6, marginTop: 8 },
    durationHintChip: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface },
    durationHintText: { color: C.textSubtle, fontSize: 12, fontWeight: "600" },

    btnRow:     { flexDirection: "row", gap: 10, marginTop: 24 },
    cancelBtn:  { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    cancelText: { color: C.textMuted, fontSize: 15, fontWeight: "600" },
    saveBtn:    { flex: 1, height: 50, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    saveText:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
}
