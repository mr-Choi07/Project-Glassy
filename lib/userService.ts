import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export type SpotId = "songjeong" | "dadaepo";

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

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `profilePhotos/${uid}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
