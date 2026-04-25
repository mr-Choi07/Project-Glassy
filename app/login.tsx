import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    router.replace({ pathname: "/" });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundAccent} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Glassy</Text>
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.description}>
              이메일과 비밀번호를 입력하고 바로 시작하세요.
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.infoChip}>
                <Text style={styles.infoValue}>Live</Text>
                <Text style={styles.infoLabel}>상태 확인</Text>
              </View>
              <View style={styles.infoChip}>
                <Text style={styles.infoValue}>Clean</Text>
                <Text style={styles.infoLabel}>차트 화면</Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>계정으로 계속하기</Text>
                <Text style={styles.cardMeta}>입력한 정보는 안전하게 보호됩니다.</Text>
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Secure</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inlineRow}>
                <Text style={styles.label}>비밀번호</Text>
                <Text style={styles.helper}>비밀번호 찾기</Text>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>로그인</Text>
            </TouchableOpacity>

            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>또는</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton}>
                <FontAwesome name="google" size={18} color="#EA4335" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" ? (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                >
                  <FontAwesome name="apple" size={18} color="#0F172A" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/signup" })}>
              <Text style={styles.footerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  backgroundAccent: {
    position: "absolute",
    top: -60,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#E0F2FE",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 24,
  },
  brand: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  title: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 13,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    color: "#64748B",
    fontSize: 13,
  },
  cardBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 14,
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  helper: {
    color: "#64748B",
    fontSize: 12,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#0F172A",
    fontSize: 15,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  separatorText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  appleButton: {
    backgroundColor: "#F8FAFC",
  },
  socialButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
  },
  footerLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
});
