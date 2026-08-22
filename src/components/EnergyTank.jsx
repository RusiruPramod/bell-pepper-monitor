import { useEffect, useRef, useState } from "react";

export default function EnergyTank({ label, targetPercent, color = "green" }) {
  const [fill, setFill] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Animate fill toward targetPercent on mount and whenever target changes
    setFill(0);
    let current = 0;
    const step = targetPercent / 40; // reach target in ~40 ticks (~800ms)

    intervalRef.current = setInterval(() => {
      current += step;
      if (current >= targetPercent) {
        current = targetPercent;
        clearInterval(intervalRef.current);
      }
      setFill(current);
    }, 20);

    // Small oscillation after reaching target
    let dir = 1;
    const oscillate = () => {
      intervalRef.current = setInterval(() => {
        setFill((prev) => {
          const next = prev + dir * 0.15;
          if (next >= targetPercent + 0.6) dir = -1;
          if (next <= targetPercent - 0.6) dir = 1;
          return next;
        });
      }, 80);
    };

    const initTimer = setTimeout(oscillate, 900);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(initTimer);
    };
  }, [targetPercent]);

  const colorMap = {
    green: { bar: "bg-green-500", glow: "shadow-green-300" },
    blue:  { bar: "bg-blue-500",  glow: "shadow-blue-300"  },
    "high-green": { bar: "bg-gradient-to-t from-green-600 via-green-400 to-emerald-300", glow: "shadow-green-400" },
    "low-green": { bar: "bg-green-400/90", glow: "shadow-green-300" },
  };
  const c = colorMap[color] ?? colorMap.green;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-semibold text-gray-600">{label}</span>
      <div className="w-12 h-48 bg-gray-100 rounded-full relative overflow-hidden border border-gray-200">
        <div
          className={`absolute bottom-0 left-0 right-0 ${c.bar} shadow-lg ${c.glow} transition-none rounded-full`}
          style={{ height: `${fill}%` }}
        />
        {/* Bubble overlays */}
        <div className="absolute inset-0 flex flex-col justify-end pb-2 items-center gap-1 pointer-events-none">
          {fill > 15 && (
            <div className="w-2 h-2 rounded-full bg-white opacity-30 animate-bounce" style={{ animationDelay: "0.1s" }} />
          )}
          {fill > 30 && (
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20 animate-bounce" style={{ animationDelay: "0.3s" }} />
          )}
        </div>
      </div>
      <span className="text-2xl font-semibold text-gray-900">
        {Math.round(fill)}%
      </span>
    </div>
  );
}
