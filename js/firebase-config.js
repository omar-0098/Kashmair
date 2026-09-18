// firebase-config.js
// حط الملف ده في مجلد js/ عندك، وحط فيه بيانات مشروعك من:
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDebU1vOFDct-G3_GaRWvMjx69K_HlX7RI",
  authDomain: "products-15f80.firebaseapp.com",
  databaseURL: "https://products-15f80-default-rtdb.firebaseio.com",
  projectId: "products-15f80",
  storageBucket: "products-15f80.firebasestorage.app",
  messagingSenderId: "689401211129",
  appId: "1:689401211129:web:eda1a5d06b9c27c9bc9a28",
  measurementId: "G-NFC1ZGZPKM",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
