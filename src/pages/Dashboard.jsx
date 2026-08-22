import { Link } from "react-router-dom";
import {
  Thermometer, Droplets, FlaskConical, Atom, Leaf, ArrowRight, Zap,
  Sunrise, Sun, Sunset, Moon, Lightbulb,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ConditionCard from "../components/ConditionCard";
import SuggestionCard from "../components/SuggestionCard";
import { Card, StatusBadge } from "../components/ui";
import { LIVE_READINGS, statusFor, SUGGESTIONS } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import greenhouseImg from "../assets/bell_pepper_greenhouse.jpg";
import npkImg from "../assets/npk_sensor.jpg";

const CONDITION_CARDS = [
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
            {/* Gradient fade on left edge to blend into green */}
            <div
              className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, #166534, transparent)",
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Conditions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CONDITION_CARDS.map((c) => (
            <ConditionCard key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* ── NPK Soil Sensor Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white flex flex-col sm:flex-row items-stretch">
        {/* Image on left */}
        <div className="relative w-full sm:w-48 md:w-56 flex-shrink-0 min-h-[140px] sm:min-h-0">
          <img
            src={npkImg}
            alt="NPK soil sensor in field"
            className="w-full h-full object-cover"
          />
          {/* Right fade */}
          <div
            className="absolute inset-y-0 right-0 w-12 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, white)" }}
          />
        </div>
        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <FlaskConical size={15} className="text-amber-600" />
            </span>
            <span className="text-sm font-semibold text-gray-700">NPK Soil Sensor</span>
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
                <span className="text-xs text-gray-400 mb-0.5">{label}</span>
                <span className={`text-xl font-bold ${color}`}>
                  {value}
                  <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Soil nutrient levels are within optimal range for bell pepper growth.
          </p>
        </div>
      </div>

      {/* ── Lower Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suggestions — 2 cols */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <span>What Your Plant Needs</span>
          </h2>
          <div className="space-y-3">
            {SUGGESTIONS.map((s) => (
              <SuggestionCard key={s.id} {...s} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            AI suggestions can be enabled via Settings.
          </p>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* System Connection */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">System Connection</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <StatusBadge status="Connected" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Signal</span>
                <span className="text-gray-800 font-medium">Good</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last update</span>
                <span className="text-gray-800 font-medium">10s ago</span>
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
              <h2 className="text-sm font-semibold text-gray-700">Energy</h2>
              <Zap size={16} className="text-green-600" />
            </div>
            <p className="text-xs text-gray-400 mb-3">Power Saving Active</p>
            <p className="text-3xl font-semibold text-gray-900 mb-1">30%</p>
            <p className="text-xs text-gray-400 leading-relaxed">
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
