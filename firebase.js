// ============================================================
// firebase.js — Firebase v10 Modular SDK Initialization
// Replace the firebaseConfig values with your own project config
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// ============================================================
// 🔧 REPLACE THESE VALUES WITH YOUR FIREBASE PROJECT CONFIG
//    Firebase Console → Project Settings → Your Apps → SDK setup
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDwALfNxoI8_r_wjmhFv4HqgofsiyqaWF8",
  authDomain: "rentgosl.firebaseapp.com",
  projectId: "rentgosl",
  storageBucket: "rentgosl.firebasestorage.app",
  messagingSenderId: "1002200341463",
  appId: "1:1002200341463:web:eddbb5ad2e94202c8a0992",
  measurementId: "G-GC2D74X4TK"
};
// ============================================================

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Auth SDK re-exports
export { signInWithPopup, signOut, onAuthStateChanged };

// Firestore SDK re-exports
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
};

// Storage SDK re-exports
export { ref, uploadBytes, getDownloadURL, deleteObject };
