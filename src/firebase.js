// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM",
  authDomain: "lorawan-16ee0.firebaseapp.com",
  projectId: "lorawan-16ee0",
  storageBucket: "lorawan-16ee0.firebasestorage.app",
  messagingSenderId: "350666917279",
  appId: "1:350666917279:web:f878b22f554adbf12029aa"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
