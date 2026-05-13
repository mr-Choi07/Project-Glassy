import { useAuth } from "@/context/AuthContext";
import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Plus, Trash2, Waves } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SURF_SPOTS = [
  { id: "songjeong", name: "송정", emoji: "🐚" },
  { id: "dadaepo",   name: "다대포", emoji: "🌊" },
];

interface SurfLog {
  id: string;
  spotId: string;
  date: string;
  waveHeight: number;
  duration: number;
  notes: string;
  createdAt: any;
}

export default function LogScreen() {
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const styles  = useMemo(() => makeStyles(C), [C]);
  const mStyles = useMemo(() => makeMStyles(C), [C]);

  const [logs, setLogs]           = useState<SurfLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [spotId, setSpotId]       = useState("songjeong");
  const [waveHeight, setWaveHeight] = useState("");
  const [duration, setDuration]   = useState("");
  const [notes, setNotes]         = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "surflogs"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SurfLog)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  const openModal = () => {
    setSpotId("songjeong");
    setWaveHeight("");
    setDuration("");
    setNotes("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!waveHeight || !duration) {
      Alert.alert("입력 오류", "파고와 세션 시간을 입력해주세요.");
      return;
    }
    const h = parseFloat(waveHeight);
    const d = parseInt(duration, 10);
    if (isNaN(h) || isNaN(d)) {
      Alert.alert("입력 오류", "숫자를 올바르게 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "surflogs"), {
        uid: user!.uid,
        spotId,
        date: new Date().toISOString().split("T")[0],
        waveHeight: h,
        duration: d,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert("저장 실패", e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (logId: string) => {
    Alert.alert("삭제", "이 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          try { await deleteDoc(doc(db, "surflogs", logId)); }
          catch (e: any) { Alert.alert("삭제 실패", e.message ?? String(e)); }
        },
      },
    ]);
  };

  function getConditionLabel(h: number) {
    if (h < 0.5) return { label: "FLAT",  color: C.textSubtle };
    if (h < 1.0) return { label: "SMALL", color: C.textMuted };
    if (h < 1.8) return { label: "GOOD",  color: C.primary };
    if (h < 2.5) return { label: "SOLID", color: C.accent };
    return              { label: "EPIC",  color: C.warning };
  }

  const spotMeta = (id: string) => SURF_SPOTS.find(s => s.id === id) ?? SURF_SPOTS[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSub}>나의 서핑</Text>
          <Text style={styles.headerTitle}>세션 기록 📋</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centered}>
          <Waves size={48} color={C.textSubtle} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>+ 버튼으로 첫 서핑 세션을 기록해보세요 🤙</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openModal}>
            <Text style={styles.emptyBtnText}>첫 기록 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {logs.map((log) => {
            const spot = spotMeta(log.spotId);
            const cond = getConditionLabel(log.waveHeight);
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
                    <Text style={styles.logStatVal}>{log.waveHeight.toFixed(1)}m</Text>
                    <Text style={styles.logStatLabel}>파고</Text>
                  </View>
                  <View style={styles.logStatDiv} />
                  <View style={styles.logStat}>
                    <Text style={styles.logStatVal}>{log.duration}분</Text>
                    <Text style={styles.logStatLabel}>세션</Text>
                  </View>
                </View>
                {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <Text style={mStyles.title}>새 세션 기록</Text>

            <Text style={mStyles.label}>스팟</Text>
            <View style={mStyles.spotRow}>
              {SURF_SPOTS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[mStyles.spotChip, spotId === s.id && mStyles.spotChipActive]}
                  onPress={() => setSpotId(s.id)}
                >
                  <Text style={mStyles.spotEmoji}>{s.emoji}</Text>
                  <Text style={[mStyles.spotName, spotId === s.id && mStyles.spotNameActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mStyles.label}>파고 (m)</Text>
            <TextInput
              style={mStyles.input}
              value={waveHeight}
              onChangeText={setWaveHeight}
              keyboardType="decimal-pad"
              placeholder="예: 1.2"
              placeholderTextColor={C.textSubtle}
            />

            <Text style={mStyles.label}>세션 시간 (분)</Text>
            <TextInput
              style={mStyles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="예: 90"
              placeholderTextColor={C.textSubtle}
            />

            <Text style={mStyles.label}>메모 (선택)</Text>
            <TextInput
              style={[mStyles.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="오늘 세션은 어떠셨나요?"
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
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea:  { flex: 1, backgroundColor: C.bg },
    scroll:    { flex: 1 },
    list:      { paddingHorizontal: 20 },
    centered:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },

    headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
    headerSub:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },
    addBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },

    emptyTitle:  { color: C.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
    emptyDesc:   { color: C.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
    emptyBtn:    { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, backgroundColor: C.primary },
    emptyBtnText:{ color: "#fff", fontSize: 15, fontWeight: "700" },

    logCard:     { backgroundColor: C.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
    logTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    logLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
    logSpotEmoji:{ fontSize: 24 },
    logSpotName: { color: C.text, fontSize: 16, fontWeight: "700" },
    logDate:     { color: C.textMuted, fontSize: 12, marginTop: 2 },
    logRight:    { flexDirection: "row", alignItems: "center", gap: 10 },
    condBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5 },
    condText:    { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
    deleteBtn:   { padding: 4 },

    logStats:    { flexDirection: "row", alignItems: "center", backgroundColor: C.bgSurface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
    logStat:     { flex: 1, alignItems: "center" },
    logStatVal:  { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 2 },
    logStatLabel:{ color: C.textSubtle, fontSize: 11, fontWeight: "600" },
    logStatDiv:  { width: 1, height: 28, backgroundColor: C.border },
    logNotes:    { color: C.textMuted, fontSize: 13, lineHeight: 20, marginTop: 12 },
  });
}

function makeMStyles(C: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet:   { backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderWidth: 1, borderColor: C.border },
    title:   { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 20 },
    label:   { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 14 },
    input:   { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgSurface, paddingHorizontal: 16, color: C.text, fontSize: 15 },

    spotRow:       { flexDirection: "row", gap: 10 },
    spotChip:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface },
    spotChipActive:{ borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    spotEmoji:     { fontSize: 16 },
    spotName:      { color: C.textMuted, fontSize: 14, fontWeight: "700" },
    spotNameActive:{ color: C.primary },

    btnRow:    { flexDirection: "row", gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    cancelText:{ color: C.textMuted, fontSize: 15, fontWeight: "600" },
    saveBtn:   { flex: 1, height: 50, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    saveText:  { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
}
