import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1b6_QBHg6vBi844Kh_MLAJejI0rw6P5o",
  authDomain: "project-glassy.firebaseapp.com",
  projectId: "project-glassy",
  storageBucket: "project-glassy.firebasestorage.app",
  messagingSenderId: "557420012496",
  appId: "1:557420012496:web:eef31b76324eefb5308fd5",
};

const app = initializeApp(firebaseConfig);

// 웹: Firebase가 IndexedDB/localStorage로 알아서 세션 유지
export const auth = getAuth(app);

export default app;
