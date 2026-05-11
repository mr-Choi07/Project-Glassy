import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  SpotId,
  UserProfile,
  createUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
} from "@/lib/userService";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  profileReady: boolean;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  loginWithGooglePopup: () => Promise<void>;
  updateNickname: (displayName: string) => Promise<void>;
  setSelectedSpots: (spotIds: SpotId[]) => Promise<void>;
  updatePhoto: (uri: string) => Promise<void>;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  updatePhone: (phoneNumber: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeProfile(data: any): UserProfile {
  // 구버전 selectedSpotId(단일) → selectedSpotIds(배열) 마이그레이션
  const ids: SpotId[] = data.selectedSpotIds
    ?? (data.selectedSpotId ? [data.selectedSpotId] : []);
  return { ...data, selectedSpotIds: ids };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileReady(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setUserProfile(snap.exists() ? normalizeProfile(snap.data()) : null);
        setProfileReady(true);
      },
      (error) => {
        console.error("Firestore onSnapshot 오류:", error.code, error.message);
        setProfileReady(true);
      },
    );
    return unsub;
  }, [user?.uid]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    phoneNumber: string,
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    await createUserProfile(result.user.uid, {
      displayName,
      phoneNumber,
      selectedSpotIds: [],
      photoURL: null,
      email,
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginWithGoogleToken = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const snap = await getDoc(doc(db, "users", result.user.uid));
    if (!snap.exists()) {
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName || "",
        phoneNumber: "",
        selectedSpotIds: [],
        photoURL: result.user.photoURL,
        email: result.user.email || "",
      });
    }
  };

  const loginWithGooglePopup = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db, "users", result.user.uid));
    if (!snap.exists()) {
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName || "",
        phoneNumber: "",
        selectedSpotIds: [],
        photoURL: result.user.photoURL,
        email: result.user.email || "",
      });
    }
  };

  const updateNickname = async (displayName: string) => {
    if (!user) return;
    await updateProfile(user, { displayName });
    await updateUserProfile(user.uid, { displayName });
  };

  const setSelectedSpots = async (spotIds: SpotId[]) => {
    if (!user) return;
    if (!userProfile) {
      await createUserProfile(user.uid, {
        displayName: user.displayName || "",
        phoneNumber: "",
        selectedSpotIds: spotIds,
        photoURL: user.photoURL,
        email: user.email || "",
      });
    } else {
      await updateUserProfile(user.uid, { selectedSpotIds: spotIds });
    }
  };

  const updatePhoto = async (uri: string) => {
    if (!user) return;
    const url = await uploadProfilePhoto(user.uid, uri);
    await updateProfile(user, { photoURL: url });
    await updateUserProfile(user.uid, { photoURL: url });
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (!user || !user.email) return;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, newEmail);
    await updateUserProfile(user.uid, { email: newEmail });
  };

  const updatePhone = async (phoneNumber: string) => {
    if (!user) return;
    await updateUserProfile(user.uid, { phoneNumber });
  };

  const deleteAccount = async (currentPassword?: string) => {
    if (!user) return;
    const isGoogle = user.providerData.some(p => p.providerId === "google.com");
    if (isGoogle) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    } else if (currentPassword && user.email) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    }
    await deleteUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profileReady,
        userProfile,
        login,
        signup,
        logout,
        resetPassword,
        loginWithGoogleToken,
        loginWithGooglePopup,
        updateNickname,
        setSelectedSpots,
        updatePhoto,
        updateUserEmail,
        updatePhone,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
