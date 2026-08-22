import { Wifi } from "lucide-react";

export default function PageHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
          <Wifi size={12} />
          System Online
        </span>
        <span className="text-xs text-gray-400">Updated 10 seconds ago</span>
      </div>
    </div>
  );
}
