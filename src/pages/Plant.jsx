import { useState, useEffect } from "react";
import {
  Thermometer, Droplets, FlaskConical, Atom, Leaf, Lightbulb,
  WifiOff, Moon, Activity,
} from "lucide-react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../firebase";
import PageHeader from "../components/PageHeader";
import ConditionCard from "../components/ConditionCard";
import SuggestionCard from "../components/SuggestionCard";
import { Card } from "../components/ui";
import { statusFor, SUGGESTIONS } from "../data/mockData";

// ─── Defaults ─────────────────────────────────────────────────────────────────
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
  totalTxTime: 0,
  deviceStatus: "UNKNOWN",
  isActive: false,
  sleepDurationSeconds: 30,
};

// ─── Deep Sleep Banner ────────────────────────────────────────────────────────
function DeepSleepBanner({ sleepSeconds }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
      <Moon size={18} className="text-blue-500 shrink-0" />
      <span>
        Device is in <strong>Deep Sleep</strong> — waking every{" "}
        <strong>{sleepSeconds}s</strong>. Values will refresh automatically on next wake.
      </span>
    </div>
  );
}

// ─── Device Status Pill ───────────────────────────────────────────────────────
function DeviceStatusPill({ status }) {
  if (status === "ACTIVE") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Live · Active</span>
      </div>
    );
  }
  if (status === "DEEP_SLEEP") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
        <Moon size={12} className="text-blue-500" />
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Deep Sleep</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
      <WifiOff size={12} className="text-gray-400" />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Connecting…</span>
    </div>
  );
}

// ─── Last-seen timer ──────────────────────────────────────────────────────────
function useLastSeen(isActive) {
  const [lastSeen, setLastSeen] = useState(null);
  const [display, setDisplay] = useState("—");

  useEffect(() => {
    if (isActive) setLastSeen(Date.now());
  }, [isActive]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!lastSeen) return;
      const secs = Math.round((Date.now() - lastSeen) / 1000);
      setDisplay(secs < 60 ? `${secs}s ago` : `${Math.round(secs / 60)}m ago`);
    }, 1000);
    return () => clearInterval(id);
  }, [lastSeen]);

  return display;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Plant() {
  const [liveData, setLiveData] = useState(DEFAULT_DATA);
  const [connected, setConnected] = useState(false);

  // Real-time listener — auto-cancelled on unmount
  useEffect(() => {
    const liveRef = ref(rtdb, "/gateway/live");
    const unsubscribe = onValue(
      liveRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setLiveData({ ...DEFAULT_DATA, ...data });
          setConnected(true);
        }
      },
      (error) => {
        console.error("Firebase RTDB error:", error);
        setConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const {
    temperature, humidity, nitrogen, phosphorus, potassium,
    soilMoisture, ec, npkTemperature,
    bootCount, txCount, sf, txPower, rssi,
    deviceStatus, isActive, sleepDurationSeconds,
  } = liveData;

  const lastSeen = useLastSeen(isActive);
  const isDeepSleep = deviceStatus === "DEEP_SLEEP";

  const conditionCards = [
    { icon: FlaskConical, label: "Nitrogen",    value: nitrogen,              unit: "ppm", status: isDeepSleep ? "—" : statusFor("temperature", nitrogen) },
    { icon: Atom,         label: "Phosphorus",  value: phosphorus,            unit: "ppm", status: isDeepSleep ? "—" : statusFor("temperature", phosphorus) },
    { icon: Leaf,         label: "Potassium",   value: potassium,             unit: "ppm", status: isDeepSleep ? "—" : statusFor("temperature", potassium) },
    { icon: Thermometer,  label: "Temperature", value: temperature.toFixed(1), unit: "°C", status: isDeepSleep ? "—" : statusFor("temperature", temperature) },
    { icon: Droplets,     label: "Humidity",    value: humidity.toFixed(1),   unit: "%",  status: isDeepSleep ? "—" : statusFor("humidity", humidity) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Bell Pepper" subtitle="Digital plant health profile" />

      {isDeepSleep && <DeepSleepBanner sleepSeconds={sleepDurationSeconds} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant profile card */}
        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center">
            <Leaf size={40} className={isDeepSleep ? "text-blue-400" : "text-green-600"} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <DeviceStatusPill status={deviceStatus} />
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">
              {isDeepSleep ? "Sleeping" : connected ? "Healthy" : "Connecting"}
            </h2>
            <p className="text-sm text-gray-500">Bell Pepper · <em>Capsicum annuum</em></p>
          </div>
          <div className="w-full border-t border-gray-100 pt-4 text-left space-y-2">
            <InfoRow label="Species"      value="Capsicum annuum" />
            <InfoRow label="Common Name"  value="Bell Pepper" />
            <InfoRow label="Growth Stage" value="Fruiting" />
            <InfoRow label="Last Active"  value={lastSeen} />
            <InfoRow label="Boot Count"   value={bootCount} />
            <InfoRow label="TX Count"     value={txCount} />
          </div>
        </Card>

        {/* Right side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conditions grid */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Current Conditions</h2>
              {connected && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Activity size={13} />
                  <span>Auto-refresh via Firebase</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {conditionCards.map((c) => (
                <ConditionCard key={c.label} {...c} />
              ))}
            </div>
          </Card>

          {/* Soil & LoRa details */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sensor & LoRa Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <DetailRow label="Soil Temp"        value={npkTemperature.toFixed(1)} unit="°C"     sleep={isDeepSleep} />
              <DetailRow label="Soil Moisture"    value={soilMoisture.toFixed(1)}   unit="%"      sleep={isDeepSleep} />
              <DetailRow label="EC"               value={ec.toFixed(2)}             unit="μS/cm"  sleep={isDeepSleep} />
              <DetailRow label="Spreading Factor" value={`SF${sf}`}                 unit=""       sleep={false} />
              <DetailRow label="TX Power"         value={txPower}                   unit="dBm"    sleep={false} />
              <DetailRow label="RSSI"             value={rssi}                      unit="dBm"    sleep={false} />
            </div>
          </Card>

          {/* Suggestions */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              <span>Plant Suggestions</span>
            </h2>
            <div className="space-y-3">
              {SUGGESTIONS.map((s) => (
                <SuggestionCard key={s.id} {...s} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="font-semibold text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

function DetailRow({ label, value, unit, sleep }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-lg font-bold ${sleep ? "text-gray-300" : "text-gray-800"}`}>
        {sleep ? "—" : value}
        {!sleep && unit && <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}
