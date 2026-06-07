import axios from "axios";
import { ALL_SPOTS_FLAT } from "@/constants/spots";
import { Bot, Send, Waves } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

const UPSTAGE_API_KEY = process.env.EXPO_PUBLIC_UPSTAGE_API_KEY!;

const SPOT_INFO: Record<string, { name: string; apiLat: number; apiLon: number }> = Object.fromEntries(
  ALL_SPOTS_FLAT.map(s => [s.id, { name: s.name, apiLat: s.apiLat, apiLon: s.apiLon }])
);

type SpotWave = { name: string; height: number; period: number; waterTemp: number };
type Message  = { id: string; text: string; sender: "user" | "bot" };
type Status   = "loading" | "online" | "offline";
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function fetchAllSpots(): Promise<SpotWave[]> {
  const h = new Date().getHours();
  const results = await Promise.allSettled(
    Object.values(SPOT_INFO).map(async info => {
      const res = await axios.get(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${info.apiLat}&longitude=${info.apiLon}&hourly=wave_height,wave_period,sea_surface_temperature&timezone=Asia%2FSeoul&forecast_days=1`,
      );
      return {
        name:      info.name,
        height:    res.data.hourly.wave_height[h]             ?? 0,
        period:    res.data.hourly.wave_period[h]             ?? 0,
        waterTemp: res.data.hourly.sea_surface_temperature[h] ?? 0,
      } as SpotWave;
    })
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<SpotWave>).value);
}

function TypingBubble({ C }: { C: any }) {
  // useRef는 배열 리터럴 안에서 호출 불가 (React Hooks 규칙) — Android 크래시 원인
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dots = [dot0, dot1, dot2];
  useEffect(() => {
    dots.forEach((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      ).start()
    );
  }, []);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border }}>
        <Bot size={14} color={C.primary} />
      </View>
      <View style={{ backgroundColor: C.bgCard, borderBottomLeftRadius: 4, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: 6 }}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary, opacity: dot }} />
        ))}
      </View>
    </View>
  );
}

export default function AIChatScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [status, setStatus]     = useState<Status>("loading");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages]   = useState<Message[]>([
    { id: uid("bot"), text: "안녕하세요! 🤙 Glassy AI 코치입니다. 오늘 서핑 컨디션이나 기술에 대해 무엇이든 물어보세요!", sender: "bot" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 항상 최신 system prompt를 sendMessage 클로저에서 참조하기 위해 ref 사용
  const systemPromptRef = useRef<string>("");

  useEffect(() => {
    fetchAllSpots()
      .then(spots => {
        if (spots.length > 0) {
          const dataLines = spots
            .map(s => `- ${s.name}: 파고 ${s.height.toFixed(1)}m, 파주기 ${Math.round(s.period)}s, 수온 ${s.waterTemp.toFixed(0)}°C`)
            .join("\n");
          systemPromptRef.current =
            `너는 전문 서핑 코치 'Glassy AI'야. 반드시 한국어로만 대답해. 영어·일본어 절대 금지.\n` +
            `현재 각 해변 실시간 데이터:\n${dataLines}\n` +
            `질문한 해변의 데이터를 사용해 답변해. 해당 해변 데이터가 없으면 솔직히 알려줘.`;
          setStatus("online");
        } else {
          systemPromptRef.current = `너는 전문 서핑 코치 'Glassy AI'야. 반드시 한국어로만 대답해. 영어·일본어 절대 금지. 일반적인 서핑 조언을 해줘.`;
          setStatus("offline");
        }
      })
      .catch(() => {
        systemPromptRef.current = `너는 전문 서핑 코치 'Glassy AI'야. 반드시 한국어로만 대답해. 영어·일본어 절대 금지. 일반적인 서핑 조언을 해줘.`;
        setStatus("offline");
      });
  }, []);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = { id: uid("user"), text, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch("https://api.upstage.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${UPSTAGE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "solar-mini",
          messages: [
            { role: "system", content: systemPromptRef.current },
            { role: "user",   content: text },
          ],
          max_tokens: 500,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages(prev => [...prev, { id: uid("bot"), text: data.choices[0].message.content.trim(), sender: "bot" }]);
      if (status !== "online") setStatus("online");
    } catch {
      setMessages(prev => [...prev, { id: uid("err"), text: "통신에 문제가 생겼어요. 다시 한번 말씀해주세요! 🌊", sender: "bot" }]);
      setStatus("offline");
    } finally {
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const statusColor = status === "online" ? C.success : status === "offline" ? C.error : C.textSubtle;
  const statusLabel = status === "online" ? "온라인" : status === "offline" ? "오프라인" : "연결 중";

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgWrapper, item.sender === "user" ? styles.msgRight : styles.msgLeft]}>
      {item.sender === "bot" && (
        <View style={styles.avatar}><Bot size={14} color={C.primary} /></View>
      )}
      <View style={[styles.bubble, item.sender === "user" ? styles.userBubble : styles.botBubble]}>
        {item.sender === "bot" && <Text style={styles.botName}>Glassy AI</Text>}
        <Text style={item.sender === "user" ? styles.userText : styles.botText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}><Waves size={18} color={C.primary} /></View>
          <View>
            <Text style={styles.headerTitle}>Glassy AI 코치</Text>
            <Text style={styles.headerSub}>서핑의 모든 것을 알고 있어요 🤙</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor + "55" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={isTyping ? <TypingBubble C={C} /> : null}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={84}
      >
        <View style={[styles.footer, isTyping && styles.footerDisabled]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, Platform.OS === "web" && { resize: "none" } as any, isTyping && styles.inputDisabled]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isTyping ? "답변을 기다리는 중..." : "오늘 파도 어때요?"}
              placeholderTextColor={C.textSubtle}
              onSubmitEditing={isTyping ? undefined : sendMessage}
              editable={!isTyping}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !isTyping && !!inputText.trim() && styles.sendBtnActive]}
              onPress={sendMessage}
              disabled={isTyping}
            >
              <Send size={18} color={!isTyping && inputText.trim() ? "#fff" : C.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea:  { flex: 1, backgroundColor: C.bg },
    container: { flex: 1 },

    header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
    headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    headerIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(14,165,233,0.2)" },
    headerTitle: { color: C.text, fontSize: 16, fontWeight: "800" },
    headerSub:   { color: C.textSubtle, fontSize: 12, fontWeight: "500", marginTop: 1 },

    statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: C.bgSurface },
    statusDot:   { width: 7, height: 7, borderRadius: 3.5 },
    statusText:  { fontSize: 12, fontWeight: "700" },

    chatList:   { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
    msgWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    msgRight:   { justifyContent: "flex-end" },
    msgLeft:    { justifyContent: "flex-start" },

    avatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    bubble:     { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    userBubble: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
    botBubble:  { backgroundColor: C.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
    botName:    { color: C.primary, fontSize: 11, fontWeight: "800", marginBottom: 4, letterSpacing: 0.3 },
    userText:   { color: "#fff", fontSize: 15, lineHeight: 22 },
    botText:    { color: C.text, fontSize: 15, lineHeight: 22 },

    footer:          { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 96, backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.border },
    footerDisabled:  { opacity: 0.5 },
    inputDisabled:   { backgroundColor: C.bgSurface },
    inputRow:      { flexDirection: "row", alignItems: "flex-end", gap: 10 },
    input:         { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: C.bgSurface, borderRadius: 23, paddingHorizontal: 18, paddingVertical: 12, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
    sendBtn:       { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    sendBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  });
}
