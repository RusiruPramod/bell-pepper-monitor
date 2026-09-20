import { useState, useEffect, useRef } from "react";
import { Play, Square, RefreshCcw, Save, Timer, Clock } from "lucide-react";
import { Card, StatusBadge } from "./ui";

export default function SavingsCalculator({ activePower, sleepPower }) {
  const [mode, setMode] = useState("stopwatch"); // "stopwatch" | "timer"
  const [inputMinutes, setInputMinutes] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [logs, setLogs] = useState([]);
  
  const startTimeRef = useRef(null);
  const animationRef = useRef(null);
  
  // Audio-analyzer style visualization data (keeps last 50 points)
  const [chartData, setChartData] = useState(Array(50).fill({ active: 0, actual: 0 }));

  // Calculate duty cycle: 1s Active, 7s Sleep out of 8s
  const avgPowerActual = (activePower * 1 + sleepPower * 7) / 8;
  const avgPowerActiveOnly = activePower;

  // Real-time calculated values
  const elapsedSeconds = elapsedTimeMs / 1000;
  
  // Power is in mW. Energy in Joules (mJ = mW * s -> J = mW * s / 1000)
  const usedIfAlwaysActive = (avgPowerActiveOnly * elapsedSeconds) / 1000; 
  const usedActually = (avgPowerActual * elapsedSeconds) / 1000;
  const energySaved = usedIfAlwaysActive - usedActually;
  
  const targetTimeMs = inputMinutes * 60 * 1000;
  const remainingMs = Math.max(0, targetTimeMs - elapsedTimeMs);
  const isFinished = mode === "timer" && remainingMs === 0 && targetTimeMs > 0;

  useEffect(() => {
    if (isRunning) {
      const start = Date.now() - elapsedTimeMs;
      
      const tick = () => {
        const now = Date.now();
        const newElapsed = now - start;
        
        if (mode === "timer" && newElapsed >= targetTimeMs) {
          setElapsedTimeMs(targetTimeMs);
          setIsRunning(false);
          saveLog(targetTimeMs);
        } else {
          setElapsedTimeMs(newElapsed);
          
          // Update analyzer chart every frame with slight noise to make it look alive
          setChartData(prev => {
            const cyclePhase = (newElapsed % 8000) / 8000;
            // 0-1/8 is active, rest is sleep
            const isCurrentlyActive = cyclePhase < 0.125;
            
            const currentActualPower = isCurrentlyActive ? activePower : sleepPower;
            const currentActivePower = activePower;
            
            // Add some visual noise
            const noise = 1 + (Math.random() * 0.05 - 0.025);
            
            const newData = [...prev.slice(1), {
              active: currentActivePower * noise,
              actual: currentActualPower * noise
            }];
            return newData;
          });
          
          animationRef.current = requestAnimationFrame(tick);
        }
      };
      
      animationRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [isRunning, mode, targetTimeMs, activePower, sleepPower]);

  const toggleRun = () => {
    if (isFinished) {
      setElapsedTimeMs(0);
      setChartData(Array(50).fill({ active: 0, actual: 0 }));
    }
    setIsRunning(!isRunning);
  };

  const stopAndSave = () => {
    if (isRunning) setIsRunning(false);
    if (elapsedTimeMs > 0) saveLog(elapsedTimeMs);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedTimeMs(0);
    setChartData(Array(50).fill({ active: 0, actual: 0 }));
  };

  const saveLog = (finalTimeMs) => {
    const finalSeconds = finalTimeMs / 1000;
    const finalActive = (avgPowerActiveOnly * finalSeconds) / 1000;
    const finalActual = (avgPowerActual * finalSeconds) / 1000;
    const saved = finalActive - finalActual;
    const eff = "98.9"; // Hardcoded to always show 98.9% as requested
    
    setLogs(prev => [{
      id: Date.now(),
      duration: formatTime(finalTimeMs),
      actual: finalActual.toFixed(2),
      saved: saved.toFixed(2),
      eff: eff
    }, ...prev].slice(0, 5)); // keep last 5
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    const dec = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
    return `${m}:${s}.${dec}`;
  };

  // SVG Chart setup
  const maxChartValue = activePower * 1.2; // 20% headroom
  const pointsActive = chartData.map((d, i) => `${(i / 49) * 100},${100 - (d.active / maxChartValue) * 100}`).join(" ");
  const pointsActual = chartData.map((d, i) => `${(i / 49) * 100},${100 - (d.actual / maxChartValue) * 100}`).join(" ");

  return (
    <Card className="p-6 mt-6 border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Controls & Readouts */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Energy Savings Analyzer</h2>
            <p className="text-sm text-gray-500 mt-1">Measure real-time energy savings using the 8-second Deep Sleep duty cycle.</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => { setMode("stopwatch"); reset(); }}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === "stopwatch" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Timer className="w-4 h-4" /> Stopwatch
            </button>
            <button
              onClick={() => { setMode("timer"); reset(); }}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${mode === "timer" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Clock className="w-4 h-4" /> Timer
            </button>
          </div>

          {mode === "timer" && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Set Duration (Minutes):</label>
              <input 
                type="number" 
                min="0.1" 
                step="0.1"
                value={inputMinutes}
                onChange={(e) => setInputMinutes(parseFloat(e.target.value) || 0)}
                disabled={isRunning || elapsedTimeMs > 0}
                className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-5xl font-mono font-bold text-gray-900 tracking-tight tabular-nums w-48">
              {mode === "stopwatch" ? formatTime(elapsedTimeMs) : formatTime(remainingMs)}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={toggleRun}
                className={`flex items-center justify-center w-12 h-12 rounded-full text-white transition-all ${isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {isRunning ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <button 
                onClick={stopAndSave}
                disabled={elapsedTimeMs === 0 || isRunning}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save to Log"
              >
                <Save className="w-5 h-5" />
              </button>

              <button 
                onClick={reset}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                title="Reset"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Energy Used</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{usedActually.toFixed(2)} <span className="text-sm font-normal text-gray-500">Joules</span></p>
            </div>
            <div className="bg-emerald-500 p-4 rounded-2xl border border-emerald-600 shadow-sm text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Energy Saved</p>
                <p className="text-2xl font-bold mt-1">{energySaved.toFixed(2)} <span className="text-sm font-normal text-emerald-100">Joules</span></p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
                <Timer className="w-24 h-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Analyzer Graph & Logs */}
        <div className="flex-1 flex flex-col gap-6">
          
          <div className="bg-gray-900 rounded-2xl p-4 shadow-inner relative h-48 overflow-hidden flex flex-col border border-gray-800">
            <div className="flex justify-between items-center z-10 mb-2">
              <span className="text-xs font-mono text-gray-400">LIVE SPECTRUM ANALYZER</span>
              <div className="flex gap-4">
                <span className="text-xs font-mono text-amber-500 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-amber-500"></span> Always Active
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-emerald-400"></span> Deep Sleep Cycle
                </span>
              </div>
            </div>
            
            {/* SVG Graph Grid Background */}
            <div className="absolute inset-0 pt-10 pb-4 px-4 pointer-events-none opacity-20">
               <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                      <rect width="40" height="20" fill="none" />
                      <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#ffffff" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
               </svg>
            </div>

            {/* SVG Dynamic Lines */}
            <div className="flex-1 relative z-10 w-full h-full">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                {/* Active (Top) Line */}
                <polyline 
                  points={pointsActive} 
                  fill="none" 
                  stroke="#f59e0b" /* amber-500 */
                  strokeWidth="1.5" 
                  vectorEffect="non-scaling-stroke"
                />
                
                {/* Actual (Bottom) Line with fill */}
                <polyline 
                  points={`${(49/49)*100},100 0,100 ${pointsActual}`} 
                  fill="rgba(52, 211, 153, 0.15)" /* emerald-400 translucent */
                  stroke="none"
                />
                <polyline 
                  points={pointsActual} 
                  fill="none" 
                  stroke="#34d399" /* emerald-400 */
                  strokeWidth="2" 
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[160px]">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              Saved Sessions Log
            </div>
            <div className="p-0 overflow-y-auto max-h-40">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 flex flex-col items-center">
                  <span>No sessions logged yet.</span>
                  <span className="text-xs mt-1">Stop the timer and click Save.</span>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs">
                    <tr>
                      <th className="px-4 py-2 font-medium">Duration</th>
                      <th className="px-4 py-2 font-medium">Actual (J)</th>
                      <th className="px-4 py-2 font-medium">Saved (J)</th>
                      <th className="px-4 py-2 font-medium">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-gray-600">{log.duration}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{log.actual}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-600">+{log.saved}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            {log.eff}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
}
