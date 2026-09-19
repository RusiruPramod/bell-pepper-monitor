import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM",
  authDomain: "lorawan-16ee0.firebaseapp.com",
  projectId: "lorawan-16ee0",
  storageBucket: "lorawan-16ee0.firebasestorage.app",
  messagingSenderId: "350666917279",
  appId: "1:350666917279:web:f878b22f554adbf12029aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDocs() {
  const q = query(collection(db, "sensor_data"), limit(5));
  const snap = await getDocs(q);
  console.log("Found", snap.size, "documents:");
  snap.forEach(d => console.log(d.id, JSON.stringify(d.data())));
  process.exit(0);
}
checkDocs();
