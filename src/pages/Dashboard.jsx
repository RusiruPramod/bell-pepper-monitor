import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Thermometer, Droplets, FlaskConical, Atom, Leaf, ArrowRight, Zap,
  Sunrise, Sun, Sunset, Moon, Lightbulb, Sparkles, Loader2, Bot, CheckCircle2,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ConditionCard from "../components/ConditionCard";
import SuggestionCard from "../components/SuggestionCard";
import { Card, StatusBadge } from "../components/ui";
import { LIVE_READINGS, statusFor } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import greenhouseImg from "../assets/bell_pepper_greenhouse.jpg";
import npkImg from "../assets/npk_sensor1.jpeg";

const CONDITION_CARDS = [
  {
    icon: FlaskConical,
    label: "Nitrogen",
    value: LIVE_READINGS.nitrogen.value,
    unit: "ppm",
    status: LIVE_READINGS.nitrogen.status,
  },
  {
    icon: Atom,
    label: "Phosphorus",
    value: LIVE_READINGS.phosphorus.value,
    unit: "ppm",
    status: LIVE_READINGS.phosphorus.status,
  },
  {
    icon: Leaf,
    label: "Potassium",
    value: LIVE_READINGS.potassium.value,
    unit: "ppm",
    status: LIVE_READINGS.potassium.status,
  },
  {
    icon: Thermometer,
    label: "Temperature",
    value: LIVE_READINGS.temperature,
    unit: "°C",
    status: statusFor("temperature", LIVE_READINGS.temperature),
  },
  {
    icon: Droplets,
    label: "Humidity",
    value: LIVE_READINGS.humidity,
    unit: "%",
    status: statusFor("humidity", LIVE_READINGS.humidity),
  },

];

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

  const handleRunAIAnalysis = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setShowSuccessBadge(false);

    // Step 1: Scan telemetry
    setAnalysisStep({ text: "Reading live LoRa sensor telemetry...", progress: 25 });

    setTimeout(() => {
      // Step 2: Crop growth model
      setAnalysisStep({ text: "Evaluating Bell Pepper NPK & VPD microclimate curves...", progress: 60 });
    }, 700);

    setTimeout(() => {
      // Step 3: Synthesizing recommendations
      setAnalysisStep({ text: "Synthesizing actionable agronomic recommendations...", progress: 90 });
    }, 1450);

    setTimeout(() => {
      // Step 4: Finalize
      setAnalysisStep({ text: "AI Recommendations Generated!", progress: 100 });

      const nextIndex = (presetIndex + 1) % AI_SUGGESTION_PRESETS.length;
      setPresetIndex(nextIndex);
      setSuggestions(AI_SUGGESTION_PRESETS[nextIndex]);
      setIsAnalyzing(false);
      setShowSuccessBadge(true);
      setLastAnalyzed(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );

      setTimeout(() => setShowSuccessBadge(false), 3500);
    }, 2200);
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

      {/* ── Current Conditions ── */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Current Conditions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-100">
              Optimal
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {[
              { label: "Nitrogen", value: LIVE_READINGS.nitrogen.value, unit: "ppm", color: "text-blue-600" },
              { label: "Phosphorus", value: LIVE_READINGS.phosphorus.value, unit: "ppm", color: "text-purple-600" },
              { label: "Potassium", value: LIVE_READINGS.potassium.value, unit: "ppm", color: "text-amber-600" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex flex-col">
                <span className="text-sm font-medium text-gray-600 mb-0.5">{label}</span>
                <span className={`text-2xl font-bold ${color}`}>
                  {value}
                  <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Soil nutrient levels are within optimal range for bell pepper growth.
          </p>
        </div>
      </div>

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
                <StatusBadge status="Connected" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Signal</span>
                <span className="text-gray-800 font-semibold">Good</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Last update</span>
                <span className="text-gray-800 font-semibold">10s ago</span>
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
              <Zap size={16} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-3">Power Saving Active</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">30%</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Efficiency reference · measured using INA226 power monitoring.
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
