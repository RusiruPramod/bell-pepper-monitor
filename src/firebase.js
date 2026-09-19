// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM",
  authDomain: "lorawan-16ee0.firebaseapp.com",
  projectId: "lorawan-16ee0",
  storageBucket: "lorawan-16ee0.firebasestorage.app",
  messagingSenderId: "350666917279",
  appId: "1:350666917279:web:f878b22f554adbf12029aa",
  databaseURL: "https://lorawan-16ee0-default-rtdb.firebaseio.com",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);

// Authenticate to grant read permissions for RTDB & Firestore
signInWithEmailAndPassword(auth, "lorawanproject4@gmail.com", "lorawan123")
  .then(() => {
    console.log("Firebase Auth: Connected successfully");
  })
  .catch((err) => {
    console.warn("Firebase Auth fallback notice:", err.message);
  });
