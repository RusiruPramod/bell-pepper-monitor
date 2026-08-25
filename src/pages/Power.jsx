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
        <h2 className="text-base font-bold text-gray-800 mb-4">Normal vs Deep Sleep</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-600 font-semibold text-sm">Parameter</th>
                <th className="text-left py-2 pr-4 text-gray-800 font-bold text-sm">Normal Active Mode</th>
                <th className="text-left py-2 pr-4 text-gray-800 font-bold text-sm">Deep Sleep Mode</th>
              </tr>
            </thead>
            <tbody>
              {POWER_COMPARISON.map((row) => (
                <tr key={row.metric} className="border-b border-gray-100">
                  <td className="py-3 pr-4 text-gray-600 font-semibold">{row.metric}</td>
                  <td className="py-3 pr-4 text-gray-800 font-medium">{row.normal}</td>
                  <td className="py-3 text-gray-800 font-medium">{row.deepSleep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Card>

      {/* Live Energy Draw */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-gray-800 mb-6">Live Energy Draw Cycle</h2>
        <div className="flex justify-center items-start gap-12 sm:gap-20">
          <EnergyTank label="Normal Usage" targetPercent={100} color="high-green" />
          <EnergyTank cycleMode={true} />
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          8s cycle: Ramping up to 100%, then transitioning to a fixed 1.1% deep sleep power draw
        </p>
      </Card>

      {/* Efficiency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Power Reduction */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">Power Reduction</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-5xl font-bold text-gray-900 mt-3">98.9%</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Target power reduction achieved during deep sleep mode.
          </p>
        </Card>

        {/* Measured Efficiency */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">Measured Efficiency</h2>
            <StatusBadge status="Good" />
          </div>
          <p className="text-5xl font-bold text-gray-900 mt-3">98.9%</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Calculated from live INA226 Normal (643.5 mW) vs Deep Sleep (7.1 mW) readings.
          </p>
        </Card>
      </div>
    </div>
  );
}
