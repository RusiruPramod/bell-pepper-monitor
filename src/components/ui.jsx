// Card component
export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white border-2 border-gray-200 rounded-3xl shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

// StatusBadge component — always shows text + color
const STATUS_STYLES = {
  Good:              "bg-green-100 text-green-700",
  Healthy:           "bg-green-100 text-green-700",
  Low:               "bg-amber-100 text-amber-700",
  High:              "bg-amber-100 text-amber-700",
  "Needs Attention": "bg-amber-100 text-amber-700",
  Critical:          "bg-red-100  text-red-700",
  "No Data":         "bg-gray-100 text-gray-500",
  Connected:         "bg-green-100 text-green-700",
  Online:            "bg-green-100 text-green-700",
  Sleep:             "bg-blue-100  text-blue-700",
  "Deep Sleep":      "bg-blue-100  text-blue-700",
  "AI Ready":        "bg-green-100 text-green-700",
  "AI Not Configured": "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status, className = "" }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${style} ${className}`}
    >
      {status}
    </span>
  );
}
