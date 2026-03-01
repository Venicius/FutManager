import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAcxJZ2v4CJL_dh_oqrZRSQ4PcIfGG-wbg",
  authDomain: "fut-manager-aa516.firebaseapp.com",
  projectId: "fut-manager-aa516",
  storageBucket: "fut-manager-aa516.firebasestorage.app",
  messagingSenderId: "208524424053",
  appId: "1:208524424053:web:e9aa02a4edcb83f6e8193c"
};

// Singleton pattern to prevent re-initializing in Next.js development (HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Auth and Google Auth Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
