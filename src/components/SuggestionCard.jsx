import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function SuggestionCard({ tone, title, body }) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`rounded-2xl p-4 flex gap-3 ${
        isWarn
          ? "bg-amber-50 border border-amber-100"
          : "bg-green-50 border border-green-100"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isWarn ? (
          <AlertTriangle size={18} className="text-amber-500" />
        ) : (
          <CheckCircle2 size={18} className="text-green-600" />
        )}
      </div>
      <div>
        <p
          className={`text-sm font-semibold ${
            isWarn ? "text-amber-800" : "text-green-800"
          }`}
        >
          {title}
        </p>
        <p
          className={`text-xs mt-1 leading-relaxed ${
            isWarn ? "text-amber-700" : "text-green-700"
          }`}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
