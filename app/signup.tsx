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
    if (!phone) {
      setError("전화번호를 입력해주세요.");
      return;
    }

    setError("");
    setCodeSent(true);
  };

  const handleSignup = () => {
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setError("");
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
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.description}>
              기본 정보만 입력하면 바로 시작할 수 있어요.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>3분 이내</Text>
                <Text style={styles.summaryLabel}>가입 완료</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>간단 인증</Text>
                <Text style={styles.summaryLabel}>전화번호 확인</Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>기본 정보 입력</Text>
              <Text style={styles.cardMeta}>필수 항목만 먼저 입력합니다.</Text>
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
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="010-1234-5678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={sendVerification}
                >
                  <Text style={styles.verifyButtonText}>인증</Text>
                </TouchableOpacity>
              </View>
            </View>

            {codeSent ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>인증번호</Text>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
              <Text style={styles.primaryButtonText}>회원가입</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  backgroundAccent: {
    position: "absolute",
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#DBEAFE",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
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
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
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
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  phoneInput: {
    flex: 1,
  },
  verifyButton: {
    minWidth: 74,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
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
