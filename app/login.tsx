import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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

// Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration → Web client ID
const GOOGLE_WEB_CLIENT_ID = "621951191738-i394sbngqukd6fqjo10chmsrh4qkk0lm.apps.googleusercontent.com";

// Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → iOS 앱용 OAuth 2.0 클라이언트 ID
// 번들 ID: com.seungjae.glassy 로 생성 후 아래에 입력
const GOOGLE_IOS_CLIENT_ID = "621951191738-dmps3j5sieg86fq929tk5ukp59h26elc.apps.googleusercontent.com";  // TODO: iOS 클라이언트 ID 입력 필요

// Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → Android 앱용 OAuth 2.0 클라이언트 ID
const GOOGLE_ANDROID_CLIENT_ID = "621951191738-vutdheqr1jm6vjfhubp71tki9vpiuo9g.apps.googleusercontent.com"; // TODO: Android 클라이언트 ID 입력 필요

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  "auth/user-not-found": "등록되지 않은 이메일입니다.",
  "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/too-many-requests": "너무 많은 시도입니다. 잠시 후 다시 시도해주세요.",
  "auth/user-disabled": "비활성화된 계정입니다.",
  "auth/network-request-failed": "네트워크 오류가 발생했습니다.",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, resetPassword, loginWithGoogleToken, loginWithGooglePopup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Expo Go 테스트용 프록시 리다이렉트 URI
  // Google Cloud Console 웹 클라이언트 → 승인된 리디렉션 URI에 아래 주소 추가 필요
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "projectglassy" });

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (idToken) {
        handleGoogleSignIn(idToken);
      }
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async (idToken: string) => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogleToken(idToken);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(`Google 오류: ${e.code ?? e.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === "web") {
      setLoading(true);
      setError("");
      try {
        await loginWithGooglePopup();
        router.replace("/(tabs)");
      } catch (e: any) {
        setError(`Google 오류: ${e.code ?? e.message ?? String(e)}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 네이티브: iOS/Android 전용 클라이언트 ID 미설정 안내
    const missingId = Platform.OS === "ios" ? !GOOGLE_IOS_CLIENT_ID : !GOOGLE_ANDROID_CLIENT_ID;
    if (missingId) {
      Alert.alert(
        "Google 로그인 설정 필요",
        `Google Cloud Console에서 ${Platform.OS === "ios" ? "iOS" : "Android"} OAuth 클라이언트 ID를 생성 후 앱에 입력해주세요.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      await googlePromptAsync();
    } catch (e: any) {
      setError(`Google 오류: ${e.code ?? e.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(FIREBASE_ERRORS[e.code] ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setResetModal(true);
  };

  const handleResetSubmit = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("오류", "이메일을 입력해주세요.");
      return;
    }
    try {
      await resetPassword(resetEmail.trim());
      setResetModal(false);
      Alert.alert("전송 완료", `${resetEmail}로 재설정 링크를 전송했습니다.`);
    } catch {
      Alert.alert("오류", "이메일을 확인해주세요.");
    }
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
            <Text style={styles.title}>다시 만나서{"\n"}반갑습니다 👋</Text>
            <Text style={styles.description}>계정에 로그인하여 오늘의 파도를 확인하세요.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={[styles.input, emailFocus && styles.inputFocus]}
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>비밀번호</Text>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotLink}>비밀번호 찾기</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, pwFocus && styles.inputFocus]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>로그인</Text>
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
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/signup" })}>
              <Text style={styles.footerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 비밀번호 재설정 모달 (Alert.prompt 대체 — Android 호환) */}
      <Modal visible={resetModal} transparent animationType="fade" onRequestClose={() => setResetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>비밀번호 재설정</Text>
            <Text style={styles.modalDesc}>가입한 이메일을 입력하면 재설정 링크를 보내드립니다.</Text>
            <TextInput
              style={styles.modalInput}
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="example@mail.com"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setResetModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleResetSubmit}>
                <Text style={styles.modalConfirmText}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  orbTR: {
    position: "absolute", top: -60, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(14,165,233,0.1)",
  },
  orbBL: {
    position: "absolute", bottom: -80, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(6,182,212,0.07)",
  },
  content: {
    flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28,
    justifyContent: "center",
  },
  header: { marginBottom: 28 },
  brand: {
    color: Colors.primary, fontSize: 15, fontWeight: "800",
    letterSpacing: 0.5, marginBottom: 20,
  },
  title: {
    color: Colors.text, fontSize: 32, fontWeight: "800",
    lineHeight: 40, marginBottom: 10,
  },
  description: { color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  forgotLink: { color: Colors.primary, fontSize: 12, fontWeight: "600" },
  input: {
    height: 52, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgSurface,
    paddingHorizontal: 16, color: Colors.text, fontSize: 15,
  },
  inputFocus: { borderColor: Colors.borderFocus },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 12 },
  primaryBtn: {
    height: 54, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
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
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 6,
  },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: "700" },

  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 28 },
  modalBox:         { width: "100%", backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitle:       { color: Colors.text, fontSize: 17, fontWeight: "800", marginBottom: 8 },
  modalDesc:        { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  modalInput:       { height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurface, paddingHorizontal: 14, color: Colors.text, fontSize: 15, marginBottom: 20 },
  modalBtnRow:      { flexDirection: "row", gap: 10 },
  modalCancelBtn:   { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  modalCancelText:  { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  modalConfirmBtn:  { flex: 1, height: 46, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
