import { GoogleGenerativeAI } from "@google/generative-ai";
import { Bot, Send, Waves } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ⚠️ 실제 발급받은 API 키를 입력하세요
const API_KEY = "AIzaSyAVksNaNgOquObDjm23Qq_I__4UpMfCyqw";
const genAI = new GoogleGenerativeAI(API_KEY);

export default function AIChatScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "initial-1",
      text: "안녕하세요, 승재 코치님! Glassy AI 2.5입니다. 오늘 서핑에 대해 무엇을 도와드릴까요?",
      sender: "bot",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Gemini 2.5 Flash 모델 설정
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const sendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length === 0) return;

    // 중복 키 에러($error) 원천 차단 ID 생성
    const generateId = (prefix: string) =>
      `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const userMessage = {
      id: generateId("user"),
      text: trimmedInput,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `너는 전문 서핑 코치 'Glassy AI'야. 친절하게 대답해줘: ${trimmedInput}`,
              },
            ],
          },
        ],
      });

      const response = await result.response;
      const botMessage = {
        id: generateId("bot"),
        text: response.text(),
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("채팅 에러:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId("err"),
          text: "통신에 문제가 생겼어요. 다시 한번 말씀해주세요!",
          sender: "bot",
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
    }
  };

  const renderMessage = ({ item }: any) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender === "user"
          ? { alignItems: "flex-end" }
          : { alignItems: "flex-start" },
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === "user" ? styles.userBubble : styles.botBubble,
        ]}
      >
        {item.sender === "bot" && (
          <View style={styles.botHeader}>
            <Bot size={14} color="#007AFF" style={{ marginRight: 4 }} />
            <Text style={styles.botNameText}>Glassy AI</Text>
          </View>
        )}
        <Text style={item.sender === "user" ? styles.userText : styles.botText}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Waves size={20} color="#007AFF" />
          <Text style={styles.headerTitle}>Glassy AI 코치</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingIndicator}>파도 분석 중...</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor="#ADB5BD"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() ? "#007AFF" : "#E9ECEF" },
              ]}
              onPress={sendMessage}
            >
              <Send size={18} color={inputText.trim() ? "#fff" : "#ADB5BD"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    height: 60,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212529",
    marginLeft: 8,
  },
  chatList: { paddingHorizontal: 15, paddingVertical: 20 },
  messageWrapper: { width: "100%", marginBottom: 12 },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: { backgroundColor: "#007AFF", borderBottomRightRadius: 4 },
  botBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  botHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  botNameText: { fontSize: 12, color: "#007AFF", fontWeight: "700" },
  userText: { color: "#fff", lineHeight: 22, fontSize: 15 },
  botText: { color: "#212529", lineHeight: 22, fontSize: 15 },
  typingContainer: { paddingHorizontal: 20, marginBottom: 10 },
  typingIndicator: { color: "#888", fontSize: 12, fontStyle: "italic" },
  footerContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 120 : 100, // 탭 바 높이 대응
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  input: { flex: 1, fontSize: 15, color: "#212529" },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
