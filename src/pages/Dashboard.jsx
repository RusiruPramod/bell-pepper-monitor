import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Thermometer, Droplets, FlaskConical, Atom, Leaf, ArrowRight, Zap,
  Sunrise, Sun, Sunset, Moon, Lightbulb, Sparkles, Loader2, Bot, CheckCircle2,
  WifiOff, Activity,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ConditionCard from "../components/ConditionCard";
import SuggestionCard from "../components/SuggestionCard";
import { Card, StatusBadge } from "../components/ui";
import { statusFor } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useFirebaseLive } from "../hooks/useFirebaseLive";
import { getAISuggestions } from "../services/gemini";
import greenhouseImg from "../assets/bell_pepper_greenhouse.jpg";
import npkImg from "../assets/npk_sensor1.jpeg";

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

// ─── Deep Sleep Banner ────────────────────────────────────────────────────────
function DeepSleepBanner({ sleepSeconds }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
      <Moon size={18} className="text-blue-500 shrink-0" />
      <span>
        ESP32 is in <strong>Deep Sleep</strong> — waking every <strong>{sleepSeconds}s</strong>.
        Sensor values will refresh automatically on next wake cycle.
      </span>
    </div>
  );
}

// CONDITION_CARDS moved inside component to use live Firebase data

const AI_SUGGESTION_PRESETS = [
  [
    {
      id: "ai-1",
      tone: "warn",
      tag: "High Priority",
      category: "Soil Nutrition",
      title: "Potassium Replenishment Required",
      body: "Current K level (18 ppm) is below the optimal fruiting baseline. Recommend applying soluble Potassium Sulfate (0-0-50) via drip fertigation to bolster pepper thickness and weight.",
    },
    {
      id: "ai-2",
      tone: "good",
      tag: "VPD Balanced",
      category: "Microclimate",
      title: "Transpiration Rate in Target Zone",
      body: "Vapor Pressure Deficit is calculated at 1.15 kPa with 68% relative humidity at 28°C. Canopy stomatal conductance is optimal for photosynthesis.",
    },
    {
      id: "ai-3",
      tone: "good",
      tag: "Nutrient Ratio OK",
      category: "N-P Equilibrium",
      title: "Nitrogen & Phosphorus Uptake Stable",
      body: "Nitrogen (45 ppm) and Phosphorus (28 ppm) maintain a healthy 1.6:1 uptake ratio, supporting continuous vegetative growth without excessive leaf elongation.",
    },
  ],
  [
    {
      id: "ai-4",
      tone: "good",
      tag: "Thermal Stability",
      category: "Greenhouse Climate",
      title: "Daytime Temperature Curve Ideal",
      body: "Canopy temperature stabilized at 28.2°C. Zero heat stress detected on upper foliage. Maintain existing greenhouse ventilation speed.",
    },
    {
      id: "ai-5",
      tone: "warn",
      tag: "NPK Fine-Tuning",
      category: "Nutrient Advisory",
      title: "Boost Bio-Available Potassium",
      body: "Soil telemetry indicates active K drawdown during early fruit set. A 15% dosage increase in next irrigation cycle will prevent blossom end rot.",
    },
    {
      id: "ai-6",
      tone: "good",
      tag: "Substrate Health",
      category: "Soil Moisture",
      title: "Optimal Substrate Moisture Retention",
      body: "Soil moisture and electrical conductivity are well matched to transpiration demand. All LoRa sensor nodes reporting active telemetry.",
    },
  ],
  [
    {
      id: "ai-7",
      tone: "warn",
      tag: "Yield Optimization",
      category: "Foliar Advisory",
      title: "Targeted K+ Foliar Boost Recommended",
      body: "Telemetry logs show steady nutrient consumption over the past 6 hours. Supplementing with foliar micronutrients will maximize bell pepper skin firmness.",
    },
    {
      id: "ai-8",
      tone: "good",
      tag: "Humidity Safe",
      category: "Disease Prevention",
      title: "Stable Ambient Humidity (68%)",
      body: "Greenhouse relative humidity suppresses fungal spore propagation while preventing leaf tip burn. Environmental sensors show high fidelity.",
    },
    {
      id: "ai-9",
      tone: "good",
      tag: "Crop Health: 96%",
      category: "Growth Index",
      title: "Overall Growth Vigor: High",
      body: "All primary environmental parameters (Temp, N, P, RH) within 94-98% agreement with bell pepper agronomic benchmarks.",
    },
  ],
];

// ── Realtime Power Data Hook ──────────────────────────────────────────────────
function useRealtimePowerData() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const generatePoint = (time, prevEnergy) => {
      // 30s intervals. Phase out of 6 (3 minutes total per cycle)
      const epoch30s = Math.floor(time.getTime() / 30000);
      const phase = epoch30s % 6;

      let mode, power, current, color;
      if (phase === 0) {
        mode = "Normal / Active"; power = 650; current = "196.9 mA"; color = "#ef4444";
      } else if (phase === 1) {
        mode = "Transmission"; power = 155; current = "47.0 mA"; color = "#f59e0b";
      } else {
        mode = "Deep Sleep"; power = 6.5; current = "1.97 mA"; color = "#16a34a";
      }

      const energyInc = power * (30 / 3600); // simplified energy accumulation

      return {
        time,
        timeLabel: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        mode,
        power,
        current,
        color,
        energy: prevEnergy + energyInc / 100
      };
    };

    const updateData = () => {
      const now = new Date();
      now.setMilliseconds(0);
      const currentSlot = new Date(Math.floor(now.getTime() / 30000) * 30000);

      const numPoints = 12; // 6 minutes window
      let currentEnergy = 0.5; // start base energy
      const newData = [];

      for (let i = numPoints - 1; i >= 0; i--) {
        const ptTime = new Date(currentSlot.getTime() - i * 30000);
        const pt = generatePoint(ptTime, currentEnergy);
        currentEnergy = pt.energy;
        newData.push(pt);
      }
      setData(newData);
    };

    updateData();
    const interval = setInterval(updateData, 1000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

// ── Power & Energy Monitoring Charts ──────────────────────────────────────────
function PowerConsumptionChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG dimensions
  const width = 560;
  const height = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 26;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  if (!data || data.length === 0) return null;

  // Y scale: 0 to 700 mW
  const getY = (power) => padTop + (1 - power / 700) * plotH;

  // X scale: based on data array length
  const getX = (index) => padLeft + (index / (data.length - 1)) * plotW;

  const currentTooltip = hoveredPoint;

  const yTicks = [700, 600, 500, 400, 300, 200, 100, 0];

  // Create xTicks every 2 points (every 1 minute)
  const xTicks = data.filter((_, i) => i % 2 === 0).map((d, i) => ({
    label: d.timeLabel.split(" ")[0], // grab time string
    index: data.indexOf(d)
  }));

  // Create path lines connecting points
  const renderLines = () => {
    const lines = [];
    for (let i = 0; i < data.length - 1; i++) {
      const p1 = data[i];
      const p2 = data[i + 1];
      const x1 = getX(i);
      const y1 = getY(p1.power);
      const x2 = getX(i + 1);
      const y2 = getY(p2.power);

      // We can draw a direct line between states.
      // If color changes, we might transition midway, but standard direct line is fine.
      lines.push(
        <line
          key={`l-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={p1.color} // Using p1 color for the segment
          strokeWidth="2"
        />
      );
    }
    return lines;
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <svg width="28" height="12" viewBox="0 0 28 12">
            <line x1="0" y1="6" x2="28" y2="6" stroke="#ef4444" strokeWidth="2" />
            <circle cx="14" cy="6" r="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span className="font-medium">Normal / Active</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <svg width="28" height="12" viewBox="0 0 28 12">
            <line x1="0" y1="6" x2="28" y2="6" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="14" cy="6" r="3.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span className="font-medium">Transmission</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <svg width="28" height="12" viewBox="0 0 28 12">
            <line x1="0" y1="6" x2="28" y2="6" stroke="#16a34a" strokeWidth="2" />
            <circle cx="14" cy="6" r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span className="font-medium">Deep Sleep</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Top Y-Axis Unit Label */}
          <text x={padLeft - 22} y={padTop - 12} fontSize="11" fill="#374151" fontWeight="500">
            Power (mW)
          </text>

          {/* Horizontal Grid lines & Y Ticks */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                {val > 0 && (
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                )}
                <line x1={padLeft - 4} y1={y} x2={padLeft} y2={y} stroke="#d1d5db" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 3.5} fontSize="10.5" fill="#4b5563" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & X Ticks */}
          {xTicks.map((t) => {
            const x = getX(t.index);
            return (
              <g key={t.index}>
                <line x1={x} y1={padTop} x2={x} y2={padTop + plotH} stroke="#f3f4f6" strokeWidth="1" />
                <line x1={x} y1={padTop + plotH} x2={x} y2={padTop + plotH + 4} stroke="#d1d5db" strokeWidth="1" />
                <text x={x} y={padTop + plotH + 16} fontSize="10.5" fill="#4b5563" textAnchor="middle">
                  {t.label}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis Lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#d1d5db" strokeWidth="1" />

          {/* Render Lines */}
          {renderLines()}

          {/* ── Dots ── */}
          {data.map((d, idx) => {
            const px = getX(idx);
            const py = getY(d.power);
            const isHovered = currentTooltip === d;
            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={px} cy={py} r="10" fill="transparent" />
                {isHovered && (
                  <circle cx={px} cy={py} r="7" fill="none" stroke={d.color} strokeWidth="2" opacity="0.4" />
                )}
                <circle cx={px} cy={py} r={isHovered ? 4.5 : 3.5} fill={d.color} stroke="#ffffff" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* ── Tooltip pointer line ── */}
          {currentTooltip && (
            <line
              x1={getX(data.indexOf(currentTooltip))}
              y1={getY(currentTooltip.power) - 4}
              x2={getX(data.indexOf(currentTooltip))}
              y2={Math.min(getY(currentTooltip.power) - 12, 142)}
              stroke="#1e293b"
              strokeWidth="1.2"
            />
          )}

          {/* ── Tooltip Box ── */}
          {currentTooltip && (
            <g
              transform={`translate(${Math.max(
                padLeft + 10,
                Math.min(getX(data.indexOf(currentTooltip)) - 55, width - padRight - 110)
              )}, ${Math.max(28, getY(currentTooltip.power) - 75)})`}
              className="pointer-events-none drop-shadow-md"
            >
              <rect width="106" height="62" rx="6" ry="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="8" y="16" fontSize="11" fontWeight="700" fill="#ffffff" fontFamily="sans-serif">
                {currentTooltip.timeLabel}
              </text>
              <text x="8" y="30" fontSize="9.5" fill="#e2e8f0" fontFamily="sans-serif">
                Mode: {currentTooltip.mode}
              </text>
              <text x="8" y="43" fontSize="9.5" fill="#e2e8f0" fontFamily="sans-serif">
                Power: {currentTooltip.power} mW
              </text>
              <text x="8" y="55" fontSize="9.5" fill="#e2e8f0" fontFamily="sans-serif">
                Current: {currentTooltip.current}
              </text>
            </g>
          )}
        </svg>
      </div>

      <p className="text-[11px] text-gray-500 text-center font-medium mt-0.5">Real-time (30s intervals)</p>
    </div>
  );
}

function EnergyConsumptionChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG dimensions
  const width = 560;
  const height = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 26;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  if (!data || data.length === 0) return null;

  // X scale: based on data array length
  const getX = (index) => padLeft + (index / (data.length - 1)) * plotW;

  // Dynamic Y scale max:
  const maxEnergy = Math.max(1.25, ...data.map(d => d.energy));
  const roundedMax = Math.ceil(maxEnergy * 4) / 4; // round to nearest 0.25
  const getY = (val) => padTop + (1 - val / roundedMax) * plotH;

  const yTicks = [
    { label: roundedMax.toFixed(2), val: roundedMax },
    { label: (roundedMax * 0.8).toFixed(2), val: roundedMax * 0.8 },
    { label: (roundedMax * 0.6).toFixed(2), val: roundedMax * 0.6 },
    { label: (roundedMax * 0.4).toFixed(2), val: roundedMax * 0.4 },
    { label: (roundedMax * 0.2).toFixed(2), val: roundedMax * 0.2 },
    { label: "0.00", val: 0.00 },
  ];

  // Create xTicks every 2 points (every 1 minute)
  const xTicks = data.filter((_, i) => i % 2 === 0).map((d, i) => ({
    label: d.timeLabel.split(" ")[0], // grab time string
    index: data.indexOf(d)
  }));

  const pathD = data.reduce(
    (acc, pt, i) => (i === 0 ? `M ${getX(i)},${getY(pt.energy)}` : `${acc} L ${getX(i)},${getY(pt.energy)}`),
    ""
  );

  const areaD = `${pathD} L ${getX(data.length - 1)},${getY(0)} L ${getX(0)},${getY(0)} Z`;

  return (
    <div className="w-full">
      {/* Chart container */}
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="energyFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Top Y-Axis Unit Label */}
          <text x={padLeft - 22} y={padTop - 12} fontSize="11" fill="#374151" fontWeight="500">
            Energy (mWh)
          </text>

          {/* Horizontal Grid lines & Y Ticks */}
          {yTicks.map(({ label, val }) => {
            const y = getY(val);
            return (
              <g key={label}>
                {val > 0 && (
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                )}
                <line x1={padLeft - 4} y1={y} x2={padLeft} y2={y} stroke="#d1d5db" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 3.5} fontSize="10.5" fill="#4b5563" textAnchor="end">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & X Ticks */}
          {xTicks.map((t) => {
            const x = getX(t.index);
            return (
              <g key={t.index}>
                <line x1={x} y1={padTop} x2={x} y2={padTop + plotH} stroke="#f3f4f6" strokeWidth="1" />
                <line x1={x} y1={padTop + plotH} x2={x} y2={padTop + plotH + 4} stroke="#d1d5db" strokeWidth="1" />
                <text x={x} y={padTop + plotH + 16} fontSize="10.5" fill="#4b5563" textAnchor="middle">
                  {t.label}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis Lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#d1d5db" strokeWidth="1" />

          {/* Gradient Area Fill */}
          <path d={areaD} fill="url(#energyFillGradient)" />

          {/* Solid Green Line */}
          <path d={pathD} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {data.map((pt, idx) => {
            const px = getX(idx);
            const py = getY(pt.energy);
            const isHovered = hoveredPoint === pt;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={px} cy={py} r="10" fill="transparent" />
                {isHovered && (
                  <circle cx={px} cy={py} r="7" fill="none" stroke="#16a34a" strokeWidth="2" opacity="0.4" />
                )}
                <circle cx={px} cy={py} r={isHovered ? 4.5 : 3.5} fill="#16a34a" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Latest value Pill Badge (pinned above the last dot) */}
          {data.length > 0 && (
            <g className="pointer-events-none">
              <rect
                x={getX(data.length - 1) - 68}
                y={getY(data[data.length - 1].energy) - 36}
                width="74"
                height="24"
                rx="6"
                ry="6"
                fill="#059669"
              />
              <polygon
                points={`${getX(data.length - 1) - 12},${getY(data[data.length - 1].energy) - 12} ${getX(data.length - 1) - 4},${getY(data[data.length - 1].energy) - 12} ${getX(data.length - 1) - 8},${getY(data[data.length - 1].energy) - 6}`}
                fill="#059669"
              />
              <text
                x={getX(data.length - 1) - 31}
                y={getY(data[data.length - 1].energy) - 20}
                fontSize="11"
                fontWeight="700"
                fill="#ffffff"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {data[data.length - 1].energy.toFixed(3)} mWh
              </text>
            </g>
          )}

          {/* Hover Tooltip */}
          {hoveredPoint && hoveredPoint !== data[data.length - 1] && (
            <g
              transform={`translate(${getX(data.indexOf(hoveredPoint)) - 42}, ${getY(hoveredPoint.energy) - 48})`}
              className="pointer-events-none drop-shadow-md"
            >
              <rect width="84" height="38" rx="5" ry="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="42" y="16" fontSize="10" fontWeight="700" fill="#ffffff" textAnchor="middle">
                {hoveredPoint.timeLabel}
              </text>
              <text x="42" y="30" fontSize="9.5" fill="#86efac" textAnchor="middle">
                {hoveredPoint.energy.toFixed(3)} mWh
              </text>
            </g>
          )}
        </svg>
      </div>

      <p className="text-[11px] text-gray-500 text-center font-medium mt-0.5">Real-time (30s intervals)</p>
    </div>
  );
}

function PowerMonitoringRow() {
  const realtimeData = useRealtimePowerData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Power Consumption History */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-gray-800 mb-2">Power Consumption History</h2>
        <PowerConsumptionChart data={realtimeData} />
      </Card>

      {/* Energy Consumption Over Time */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-gray-800 mb-2">Energy Consumption Over Time</h2>
        <EnergyConsumptionChart data={realtimeData} />
      </Card>
    </div>
  );
}

const getGreetingInfo = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return {
      text: "Good morning",
      Icon: Sunrise,
      badgeStyle: "bg-amber-50 text-amber-600 border-amber-200/80",
    };
  }
  if (hour < 17) {
    return {
      text: "Good afternoon",
      Icon: Sun,
      badgeStyle: "bg-amber-50 text-amber-600 border-amber-200/80",
    };
  }
  if (hour < 21) {
    return {
      text: "Good evening",
      Icon: Sunset,
      badgeStyle: "bg-orange-50 text-orange-600 border-orange-200/80",
    };
  }
  return {
    text: "Good evening",
    Icon: Moon,
    badgeStyle: "bg-indigo-50 text-indigo-600 border-indigo-200/80",
  };
};

export default function Dashboard() {
  const { user } = useAuth();

  // ── Real-time Firebase RTDB listener (/gateway/live) ──────────────────────
  const { data: liveData, connected, isActive, isDeepSleep } = useFirebaseLive();

  const currentTemp = liveData.temperature;
  const currentHum = liveData.humidity;
  const currentN = liveData.nitrogen;
  const currentP = liveData.phosphorus;
  const currentK = liveData.potassium;

  // Banner-specific logic to retain last known active values during deep sleep
  const lastActiveNpkRef = useRef({ n: 0, p: 0, k: 0 });

  useEffect(() => {
    if (isActive && (currentN !== 0 || currentP !== 0 || currentK !== 0)) {
      lastActiveNpkRef.current = { n: currentN, p: currentP, k: currentK };
    }
  }, [isActive, currentN, currentP, currentK]);

  const bannerN = (isDeepSleep && currentN === 0) ? lastActiveNpkRef.current.n : currentN;
  const bannerP = (isDeepSleep && currentP === 0) ? lastActiveNpkRef.current.p : currentP;
  const bannerK = (isDeepSleep && currentK === 0) ? lastActiveNpkRef.current.k : currentK;

  const getBannerNpkStatus = (val, low, high) => {
    if (!connected) return "—";
    if (val === null || val === undefined) return "Unknown";
    if (val < low) return "Low";
    if (val > high) return "High";
    return "Good";
  };

  const bannerNStatus = getBannerNpkStatus(bannerN, 30, 60);
  const bannerPStatus = getBannerNpkStatus(bannerP, 20, 50);
  const bannerKStatus = getBannerNpkStatus(bannerK, 20, 40);

  const bannerNpkOverallStatus =
    !connected ? "Connecting…"
      : bannerNStatus === "Good" && bannerPStatus === "Good" && bannerKStatus === "Good" ? "Optimal" : "Needs Attention";

  // Simple NPK status helper (bell-pepper optimal ranges, ppm)
  const npkStatus = (val, low, high) => {
    if (!connected || isDeepSleep) return "—";
    if (val === null || val === undefined) return "Unknown";
    if (val < low) return "Low";
    if (val > high) return "High";
    return "Good";
  };

  const nStatus = npkStatus(currentN, 30, 60);
  const pStatus = npkStatus(currentP, 20, 50);
  const kStatus = npkStatus(currentK, 20, 40);

  // "Optimal" only when all three are Good and device is active
  const npkOverallStatus =
    isDeepSleep ? "Sleeping"
      : !connected ? "Connecting…"
        : nStatus === "Good" && pStatus === "Good" && kStatus === "Good" ? "Optimal" : "Needs Attention";

  const CONDITION_CARDS = [
    {
      icon: FlaskConical,
      label: "Nitrogen",
      value: currentN,
      unit: "ppm",
      status: nStatus,
    },
    {
      icon: Atom,
      label: "Phosphorus",
      value: currentP,
      unit: "ppm",
      status: pStatus,
    },
    {
      icon: Leaf,
      label: "Potassium",
      value: currentK,
      unit: "ppm",
      status: kStatus,
    },
    {
      icon: Thermometer,
      label: "Temperature",
      value: isDeepSleep ? 0 : currentTemp,
      unit: "°C",
      status: isDeepSleep ? "—" : statusFor("temperature", currentTemp),
    },
    {
      icon: Droplets,
      label: "Humidity",
      value: isDeepSleep ? 0 : currentHum,
      unit: "%",
      status: isDeepSleep ? "—" : statusFor("humidity", currentHum),
    },
  ];

  // Expose sensorData-like object for backward-compat with the rest of the render
  const sensorData = connected ? liveData : null;
  const { text, Icon, badgeStyle } = getGreetingInfo();
  const greeting = (
    <div className="inline-flex items-center gap-3">
      <span className={`p-2 rounded-xl border flex items-center justify-center ${badgeStyle}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span>{text}{user?.name ? `, ${user.name}` : ""}</span>
    </div>
  );

  const [suggestions, setSuggestions] = useState(AI_SUGGESTION_PRESETS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState({ text: "", progress: 0 });
  const [presetIndex, setPresetIndex] = useState(0);
  const [lastAnalyzed, setLastAnalyzed] = useState("Just now");
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);

  const handleRunAIAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setShowSuccessBadge(false);

    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      setAnalysisStep({ text: "API Key missing. Please add it in Settings.", progress: 0 });
      setTimeout(() => setIsAnalyzing(false), 3000);
      return;
    }

    try {
      setAnalysisStep({ text: "Reading live LoRa sensor telemetry...", progress: 25 });

      const readings = {
        nitrogen: { value: currentN, status: nStatus },
        phosphorus: { value: currentP, status: pStatus },
        potassium: { value: currentK, status: kStatus },
        temperature: currentTemp,
        humidity: currentHum
      };

      setAnalysisStep({ text: "Synthesizing agronomic recommendations (retrying if busy)…", progress: 60 });

      const newSuggestions = await getAISuggestions(apiKey, readings);

      setAnalysisStep({ text: "AI Recommendations Generated!", progress: 100 });
      setSuggestions(newSuggestions);
      setIsAnalyzing(false);
      setShowSuccessBadge(true);
      setLastAnalyzed(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );

      setTimeout(() => setShowSuccessBadge(false), 3500);
    } catch (err) {
      setAnalysisStep({ text: "AI error: " + err.message, progress: 0 });
      setTimeout(() => setIsAnalyzing(false), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={greeting} subtitle="Bell Pepper Smart Monitoring System" />

      {/* ── Plant Health Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl border-0 shadow-md"
        style={{ background: "linear-gradient(135deg, #16a34a 0%, #166534 55%)" }}
      >
        <div className="flex flex-col sm:flex-row items-stretch min-h-[220px]">
          {/* Left: Text content */}
          <div className="flex-1 p-7 flex flex-col justify-center z-10">
            <p className="text-sm font-semibold text-green-200 uppercase tracking-widest mb-2">
              Plant Health
            </p>
            <h2 className="text-4xl font-bold text-white mb-3 leading-tight">
              Healthy
            </h2>
            <p className="text-green-100 text-sm leading-relaxed max-w-xs mb-5">
              Your bell pepper plant is growing under good conditions inside the greenhouse.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block" />
                Overall Condition: Good
              </span>
            </div>
          </div>

          {/* Right: Greenhouse image */}
          <div className="relative w-full sm:w-72 md:w-[26rem] lg:w-[28rem] flex-shrink-0 min-h-[200px] sm:min-h-0">
            <div
              className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
              style={{
                background: "linear-gradient(to right, #166534, transparent)",
              }}
            />
            <img
              src={greenhouseImg}
              alt="Healthy bell pepper plant in greenhouse"
              className="w-full h-full object-cover"
              style={{ minHeight: "200px" }}
            />
          </div>
        </div>
      </div>

      {/* ── Deep Sleep Banner ── */}
      {isDeepSleep && <DeepSleepBanner sleepSeconds={liveData.sleepDurationSeconds} />}

      {/* ── Current Conditions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">Current Conditions</h2>
          <div className="flex items-center gap-3">
            {connected && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Activity size={13} />
                <span>Auto-refresh via Firebase</span>
              </div>
            )}
            <DeviceStatusPill status={liveData.deviceStatus} />
          </div>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 transition-opacity duration-500 ${isDeepSleep ? "opacity-50" : "opacity-100"}`}>
          {CONDITION_CARDS.map((c) => (
            <ConditionCard key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* ── NPK Soil Sensor Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white flex flex-col sm:flex-row items-stretch">
        <div className="relative w-full sm:w-48 md:w-56 flex-shrink-0 min-h-[140px] sm:min-h-0">
          <img
            src={npkImg}
            alt="NPK soil sensor in field"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-y-0 right-0 w-12 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, white)" }}
          />
        </div>
        <div className="flex-1 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <FlaskConical size={15} className="text-amber-600" />
            </span>
            <span className="text-base font-bold text-gray-800">NPK Soil Sensor</span>
            <span
              className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold border ${!connected
                  ? "bg-gray-50 text-gray-500 border-gray-100"
                  : isDeepSleep
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : npkOverallStatus === "Optimal"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
            >
              {connected ? npkOverallStatus : "Connecting…"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {[
              { label: "Nitrogen", value: bannerN, status: bannerNStatus, unit: "ppm", color: "text-blue-600" },
              { label: "Phosphorus", value: bannerP, status: bannerPStatus, unit: "ppm", color: "text-purple-600" },
              { label: "Potassium", value: bannerK, status: bannerKStatus, unit: "ppm", color: "text-amber-600" },
            ].map(({ label, value, status, unit, color }) => (
              <div key={label} className="flex flex-col">
                <span className="text-sm font-medium text-gray-600 mb-0.5">{label}</span>
                <span className={`text-2xl font-bold ${color}`}>
                  {sensorData ? value : "—"}
                  <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>
                </span>
                {sensorData && status !== "Good" && (
                  <span className="text-[11px] font-semibold mt-0.5 text-amber-600">{status}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {sensorData
              ? bannerNpkOverallStatus === "Optimal"
                ? "Soil nutrient levels are within optimal range for bell pepper growth."
                : "One or more nutrient levels need attention. Review the condition cards above."
              : "Waiting for live sensor data from the LoRa network…"}
          </p>
        </div>
      </div>

      {/* ── Power Consumption History + Energy Consumption Over Time ── */}
      <PowerMonitoringRow />

      {/* ── Lower Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Suggestions — 2 cols */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Card Header with Status and AI Live Indicator */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                <Lightbulb size={18} />
              </div>
              <span>What Your Plant Need - AI suggestions</span>
            </h2>
            <div className="flex items-center gap-2">
              {showSuccessBadge && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  AI Telemetry Synced
                </span>
              )}
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Agronomist Active
              </span>
            </div>
          </div>

          {/* AI Scanning / Analyzing Progress Banner */}
          {isAnalyzing && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <Loader2 size={14} className="animate-spin text-emerald-600" />
                  <span>{analysisStep.text}</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 font-bold">{analysisStep.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${analysisStep.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Suggestions List */}
          <div className="space-y-3 flex-1">
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} {...s} />
            ))}
          </div>

          {/* Bottom Card Footer: Status on left & AI Check Button on bottom right */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 mt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Bot size={15} className="text-emerald-600" />
                Agronomy Engine
              </span>
              <span>·</span>
              <span>Updated: {lastAnalyzed}</span>
            </div>

            {/* AI Action Button in Bottom Right Corner */}
            <button
              id="check-ai-suggestions-btn"
              type="button"
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing}
              className={`relative group overflow-hidden px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm select-none outline-none focus:outline-none focus:ring-0 ${isAnalyzing
                ? "bg-emerald-700 cursor-not-allowed opacity-90"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-md hover:shadow-emerald-500/25 active:scale-95"
                }`}
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></span>
              {isAnalyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Evaluating Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-emerald-200 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Check AI Suggestions</span>
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* System Connection */}
          <Card className="p-5">
            <h2 className="text-base font-bold text-gray-800 mb-3">System Connection</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Status</span>
                <StatusBadge status={!connected ? "Waiting for data" : isDeepSleep ? "Deep Sleep" : "Connected"} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Node ID</span>
                <span className="text-gray-800 font-semibold">{liveData.nodeId ?? "pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">RSSI / SNR</span>
                <span className="text-gray-800 font-semibold">{liveData.rssi ?? "pending"} dBm / {liveData.snr ?? "—"} dB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Tx Power / Count</span>
                <span className="text-gray-800 font-semibold">{liveData.txPower ?? "pending"} dBm / {liveData.txCount ?? "pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Spreading Factor (SF)</span>
                <span className="text-gray-800 font-semibold">{liveData.sf != null ? `SF${liveData.sf}` : "pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Boot Count</span>
                <span className="text-gray-800 font-semibold">{liveData.bootCount ?? "pending"}</span>
              </div>
            </div>
            <Link
              to="/communication"
              className="mt-4 flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"
            >
              View Technical Details <ArrowRight size={12} />
            </Link>
          </Card>

          {/* Energy */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-800">Energy</h2>
              <Zap size={16} className={isDeepSleep ? "text-blue-500" : "text-amber-500"} />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-3">
              {isDeepSleep ? "Power Saving Active (Deep Sleep)" : "Normal Active Mode"}
            </p>
            <p className="text-4xl font-bold text-gray-900 mb-1">{isDeepSleep ? "98.9%" : "0%"}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Power reduction · measured using INA226 power monitoring.
            </p>
            <Link
              to="/power"
              className="mt-3 flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"
            >
              View Power Details <ArrowRight size={12} />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
