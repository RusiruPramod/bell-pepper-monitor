import { StatusBadge } from "./ui";

export default function ConditionCard({ icon: Icon, label, value, unit, status }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md p-5 flex flex-col gap-3 relative overflow-hidden">
      {/* Accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-green-400 to-emerald-500" />
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Icon size={18} className="text-green-600" />
          </div>
          <span className="text-base font-semibold text-gray-800">{label}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}
