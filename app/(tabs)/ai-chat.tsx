import { GoogleGenerativeAI } from "@google/generative-ai";
import { Bot, Send, Waves } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { Colors } from "@/constants/theme";

const API_KEY = "AIzaSyAVksNaNgOquObDjm23Qq_I__4UpMfCyqw";
const genAI = new GoogleGenerativeAI(API_KEY);

type Message = { id: string; text: string; sender: "user" | "bot" };
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AIChatScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid("bot"),
      text: "안녕하세요! 🤙 Glassy AI 코치입니다. 오늘 서핑 컨디션이나 기술에 대해 무엇이든 물어보세요!",
      sender: "bot",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = { id: uid("user"), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `너는 전문 서핑 코치 'Glassy AI'야. 친절하고 전문적으로 대답해줘: ${text}` }] }],
      });
      const botMsg: Message = { id: uid("bot"), text: result.response.text(), sender: "bot" };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: uid("err"), text: "통신에 문제가 생겼어요. 다시 한번 말씀해주세요! 🌊", sender: "bot" }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgWrapper, item.sender === "user" ? styles.msgRight : styles.msgLeft]}>
      {item.sender === "bot" && (
        <View style={styles.avatar}>
          <Bot size={14} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, item.sender === "user" ? styles.userBubble : styles.botBubble]}>
        {item.sender === "bot" && <Text style={styles.botName}>Glassy AI</Text>}
        <Text style={item.sender === "user" ? styles.userText : styles.botText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Waves size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Glassy AI 코치</Text>
              <Text style={styles.headerSub}>서핑의 모든 것을 알고 있어요 🤙</Text>
            </View>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>온라인</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingRow}>
            <View style={styles.typingDots}>
              {[0,1,2].map((i) => <View key={i} style={[styles.tDot, i === 1 && styles.tDotMid]} />)}
            </View>
            <Text style={styles.typingText}>파도 분석 중...</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.footer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="오늘 파도 어때요?"
              placeholderTextColor={Colors.textSubtle}
              onSubmitEditing={sendMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !!inputText.trim() && styles.sendBtnActive]}
              onPress={sendMessage}
            >
              <Send size={18} color={inputText.trim() ? "#fff" : Colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: Colors.bg },
  container:     { flex: 1 },

  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(14,165,233,0.2)" },
  headerTitle:   { color: Colors.text, fontSize: 16, fontWeight: "800" },
  headerSub:     { color: Colors.textSubtle, fontSize: 12, fontWeight: "500", marginTop: 1 },
  onlineBadge:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  onlineDot:     { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  onlineText:    { color: Colors.success, fontSize: 12, fontWeight: "700" },

  chatList:      { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  msgWrapper:    { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRight:      { justifyContent: "flex-end" },
  msgLeft:       { justifyContent: "flex-start" },

  avatar:        { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(14,165,233,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  bubble:        { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble:    { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble:     { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },

  botName:       { color: Colors.primary, fontSize: 11, fontWeight: "800", marginBottom: 4, letterSpacing: 0.3 },
  userText:      { color: "#fff", fontSize: 15, lineHeight: 22 },
  botText:       { color: Colors.text, fontSize: 15, lineHeight: 22 },

  typingRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  typingDots:    { flexDirection: "row", gap: 4 },
  tDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSubtle },
  tDotMid:       { backgroundColor: Colors.textMuted },
  typingText:    { color: Colors.textSubtle, fontSize: 12, fontStyle: "italic" },

  footer:        { paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 110 : 90, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },
  inputRow:      { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input:         { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: Colors.bgSurface, borderRadius: 23, paddingHorizontal: 18, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  sendBtn:       { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  sendBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
