import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_KEY",
  authDomain: "project-glassy.firebaseapp.com",
  projectId: "project-glassy",
  storageBucket: "project-glassy.firebasestorage.app",
  messagingSenderId: "557420012496",
  appId: "1:557420012496:web:eef31b76324eefb5308fd5",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
