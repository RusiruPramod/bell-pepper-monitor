// ─── Ideal ranges ───────────────────────────────────────────────────────────
export const IDEAL_RANGES = {
  temperature: { min: 20, max: 30, unit: "°C" },
  humidity: { min: 50, max: 70, unit: "%" },
};

// ─── Live readings ───────────────────────────────────────────────────────────
export const LIVE_READINGS = {
  temperature: 28,
  humidity: 68,
  nitrogen: { value: 46, status: "Good" },
  phosphorus: { value: 38, status: "Good" },
  potassium: { value: 18, status: "Low" },
};

// ─── Status helper ───────────────────────────────────────────────────────────
export function statusFor(param, value) {
  const range = IDEAL_RANGES[param];
  if (!range) return "Unknown";
  if (value < range.min) return "Low";
  if (value > range.max) return "High";
  return "Good";
}

// ─── AI Suggestions ──────────────────────────────────────────────────────────
export const SUGGESTIONS = [
  {
    id: 1,
    tone: "warn",
    title: "Potassium needs attention",
    body: "Potassium level is low (18 ppm). Consider applying a potassium-rich fertilizer to support fruit development.",
  },
  {
    id: 2,
    tone: "good",
    title: "Temperature looks good",
    body: "Current temperature (28°C) is within the ideal range. Keep the environment stable.",
  },
  {
    id: 3,
    tone: "good",
    title: "Humidity is healthy",
    body: "Humidity at 68% is well within optimal range. No adjustments needed right now.",
  },
];

// ─── History generator ────────────────────────────────────────────────────────
function rand(min, max) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

export function genHistory(rangeLabel) {
  const counts = { Today: 12, "7 Days": 7, "30 Days": 30 };
  const n = counts[rangeLabel] ?? 7;

  return Array.from({ length: n }, (_, i) => {
    let label;
    if (rangeLabel === "Today") {
      const h = 8 + i;
      label = `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
    } else if (rangeLabel === "7 Days") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      label = days[i % 7];
    } else {
      label = `Day ${i + 1}`;
    }

    return {
      label,
      temperature: rand(22, 32),
      humidity: rand(52, 75),
      nitrogen: rand(40, 55),
      phosphorus: rand(30, 45),
      potassium: rand(12, 28),
    };
  });
}

// ─── Power comparison table ───────────────────────────────────────────────────
export const POWER_COMPARISON = [
  { metric: "Voltage", normal: "3.3 V", deepSleep: "3.3 V" },
  { metric: "Current", normal: "195 mA", deepSleep: "≈1.97 mA*" },
  { metric: "Power Consumption", normal: "643.5 mW", deepSleep: "7.1 mW*" },
  { metric: "Cycle Duration", normal: "Always ON", deepSleep: "30 s" },

  { metric: "Power Used vs Normal", normal: "100%", deepSleep: "≈1.1%" },

];
