import { StatusBadge } from "./ui";

export default function ConditionCard({ icon: Icon, label, value, unit, status }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
            <Icon size={16} className="text-green-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}
