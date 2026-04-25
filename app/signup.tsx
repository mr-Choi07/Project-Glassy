import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");

  const sendVerification = () => {
    if (!phone) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setCodeSent(true);
  };

  const handleSignup = () => {
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError(""); router.replace({ pathname: "/" });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.orbTR} />
      <View style={styles.orbBL} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brand}>Glassy</Text>
            <Text style={styles.title}>계정을{"\n"}만들어보세요 🤙</Text>
            <Text style={styles.description}>3분이면 가입 완료. 지금 바로 파도를 분석하세요.</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>3분</Text>
                <Text style={styles.statLabel}>이내 완료</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>무료</Text>
                <Text style={styles.statLabel}>즉시 이용</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>AI</Text>
                <Text style={styles.statLabel}>코치 포함</Text>
              </View>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>기본 정보 입력</Text>
            <Text style={styles.cardMeta}>필수 항목만 먼저 입력합니다.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email} onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="email-address" autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                value={password} onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                style={[styles.input, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]}
                value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone} onChangeText={setPhone}
                  placeholder="010-1234-5678"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.verifyBtn} onPress={sendVerification}>
                  <Text style={styles.verifyBtnText}>인증</Text>
                </TouchableOpacity>
              </View>
            </View>

            {codeSent && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>인증번호</Text>
                <TextInput
                  style={styles.input}
                  value={verificationCode} onChangeText={setVerificationCode}
                  placeholder="123456"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup}>
              <Text style={styles.primaryBtnText}>회원가입</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <FontAwesome name="google" size={17} color="#EA4335" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.socialBtn}>
                  <FontAwesome name="apple" size={17} color={Colors.text} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/login" })}>
              <Text style={styles.footerLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  orbTR: {
    position: "absolute", top: -60, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(6,182,212,0.1)",
  },
  orbBL: {
    position: "absolute", bottom: -80, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(14,165,233,0.07)",
  },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
  header: { marginBottom: 24 },
  brand: {
    color: Colors.primary, fontSize: 15, fontWeight: "800",
    letterSpacing: 0.5, marginBottom: 20,
  },
  title: {
    color: Colors.text, fontSize: 32, fontWeight: "800",
    lineHeight: 40, marginBottom: 10,
  },
  description: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: Colors.text, fontSize: 16, fontWeight: "800", marginBottom: 3 },
  statLabel: { color: Colors.textSubtle, fontSize: 12 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24,
  },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  cardMeta: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    height: 52, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgSurface,
    paddingHorizontal: 16, color: Colors.text, fontSize: 15,
  },
  inputError: { borderColor: Colors.error },
  phoneRow: { flexDirection: "row", gap: 8 },
  phoneInput: { flex: 1 },
  verifyBtn: {
    minWidth: 74, height: 52, borderRadius: 14,
    backgroundColor: Colors.bgSurface, borderWidth: 1,
    borderColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  verifyBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 12 },
  primaryBtn: {
    height: 54, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgSurface,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  socialBtnText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  footerRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6,
  },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
