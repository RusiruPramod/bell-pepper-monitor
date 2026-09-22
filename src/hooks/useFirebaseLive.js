import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../firebase";

const DEFAULT_DATA = {
  temperature: 0,
  humidity: 0,
  nitrogen: 0,
  phosphorus: 0,
  potassium: 0,
  soilMoisture: 0,
  ec: 0,
  npkTemperature: 0,
  bootCount: 0,
  txCount: 0,
  sf: 7,
  txPower: 14,
  rssi: 0,
  snr: 0,
  totalTxTime: 0,
  nodeId: null,
  deviceStatus: "UNKNOWN",   // "ACTIVE" | "DEEP_SLEEP" | "UNKNOWN"
  isActive: false,
  sleepDurationSeconds: 30,
};

/**
 * useFirebaseLive — subscribes to /gateway/live in Firebase RTDB.
 * Returns { data, connected, isActive, isDeepSleep, isSleeping }
 *
 * Automatically unsubscribes on component unmount.
 */
export function useFirebaseLive() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const liveRef = ref(rtdb, "/gateway/live");

    const unsubscribe = onValue(
      liveRef,
      (snapshot) => {
        const raw = snapshot.val();
        if (raw) {
          setData({ ...DEFAULT_DATA, ...raw });
          setConnected(true);
        }
      },
      (error) => {
        console.error("[useFirebaseLive] RTDB error:", error);
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isDeepSleep = data.deviceStatus === "DEEP_SLEEP";
  const isActive    = data.deviceStatus === "ACTIVE";

  return { data, connected, isActive, isDeepSleep };
}
