import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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

async function runTest() {
  try {
    console.log("Connecting to Firestore...");
    console.log("Adding a test document to 'sensor_data' collection...");
    const docRef = await addDoc(collection(db, "sensor_data"), {
      nodeId: 999,
      temperature: 25.5,
      humidity: 60.0,
      bootCount: 1,
      txCount: 1,
      sf: 7,
      txPower: 14,
      rssi: -50,
      snr: 9.5,
      timestamp: new Date()
    });
    console.log("✅ Success! Document written with ID: ", docRef.id);
    console.log("Firebase configuration is correct and working!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error adding document: ", e);
    process.exit(1);
  }
}

runTest();
