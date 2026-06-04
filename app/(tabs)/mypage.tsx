import { useTheme } from "@/context/ThemeContext";
import { ThemeColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { SpotId } from "@/lib/userService";
import { REGION_GROUPS, SPOT_REGIONS } from "@/constants/spots";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Camera,
  Check,
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Sun,
  Trash2,
  User,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Derived from the central spots registry
const SURF_SPOT_REGIONS = SPOT_REGIONS.map(r => ({
  id: r.id,
  label: r.label,
  spots: r.spots.map(s => ({ id: s.id as SpotId, name: s.name, emoji: s.emoji })),
}));

type ModalType = "nickname" | "email" | "phone" | "delete" | null;

export default function MyPageScreen() {
  const router = useRouter();
  const { colors: C, isDark, toggle: toggleTheme } = useTheme();
  const styles  = useMemo(() => makeStyles(C), [C]);
  const mStyles = useMemo(() => makeMStyles(C), [C]);

  const {
    user,
    userProfile,
    logout,
    updateNickname,
    setSelectedSpots,
    updatePhoto,
    updateUserEmail,
    updatePhone,
    deleteAccount,
  } = useAuth();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalError, setModalError]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [spotSaving, setSpotSaving]   = useState(false);
  const [spotModalOpen, setSpotModalOpen]         = useState(false);
  const [spotGroupActive, setSpotGroupActive]     = useState(REGION_GROUPS[0]?.id ?? "");
  const [spotSubActive, setSpotSubActive]         = useState(REGION_GROUPS[0]?.subIds[0] ?? "");

  const spotSubRegions = useMemo(() => {
    const group = REGION_GROUPS.find(g => g.id === spotGroupActive);
    return (group?.subIds ?? []).map(id => SPOT_REGIONS.find(r => r.id === id)!).filter(Boolean);
  }, [spotGroupActive]);
  const spotCurrentSpots = useMemo(() => {
    if (spotSubRegions.length <= 1) return spotSubRegions[0]?.spots ?? [];
    return spotSubRegions.find(r => r.id === spotSubActive)?.spots ?? [];
  }, [spotSubRegions, spotSubActive]);

  const [newNickname, setNewNickname] = useState("");
  const [newEmail, setNewEmail]       = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [newPhone, setNewPhone]       = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const selectedSpotIds: SpotId[] = userProfile?.selectedSpotIds ?? [];
  const isGoogleUser = user?.providerData.some(p => p.providerId === "google.com") ?? false;

  function openModal(type: ModalType) {
    setModalError("");
    setActiveModal(type);
    if (type === "nickname") setNewNickname(userProfile?.displayName || "");
    if (type === "email") { setNewEmail(userProfile?.email || user?.email || ""); setEmailPassword(""); }
    if (type === "phone") setNewPhone(userProfile?.phoneNumber || "");
    if (type === "delete") setDeletePassword("");
  }

  function closeModal() {
    setActiveModal(null);
    setModalError("");
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("권한 필요", "사진 접근 권한이 필요합니다."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) { Alert.alert("오류", "이미지 데이터를 읽을 수 없습니다."); return; }
      setPhotoLoading(true);
      try {
        await updatePhoto(asset.uri, asset.base64);
        Alert.alert("완료", "프로필 사진이 변경되었습니다.");
      } catch (e: any) {
        Alert.alert("오류", `사진 업로드 실패: ${e.message ?? String(e)}`);
      } finally {
        setPhotoLoading(false);
      }
    }
  };

  const handleToggleSpot = async (spotId: SpotId) => {
    setSpotSaving(true);
    try {
      const next: SpotId[] = selectedSpotIds.includes(spotId)
        ? selectedSpotIds.filter(id => id !== spotId)
        : [...selectedSpotIds, spotId];
      await Promise.race([
        setSelectedSpots(next),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("연결 시간 초과. Firebase 보안 규칙을 확인하세요.")), 8000),
        ),
      ]);
    } catch (e: any) {
      const msg = e?.code === "permission-denied"
        ? "Firestore 권한 오류 — Firebase Console에서 보안 규칙을 확인하세요."
        : e.message ?? String(e);
      Alert.alert("저장 실패", msg);
    } finally {
      setSpotSaving(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) { setModalError("닉네임을 입력해주세요."); return; }
    setSaving(true);
    try { await updateNickname(newNickname.trim()); closeModal(); Alert.alert("완료", "닉네임이 변경되었습니다."); }
    catch (e: any) { setModalError(`변경 실패: ${e.message ?? String(e)}`); }
    finally { setSaving(false); }
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) { setModalError("이메일을 입력해주세요."); return; }
    if (!emailPassword) { setModalError("현재 비밀번호를 입력해주세요."); return; }
    setSaving(true);
    try { await updateUserEmail(newEmail.trim(), emailPassword); closeModal(); Alert.alert("완료", "이메일이 변경되었습니다."); }
    catch (e: any) {
      const code = e.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") setModalError("비밀번호가 올바르지 않습니다.");
      else if (code === "auth/email-already-in-use") setModalError("이미 사용 중인 이메일입니다.");
      else setModalError(`변경 실패: ${e.message ?? String(e)}`);
    }
    finally { setSaving(false); }
  };

  const handleSavePhone = async () => {
    if (!newPhone.trim()) { setModalError("전화번호를 입력해주세요."); return; }
    setSaving(true);
    try { await updatePhone(newPhone.trim()); closeModal(); Alert.alert("완료", "전화번호가 변경되었습니다."); }
    catch (e: any) { setModalError(`변경 실패: ${e.message ?? String(e)}`); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      await deleteAccount(deletePassword || undefined);
    } catch (e: any) {
      const code = e.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") setModalError("비밀번호가 올바르지 않습니다.");
      else if (code === "auth/requires-recent-login") setModalError("보안을 위해 다시 로그인 후 탈퇴해주세요.");
      else if (code === "auth/popup-closed-by-user") setModalError("Google 인증 창을 닫았습니다. 다시 시도해주세요.");
      else setModalError(`탈퇴 실패: ${e.message ?? String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try { await logout(); } catch (e) {}
      router.replace("/intro");
    };
    if (Platform.OS === "web") {
      if ((window as any).confirm("로그아웃 하시겠습니까?")) await doLogout();
    } else {
      Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const displayName = userProfile?.displayName || user?.displayName || "서퍼";
  const email       = userProfile?.email || user?.email || "";
  const phone       = userProfile?.phoneNumber || "";
  const photoURL    = userProfile?.photoURL || user?.photoURL;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickPhoto} disabled={photoLoading}>
            {photoURL
              ? <Image source={{ uri: photoURL }} style={styles.avatar} />
              : <View style={styles.avatarPlaceholder}><User size={32} color={C.textSubtle} /></View>
            }
            <View style={styles.cameraBtn}>
              {photoLoading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={13} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.row} onPress={() => openModal("nickname")}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><User size={16} color={C.primary} /></View>
                <View><Text style={styles.rowLabel}>닉네임</Text><Text style={styles.rowValue}>{displayName}</Text></View>
              </View>
              <ChevronRight size={16} color={C.textSubtle} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => openModal("email")}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Mail size={16} color={C.primary} /></View>
                <View><Text style={styles.rowLabel}>이메일</Text><Text style={styles.rowValue}>{email || "미설정"}</Text></View>
              </View>
              <ChevronRight size={16} color={C.textSubtle} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => openModal("phone")}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Phone size={16} color={C.primary} /></View>
                <View><Text style={styles.rowLabel}>전화번호</Text><Text style={styles.rowValue}>{phone || "미설정"}</Text></View>
              </View>
              <ChevronRight size={16} color={C.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 스팟 선택 버튼 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선호 서핑 스팟</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.row} onPress={() => setSpotModalOpen(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><MapPin size={16} color={C.primary} /></View>
                <View>
                  <Text style={styles.rowLabel}>스팟 선택</Text>
                  <Text style={styles.rowValue}>
                    {selectedSpotIds.length === 0
                      ? "선택된 스팟 없음"
                      : `${selectedSpotIds.length}개 선택됨`}
                  </Text>
                </View>
              </View>
              {spotSaving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <ChevronRight size={16} color={C.textSubtle} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>
          <View style={styles.sectionCard}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}>
                  {isDark
                    ? <Moon size={16} color={C.primary} />
                    : <Sun size={16} color={C.warning} />
                  }
                </View>
                <Text style={styles.rowLabel}>{isDark ? "다크 모드" : "라이트 모드"}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "rgba(0,0,0,0.12)", true: `${C.primary}55` }}
                thumbColor={isDark ? C.primary : "#94A3B8"}
              />
            </View>
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: "rgba(148,163,184,0.1)" }]}>
                  <LogOut size={16} color={C.textMuted} />
                </View>
                <Text style={styles.rowLabel}>로그아웃</Text>
              </View>
              <ChevronRight size={16} color={C.textSubtle} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={() => openModal("delete")}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
                  <Trash2 size={16} color={C.error} />
                </View>
                <Text style={[styles.rowLabel, { color: C.error }]}>회원 탈퇴</Text>
              </View>
              <ChevronRight size={16} color={C.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 닉네임 모달 */}
      <Modal visible={activeModal === "nickname"} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={mStyles.overlay}>
          <View style={mStyles.card}>
            <Text style={mStyles.title}>닉네임 변경</Text>
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>새 닉네임</Text>
              <TextInput style={mStyles.input} value={newNickname} onChangeText={setNewNickname} placeholderTextColor={C.textSubtle} placeholder="닉네임 입력" autoFocus />
            </View>
            {modalError ? <Text style={mStyles.error}>{modalError}</Text> : null}
            <View style={mStyles.btnRow}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={closeModal}><Text style={mStyles.cancelText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveNickname} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이메일 모달 */}
      <Modal visible={activeModal === "email"} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={mStyles.overlay}>
          <View style={mStyles.card}>
            <Text style={mStyles.title}>이메일 변경</Text>
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>새 이메일</Text>
              <TextInput style={mStyles.input} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={C.textSubtle} placeholder="새 이메일 주소" autoFocus />
            </View>
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>현재 비밀번호</Text>
              <TextInput style={mStyles.input} value={emailPassword} onChangeText={setEmailPassword} secureTextEntry placeholderTextColor={C.textSubtle} placeholder="현재 비밀번호 확인" />
            </View>
            {modalError ? <Text style={mStyles.error}>{modalError}</Text> : null}
            <View style={mStyles.btnRow}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={closeModal}><Text style={mStyles.cancelText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveEmail} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 전화번호 모달 */}
      <Modal visible={activeModal === "phone"} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={mStyles.overlay}>
          <View style={mStyles.card}>
            <Text style={mStyles.title}>전화번호 변경</Text>
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>전화번호</Text>
              <TextInput style={mStyles.input} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" placeholderTextColor={C.textSubtle} placeholder="010-1234-5678" autoFocus />
            </View>
            {modalError ? <Text style={mStyles.error}>{modalError}</Text> : null}
            <View style={mStyles.btnRow}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={closeModal}><Text style={mStyles.cancelText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSavePhone} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 탈퇴 모달 */}
      <Modal visible={activeModal === "delete"} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={mStyles.overlay}>
          <View style={mStyles.card}>
            <Text style={[mStyles.title, { color: C.error }]}>⚠️ 회원 탈퇴</Text>
            <Text style={mStyles.deleteWarning}>탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</Text>
            {isGoogleUser ? (
              <Text style={mStyles.deleteWarning}>Google 계정으로 로그인했습니다. 탈퇴 시 Google 인증 팝업이 열립니다.</Text>
            ) : (
              <View style={mStyles.fieldGroup}>
                <Text style={mStyles.fieldLabel}>비밀번호 확인</Text>
                <TextInput style={mStyles.input} value={deletePassword} onChangeText={setDeletePassword} secureTextEntry placeholderTextColor={C.textSubtle} placeholder="현재 비밀번호" autoFocus />
              </View>
            )}
            {modalError ? <Text style={mStyles.error}>{modalError}</Text> : null}
            <View style={mStyles.btnRow}>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={closeModal}><Text style={mStyles.cancelText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: C.error }, saving && { opacity: 0.6 }]} onPress={handleDeleteAccount} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveText}>탈퇴</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 스팟 선택 팝업 모달 */}
      <Modal visible={spotModalOpen} transparent animationType="slide" onRequestClose={() => setSpotModalOpen(false)}>
        {/* 빈 공간 터치 시 닫기 */}
        <Pressable style={styles.spotModalOverlay} onPress={() => setSpotModalOpen(false)}>
          <Pressable style={styles.spotModalSheet} onPress={() => {}}>

            {/* 핸들바 */}
            <View style={styles.spotModalHandle} />

            {/* 헤더 */}
            <View style={styles.spotModalHeader}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.spotModalTitle}>서핑 스팟 선택</Text>
                {selectedSpotIds.length > 0 && (
                  <View style={styles.spotModalCount}>
                    <Text style={styles.spotModalCountText}>{selectedSpotIds.length}개 선택</Text>
                  </View>
                )}
              </View>
              <Text style={styles.spotModalSub}>선택한 스팟이 홈 화면 탭에 표시됩니다</Text>
            </View>

            {/* 1단계: 통합 지역 탭 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotModalTabScroll} contentContainerStyle={styles.spotModalTabContent}>
              {REGION_GROUPS.map(group => {
                const isActive = group.id === spotGroupActive;
                const selCount = group.subIds.reduce((n, id) => {
                  const r = SPOT_REGIONS.find(x => x.id === id);
                  return n + (r?.spots.filter(s => selectedSpotIds.includes(s.id)).length ?? 0);
                }, 0);
                return (
                  <TouchableOpacity key={group.id}
                    style={[styles.spotModalTab, isActive && styles.spotModalTabActive]}
                    onPress={() => { setSpotGroupActive(group.id); setSpotSubActive(group.subIds[0]); }}
                  >
                    <Text style={[styles.spotModalTabText, isActive && styles.spotModalTabTextActive]}>{group.label}</Text>
                    {selCount > 0 && <View style={styles.spotModalTabDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2단계: 세부 탭 (2개 이상일 때만) */}
            {spotSubRegions.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotModalSubScroll} contentContainerStyle={styles.spotModalSubContent}>
                {spotSubRegions.map(sub => {
                  const isActive = sub.id === spotSubActive;
                  const selCnt = sub.spots.filter(s => selectedSpotIds.includes(s.id)).length;
                  return (
                    <TouchableOpacity key={sub.id}
                      style={[styles.spotModalSubTab, isActive && styles.spotModalSubTabActive]}
                      onPress={() => setSpotSubActive(sub.id)}
                    >
                      <Text style={[styles.spotModalSubText, isActive && styles.spotModalSubTextActive]} numberOfLines={1}>
                        {sub.label.replace(/^강원 /, "").replace(/^경북 /, "")}
                      </Text>
                      {selCnt > 0 && <View style={[styles.spotModalTabDot, { backgroundColor: C.success }]} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 스팟 목록 */}
            <ScrollView style={styles.spotModalBody} contentContainerStyle={styles.spotModalBodyContent} showsVerticalScrollIndicator={false}>
              <View style={styles.spotRow}>
                {spotCurrentSpots.map(spot => {
                  const active = selectedSpotIds.includes(spot.id);
                  return (
                    <TouchableOpacity
                      key={spot.id}
                      style={[styles.spotChip, active && styles.spotChipActive]}
                      onPress={() => handleToggleSpot(spot.id)}
                      disabled={spotSaving}
                    >
                      <Text style={styles.spotEmoji}>{spot.emoji}</Text>
                      <Text style={[styles.spotName, active && styles.spotNameActive]} numberOfLines={1}>{spot.name}</Text>
                      {active && <Check size={13} color={C.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 선택 순서 변경 */}
              {selectedSpotIds.length > 1 && (
                <View style={styles.orderSection}>
                  <Text style={styles.orderTitle}>홈 화면 표시 순서</Text>
                  {selectedSpotIds.map((id, idx) => {
                    const spotInfo = SURF_SPOT_REGIONS.flatMap(r => r.spots).find(s => s.id === id);
                    if (!spotInfo) return null;
                    return (
                      <View key={id} style={styles.orderRow}>
                        <Text style={styles.orderNum}>{idx + 1}</Text>
                        <Text style={styles.orderEmoji}>{spotInfo.emoji}</Text>
                        <Text style={styles.orderName}>{spotInfo.name}</Text>
                        <View style={styles.orderBtns}>
                          <TouchableOpacity
                            style={[styles.orderBtn, idx === 0 && { opacity: 0.3 }]}
                            disabled={idx === 0}
                            onPress={async () => {
                              const next = [...selectedSpotIds];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              await setSelectedSpots(next);
                            }}
                          >
                            <Text style={styles.orderBtnText}>↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.orderBtn, idx === selectedSpotIds.length - 1 && { opacity: 0.3 }]}
                            disabled={idx === selectedSpotIds.length - 1}
                            onPress={async () => {
                              const next = [...selectedSpotIds];
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                              await setSelectedSpots(next);
                            }}
                          >
                            <Text style={styles.orderBtnText}>↓</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* 완료 버튼 */}
            <View style={styles.spotModalFooter}>
              <TouchableOpacity style={styles.spotModalDoneBtn} onPress={() => setSpotModalOpen(false)}>
                {spotSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.spotModalDoneText}>완료</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12 },

    header: { marginBottom: 24 },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: "800" },

    profileCard: { alignItems: "center", backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
    avatarWrap: { position: "relative", marginBottom: 14 },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: C.primary },
    avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.bgSurface, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    cameraBtn: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
    profileName: { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
    profileEmail: { color: C.textMuted, fontSize: 14 },

    section: { marginBottom: 20 },
    sectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10, paddingLeft: 4 },
    sectionCard: { backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: "hidden" },

    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(14,165,233,0.1)", alignItems: "center", justifyContent: "center" },
    rowLabel: { color: C.text, fontSize: 15, fontWeight: "600" },
    rowValue: { color: C.textMuted, fontSize: 13, marginTop: 2 },
    rowDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 18 },

    spotHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
    spotHeaderText: { color: C.textMuted, fontSize: 13 },
    spotRegionHeader: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.border },
    spotRegionLabel: { color: C.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
    spotRow: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingBottom: 12, flexWrap: "wrap" },
    spotChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, minWidth: 80, justifyContent: "center" },
    spotChipActive: { borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    spotEmoji: { fontSize: 14 },
    spotName: { color: C.textMuted, fontSize: 14, fontWeight: "700" },
    spotNameActive: { color: C.primary },
    spotSavingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingBottom: 14 },

    // 스팟 팝업 모달
    spotModalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    spotModalSheet:        { backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border, maxHeight: "88%" },
    spotModalHandle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 10, marginBottom: 4 },
    spotModalHeader:       { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 12 },
    spotModalTitle:        { color: C.text, fontSize: 19, fontWeight: "800", marginBottom: 4 },
    spotModalSub:          { color: C.textMuted, fontSize: 13, marginTop: 4 },
    spotModalCount:        { backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(14,165,233,0.25)" },
    spotModalCountText:    { color: C.primary, fontSize: 12, fontWeight: "700" },
    spotModalTabScroll:    { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
    spotModalTabContent:   { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    spotModalTab:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgSurface, flexDirection: "row", alignItems: "center", gap: 5 },
    spotModalTabActive:    { borderColor: C.primary, backgroundColor: "rgba(14,165,233,0.12)" },
    spotModalTabText:      { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    spotModalTabTextActive:{ color: C.primary },
    spotModalTabDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
    spotModalSubScroll:    { borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bgSurface },
    spotModalSubContent:   { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    spotModalSubTab:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 4 },
    spotModalSubTabActive: { backgroundColor: "rgba(14,165,233,0.12)" },
    spotModalSubText:      { color: C.textSubtle, fontSize: 12, fontWeight: "700" },
    spotModalSubTextActive:{ color: C.primary },
    spotModalBody:         { flexGrow: 0, maxHeight: 380 },
    spotModalBodyContent:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    spotModalFooter:       { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border },
    spotModalDoneBtn:      { height: 50, borderRadius: 16, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    spotModalDoneText:     { color: "#fff", fontSize: 16, fontWeight: "800" },

    // 순서 변경 섹션
    orderSection:  { marginTop: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
    orderTitle:    { color: C.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.3, marginBottom: 10 },
    orderRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10, borderRadius: 12, paddingHorizontal: 4 },
    orderNum:      { color: C.textSubtle, fontSize: 13, fontWeight: "700", width: 18, textAlign: "center" },
    orderEmoji:    { fontSize: 18, width: 24, textAlign: "center" },
    orderName:     { flex: 1, color: C.text, fontSize: 14, fontWeight: "600" },
    orderBtns:     { flexDirection: "row", gap: 6 },
    orderBtn:      { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    orderBtnText:  { color: C.text, fontSize: 14, fontWeight: "700" },
    spotSavingText: { color: C.textMuted, fontSize: 13 },
  });
}

function makeMStyles(C: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
    card: { width: "100%", maxWidth: 400, backgroundColor: C.bgCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border },
    title: { color: C.text, fontSize: 18, fontWeight: "800", marginBottom: 20 },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: { color: C.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
    input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgSurface, paddingHorizontal: 16, color: C.text, fontSize: 15 },
    error: { color: C.error, fontSize: 13, marginBottom: 12 },
    deleteWarning: { color: C.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
    btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    cancelText: { color: C.textMuted, fontSize: 15, fontWeight: "600" },
    saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
}
