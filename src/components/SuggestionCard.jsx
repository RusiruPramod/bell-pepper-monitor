import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export default function SuggestionCard({ tone, title, body, tag, category }) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`rounded-2xl p-4 flex gap-3.5 transition-all duration-300 ${
        isWarn
          ? "bg-amber-50/90 border border-amber-200/70 hover:border-amber-300"
          : "bg-green-50/90 border border-green-200/70 hover:border-green-300"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isWarn ? (
          <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-600">
            <AlertTriangle size={17} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-green-100/80 flex items-center justify-center text-green-600">
            <CheckCircle2 size={17} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p
            className={`text-sm font-semibold truncate ${
              isWarn ? "text-amber-900" : "text-green-900"
            }`}
          >
            {title}
          </p>
          {(tag || category) && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                isWarn
                  ? "bg-amber-200/60 text-amber-800 border border-amber-300/60"
                  : "bg-green-200/60 text-green-800 border border-green-300/60"
              }`}
            >
              {tag || category}
            </span>
          )}
        </div>
        <p
          className={`text-xs leading-relaxed ${
            isWarn ? "text-amber-800/90" : "text-green-800/90"
          }`}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
