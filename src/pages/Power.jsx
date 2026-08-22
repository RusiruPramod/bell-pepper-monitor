import PageHeader from "../components/PageHeader";
import EnergyTank from "../components/EnergyTank";
import { Card, StatusBadge } from "../components/ui";
import { POWER_COMPARISON } from "../data/mockData";

export default function Power() {
  return (
    <div className="space-y-6">
      <PageHeader title="Power Monitoring" subtitle="Measured using INA226" />

      {/* Comparison Table */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Normal vs Deep Sleep</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Metric</th>
                <th className="text-left py-2 pr-4 text-gray-700 font-semibold">Normal Mode</th>
                <th className="text-left py-2 text-gray-700 font-semibold">Deep Sleep Mode</th>
              </tr>
            </thead>
            <tbody>
              {POWER_COMPARISON.map((row) => (
                <tr key={row.metric} className="border-b border-gray-50">
                  <td className="py-3 pr-4 text-gray-500 font-medium">{row.metric}</td>
                  <td className="py-3 pr-4 text-gray-800">{row.normal}</td>
                  <td className="py-3 text-gray-800">{row.deepSleep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Energy Draw */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-6">Live Energy Draw Cycle</h2>
        <div className="flex justify-center items-start gap-12 sm:gap-20">
          <EnergyTank label="Normal Usage" targetPercent={100} color="high-green" />
          <EnergyTank cycleMode={true} />
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          8s cycle: Ramping up to 100%, then transitioning to a fixed 30% deep sleep efficiency
        </p>
      </Card>

      {/* Efficiency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reference Efficiency */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Reference Efficiency</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-4xl font-semibold text-gray-900 mt-3">30%</p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Manually set target — not a live sensor reading.
          </p>
        </Card>

        {/* Measured Efficiency */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Measured Efficiency</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-4xl font-semibold text-gray-900 mt-3">30%</p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Calculated from live INA226 Normal vs Deep Sleep readings.
          </p>
        </Card>
      </div>
    </div>
  );
}
