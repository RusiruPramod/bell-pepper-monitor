import { useEffect, useRef, useState } from "react";

export default function EnergyTank({
  label,
  targetPercent = 100,
  color = "high-green",
  cycleMode = false,
}) {
  const [fill, setFill] = useState(0);
  const [modeLabel, setModeLabel] = useState(label || "Normal Mode");
  const [activeColor, setActiveColor] = useState(color);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (cycleMode) {
      let startTime = Date.now();
      let animationFrame;

      const cycle = () => {
        const elapsed = (Date.now() - startTime) % 8000;

        if (elapsed < 1000) {
          // 0 to 1s: Level up to 100%
          setFill(Math.min(100, (elapsed / 1000) * 100));
          setModeLabel("Normal Mode");
          setActiveColor("high-green");
        } else if (elapsed < 3000) {
          // 1s to 3s: Hold at 100%
          setFill(100);
          setModeLabel("Normal Mode");
          setActiveColor("high-green");
        } else if (elapsed < 5000) {
          // 3s to 5s: Slowly level down to 1.1%
          const dropProgress = (elapsed - 3000) / 2000;
          setFill(100 - dropProgress * 98.9);
          setModeLabel("Deep Sleep Mode Start");
          setActiveColor("low-green");
        } else {
          // 5s to 8s: Hold fixed at exactly 1.1%
          setFill(1.1);
          setModeLabel("Deep Sleep Mode");
          setActiveColor("low-green");
        }

        animationFrame = requestAnimationFrame(cycle);
      };

      animationFrame = requestAnimationFrame(cycle);
      return () => cancelAnimationFrame(animationFrame);
    } else {
      // Static / Target animation on mount
      setFill(0);
      let current = 0;
      const step = targetPercent / 40;

      intervalRef.current = setInterval(() => {
        current += step;
        if (current >= targetPercent) {
          current = targetPercent;
          clearInterval(intervalRef.current);
        }
        setFill(current);
      }, 20);

      return () => {
        clearInterval(intervalRef.current);
      };
    }
  }, [cycleMode, targetPercent]);

  const colorMap = {
    green: {
      bar: "bg-green-500",
      glow: "shadow-green-300",
      text: "text-gray-700",
    },
    blue: {
      bar: "bg-blue-500",
      glow: "shadow-blue-300",
      text: "text-blue-600",
    },
    "high-green": {
      bar: "bg-gradient-to-t from-green-600 via-green-400 to-emerald-300",
      glow: "shadow-green-400",
      text: "text-emerald-600",
    },
    "low-green": {
      bar: "bg-green-400/90",
      glow: "shadow-green-300",
      text: "text-green-600",
    },
  };

  const currentColorKey = cycleMode ? activeColor : color;
  const c = colorMap[currentColorKey] ?? colorMap["high-green"];
  const displayLabel = cycleMode ? modeLabel : label;

  return (
    <div className="flex flex-col items-center gap-3 w-44 sm:w-48 shrink-0">
      {/* Fixed height and width container for header text to prevent any jumping or layout shift */}
      <div className="h-6 flex items-center justify-center text-center w-full">
        <span
          className={`text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${cycleMode ? c.text : "text-gray-700"
            }`}
        >
          {displayLabel}
        </span>
      </div>

      {/* Tank Container - identical fixed dimensions across all states */}
      <div className="w-14 h-52 bg-gray-100 rounded-full relative overflow-hidden border border-gray-200 shadow-inner shrink-0">
        <div
          className={`absolute bottom-0 left-0 right-0 w-full ${c.bar} shadow-lg ${c.glow} transition-none`}
          style={{ height: `${Math.min(100, Math.max(0, fill))}%` }}
        />

        {/* Bubble overlays */}
        <div className="absolute inset-0 flex flex-col justify-end pb-2 items-center gap-1 pointer-events-none">
          {fill > 25 &&
            (currentColorKey === "high-green" || currentColorKey === "green") && (
              <div
                className="w-2 h-2 rounded-full bg-white opacity-30 animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
            )}
          {fill > 60 &&
            (currentColorKey === "high-green" || currentColorKey === "green") && (
              <div
                className="w-1.5 h-1.5 rounded-full bg-white opacity-20 animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            )}
        </div>
      </div>

      {/* Percentage value with smooth curves and modern typography */}
      <div className="h-7 flex items-center justify-center w-full">
        <span className="text-xl font-bold text-gray-800 tracking-tight tabular-nums flex items-baseline justify-center select-none">
          {fill < 10 && fill % 1 !== 0 ? fill.toFixed(1) : Math.round(fill)}
          <span className="text-sm font-semibold text-gray-400 ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}
