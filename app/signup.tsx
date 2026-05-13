import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  "621951191738-i394sbngqukd6fqjo10chmsrh4qkk0lm.apps.googleusercontent.com";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
  "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/network-request-failed": "네트워크 오류가 발생했습니다.",
};

export default function SignupScreen() {
  const router = useRouter();
  const { signup, loginWithGoogleToken, loginWithGooglePopup } = useAuth();

  const [displayName, setDisplayName]         = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: GOOGLE_WEB_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (idToken) handleGoogleSignIn(idToken);
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async (idToken: string) => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogleToken(idToken);
      router.replace("/(tabs)");
    } catch {
      setError("Google 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      if (Platform.OS === "web") {
        await loginWithGooglePopup();
        router.replace("/(tabs)");
      } else {
        if (!GOOGLE_WEB_CLIENT_ID) {
          Alert.alert("Google 로그인 설정 필요", "GOOGLE_WEB_CLIENT_ID를 입력해주세요.");
          return;
        }
        await googlePromptAsync();
      }
    } catch (e: any) {
      setError(`Google 오류: ${e.code ?? e.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!displayName.trim()) { setError("닉네임을 입력해주세요."); return; }
    if (!email.trim()) { setError("이메일을 입력해주세요."); return; }
    if (!password) { setError("비밀번호를 입력해주세요."); return; }
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }

    setLoading(true);
    setError("");
    try {
      await signup(email.trim(), password, displayName.trim(), phone.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(FIREBASE_ERRORS[e.code] ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.orbTR} />
      <View style={styles.orbBL} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <Text style={styles.cardMeta}>모든 항목을 입력해주세요.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>닉네임 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="서퍼 닉네임"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="6자 이상"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 확인 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, pwMismatch && styles.inputError]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry
              />
              {pwMismatch && (
                <Text style={styles.inlineError}>비밀번호가 일치하지 않습니다.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호 (선택)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="010-1234-5678"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>회원가입</Text>
              }
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin}>
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
  orbTR: { position: "absolute", top: -60, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(6,182,212,0.1)" },
  orbBL: { position: "absolute", bottom: -80, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(14,165,233,0.07)" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
  header: { marginBottom: 24 },
  brand: { color: Colors.primary, fontSize: 15, fontWeight: "800", letterSpacing: 0.5, marginBottom: 20 },
  title: { color: Colors.text, fontSize: 32, fontWeight: "800", lineHeight: 40, marginBottom: 10 },
  description: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: Colors.text, fontSize: 16, fontWeight: "800", marginBottom: 3 },
  statLabel: { color: Colors.textSubtle, fontSize: 12 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  card: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  cardMeta: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  required: { color: Colors.error },
  input: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurface, paddingHorizontal: 16, color: Colors.text, fontSize: 15 },
  inputError: { borderColor: Colors.error },
  inlineError: { color: Colors.error, fontSize: 12, marginTop: 4 },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  primaryBtn: { height: 54, borderRadius: 16, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSubtle, fontSize: 12, fontWeight: "600" },
  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  socialBtnText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
