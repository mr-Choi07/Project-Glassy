import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export type SpotId = "songjeong" | "haeundae" | "dadaepo" | "gwanganri";

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
  // setDoc with merge creates the doc if it doesn't exist, or merges fields if it does
  await setDoc(doc(db, "users", uid), data as Record<string, unknown>, { merge: true });
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error("이미지 변환 실패"));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const storageRef = ref(storage, `profilePhotos/${uid}.${ext === "png" ? "png" : "jpg"}`);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}
