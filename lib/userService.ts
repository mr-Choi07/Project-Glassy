import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// Using string for flexibility — supports all current and future spot IDs.
export type SpotId = string;

export interface UserProfile {
  uid: string;
  displayName: string;
  phoneNumber: string;
  selectedSpotIds: SpotId[];
  photoURL: string | null;
  email: string;
  createdAt: any;
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid" | "createdAt">) {
  await setDoc(doc(db, "users", uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, "uid" | "createdAt">>) {
  await setDoc(doc(db, "users", uid), data as Record<string, unknown>, { merge: true });
}

export async function uploadProfilePhoto(uid: string, uri: string, base64: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다");

  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const fileExt = ext === "png" ? "png" : "jpg";
  const path = `profilePhotos/${uid}.${fileExt}`;
  const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const res = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: bytes,
    }
  );

  if (!res.ok) throw new Error(`업로드 실패: ${await res.text()}`);
  const data = await res.json();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${data.downloadTokens}`;
}
