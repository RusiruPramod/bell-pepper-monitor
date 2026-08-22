import { Wifi } from "lucide-react";

export default function PageHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-base text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          <Wifi size={13} />
          System Online
        </span>
        <span className="text-sm text-gray-600">Updated 10 seconds ago</span>
      </div>
    </div>
  );
}
