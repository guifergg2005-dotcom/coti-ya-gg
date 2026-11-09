import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDhSkHk3GFsRJnZDJGg032xTB1EdPiVUq4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "coty-ya-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "coty-ya-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "coty-ya-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "667350438317",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:667350438317:web:6f254656cf2b1d84db9124",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RCYBXWP4GJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
