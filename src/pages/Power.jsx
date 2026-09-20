import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Loader2, Zap, BatteryCharging, Activity } from "lucide-react";
import PageHeader from "../components/PageHeader";
import EnergyTank from "../components/EnergyTank";
import { Card, StatusBadge } from "../components/ui";

// ─── Static fallback defaults (used before Firestore data arrives) ──────────
const DEFAULT_ACTIVE = { busVoltage: 5, voltage: 3.3, current: 195,  power: 643.5 };
const DEFAULT_SLEEP  = { busVoltage: 5, voltage: 3.3, current: 1.97, power: 7.10  };

// ─── Helper: round for display ───────────────────────────────────────────────
function fmt(val, d = 2) {
  if (val == null) return "—";
  return parseFloat(Number(val).toFixed(d));
}

export default function Power() {
  const [activeData, setActiveData]   = useState(null); // last ACTIVE snapshot
  const [sleepData, setSleepData]     = useState(null); // last SLEEP snapshot
  const [currentMode, setCurrentMode] = useState(null); // live powerMode from Firebase
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ─── Firestore real-time listener ────────────────────────────────────────
  useEffect(() => {
    // Try ordered query first; fall back to unordered if composite index missing
    const orderedQ = query(
      collection(db, "sensor_data"),
      orderBy("lastHandshake", "desc"),
      limit(1)
    );

    let fallbackUnsub = null;

    // Routes doc into the correct snapshot by powerMode
    const handleDoc = (data) => {
      if (!data) return;
      setLastUpdated(new Date());
      setCurrentMode(data.powerMode ?? null);
      if (data.powerMode === "SLEEP") {
        setSleepData(data);   // ← Sleep column
      } else {
        setActiveData(data);  // ← Normal Active column
      }
    };

    const unsub = onSnapshot(
      orderedQ,
      (snapshot) => {
        setLoading(false);
        if (!snapshot.empty) handleDoc(snapshot.docs[0].data());
      },
      (err) => {
        console.warn("Power – ordered query fallback:", err.message);
        const fallbackQ = query(collection(db, "sensor_data"));
        fallbackUnsub = onSnapshot(fallbackQ, (snap) => {
          setLoading(false);
          snap.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
              handleDoc(change.doc.data());
            }
          });
        });
      }
    );

    return () => {
      unsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, []);

  // ─── Resolved values for each column ────────────────────────────────────
  // Normal Active Mode column → activeData || DEFAULT_ACTIVE
  const act = {
    busVoltage: activeData?.busVoltage ?? DEFAULT_ACTIVE.busVoltage,
    voltage:    activeData?.voltage    ?? DEFAULT_ACTIVE.voltage,
    current:    activeData?.current    ?? DEFAULT_ACTIVE.current,
    power:      activeData?.power      ?? DEFAULT_ACTIVE.power,
    powerMode:  activeData?.powerMode  ?? "ACTIVE",
  };
  // Deep Sleep Mode column → sleepData || DEFAULT_SLEEP
  const slp = {
    busVoltage: sleepData?.busVoltage ?? DEFAULT_SLEEP.busVoltage,
    voltage:    sleepData?.voltage    ?? DEFAULT_SLEEP.voltage,
    current:    sleepData?.current    ?? DEFAULT_SLEEP.current,
    power:      sleepData?.power      ?? DEFAULT_SLEEP.power,
    powerMode:  sleepData?.powerMode  ?? "SLEEP",
  };

  const powerMode = currentMode ?? "—";

  // displayMode: Firebase live data → default ACTIVE when not yet received
  // This drives BOTH the top status badge AND the right EnergyTank
  const displayMode = currentMode ?? "ACTIVE";

  // Right tank config — switches instantly when displayMode changes
  const rightTank =
    displayMode === "SLEEP"
      ? { label: "Deep Sleep Mode", targetPercent: 1.1,  color: "low-green"       }
      : { label: "Normal Mode",     targetPercent: 100,  color: "usage-gradient"  };

  // ─── Efficiency: always Sleep vs Active ────────────────────────────────
  const efficiencyPct =
    slp.power > 0 && act.power > 0
      ? Math.max(0, Math.min(100, (1 - slp.power / act.power) * 100))
      : 98.9;
  const efficiencyLabel = efficiencyPct.toFixed(1) + "%";

  const deepSleepPct =
    slp.power > 0 && act.power > 0
      ? ((slp.power / act.power) * 100).toFixed(2) + "%"
      : "≈1.1%";

  // ─── Comparison table rows ──────────────────────────────────────────────
  const POWER_COMPARISON = [
    { metric: "Bus Voltage",          normal: `${fmt(act.busVoltage)} V`,  deepSleep: `${fmt(slp.busVoltage)} V` },
    { metric: "Rail Voltage",         normal: `${fmt(act.voltage)} V`,     deepSleep: `${fmt(slp.voltage)} V`    },
    { metric: "Current",              normal: `${fmt(act.current)} mA`,    deepSleep: `${fmt(slp.current)} mA`   },
    { metric: "Power Consumption",    normal: `${fmt(act.power)} mW`,      deepSleep: `${fmt(slp.power)} mW`     },
    { metric: "Power Mode",           normal: act.powerMode,               deepSleep: slp.powerMode              },
    { metric: "Cycle Duration",       normal: "Always ON",                 deepSleep: "30 s"                     },
    { metric: "Power Used vs Normal", normal: "100%",                      deepSleep: deepSleepPct               },
  ];

  // Current live reading for metric cards
  const nowData = currentMode === "SLEEP" ? sleepData
               : currentMode === "ACTIVE" ? activeData
               : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Power Monitoring" subtitle="Measured using INA226 · Live from Firebase" />

      {/* Live connection badge row */}
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting to Firestore…
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live · sensor_data
            </span>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {/* Status badge — synced to Firebase live mode OR EnergyTank cycle animation */}
            {displayMode && (
              <span
                key={displayMode}          /* key forces re-mount → CSS fade-in on change */
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-all duration-500 animate-fadeIn ${
                  displayMode === "SLEEP"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
                title={currentMode ? "Live Firebase reading" : "Synced with Energy Draw Cycle animation"}
              >
                {displayMode === "SLEEP" ? "😴 Deep Sleep" : `⚡ ${displayMode}`}
              </span>
            )}
          </>
        )}
      </div>

      {/* Live INA226 Metric Cards — shows current real-time reading */}
      {!loading && nowData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Zap className="w-5 h-5 text-yellow-500" />,           label: "Bus Voltage",  value: `${fmt(nowData.busVoltage)} V`,  sub: "INA226 VBUS"  },
            { icon: <BatteryCharging className="w-5 h-5 text-blue-500" />, label: "Rail Voltage", value: `${fmt(nowData.voltage)} V`,     sub: "3.3 V rail"   },
            { icon: <Activity className="w-5 h-5 text-purple-500" />,      label: "Current",      value: `${fmt(nowData.current)} mA`,   sub: "INA226 shunt" },
            { icon: <Zap className="w-5 h-5 text-emerald-500" />,          label: "Power",        value: `${fmt(nowData.power)} mW`,     sub: "V × I"        },
          ].map((m) => (
            <Card key={m.label} className="p-4 flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{m.icon}</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{m.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Top Section: Comparison Table + Live Energy Draw Cycle Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Comparison Table */}
        <Card className="lg:col-span-7 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Normal vs Deep Sleep</h2>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-600 font-semibold text-sm">Parameter</th>
                    <th className="text-left py-2 pr-4 text-gray-800 font-bold text-sm">
                      Normal Active Mode
                      {!loading && activeData && (
                        <span className="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">LIVE</span>
                      )}
                    </th>
                    <th className="text-left py-2 pr-4 text-gray-800 font-bold text-sm">
                      Deep Sleep Mode
                      {!loading && sleepData && (
                        <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">LIVE</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {POWER_COMPARISON.map((row) => (
                    <tr key={row.metric} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-600 font-semibold">{row.metric}</td>
                      <td className="py-3 pr-4 text-gray-800 font-medium">{row.normal}</td>
                      <td className="py-3 text-gray-800 font-medium">{row.deepSleep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Live Energy Draw — right tank synced to status badge */}
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-6">Live Energy Draw Cycle</h2>
            <div className="flex justify-center items-start gap-8 sm:gap-12">
              {/* Left: always shows Normal reference at 100% */}
              <EnergyTank label="Normal Usage" targetPercent={100} color="high-green" />

              {/* Right: driven by status badge — re-animates on every mode switch */}
              <EnergyTank
                key={displayMode}            /* re-mount = re-animate from 0 on switch */
                label={rightTank.label}
                targetPercent={rightTank.targetPercent}
                color={rightTank.color}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-6">
            Right tank reflects live status:{" "}
            <span className="font-semibold">
              {displayMode === "SLEEP" ? `😴 Deep Sleep (${deepSleepPct})` : "⚡ Normal Active Mode (100%)"}
            </span>
          </p>
        </Card>
      </div>

      {/* Efficiency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Power Reduction */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">Power Reduction</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-5xl font-bold text-gray-900 mt-3">
            {loading ? (
              <span className="inline-block w-32 h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              efficiencyLabel
            )}
          </p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Target power reduction achieved during deep sleep mode.
          </p>
        </Card>

        {/* Measured Efficiency */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">Measured Efficiency</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-5xl font-bold text-gray-900 mt-3">
            {loading ? (
              <span className="inline-block w-32 h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              efficiencyLabel
            )}
          </p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Calculated from live INA226 readings:{" "}
            <span className="font-semibold text-gray-800">Active ({fmt(act.power)} mW)</span> vs{" "}
            <span className="font-semibold text-gray-800">
              Sleep ({loading ? "…" : `${fmt(slp.power)} mW`})
            </span>.
          </p>
        </Card>
      </div>
    </div>
  );
}
