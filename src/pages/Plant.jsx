import {
  Thermometer, Droplets, FlaskConical, Atom, Leaf,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ConditionCard from "../components/ConditionCard";
import SuggestionCard from "../components/SuggestionCard";
import { Card, StatusBadge } from "../components/ui";
import { LIVE_READINGS, statusFor, SUGGESTIONS } from "../data/mockData";

const CONDITION_CARDS = [
  { icon: Thermometer, label: "Temperature", value: LIVE_READINGS.temperature, unit: "°C",  status: statusFor("temperature", LIVE_READINGS.temperature) },
  { icon: Droplets,   label: "Humidity",    value: LIVE_READINGS.humidity,    unit: "%",   status: statusFor("humidity",    LIVE_READINGS.humidity)    },
  { icon: FlaskConical, label: "Nitrogen",  value: LIVE_READINGS.nitrogen.value,   unit: "ppm", status: LIVE_READINGS.nitrogen.status    },
  { icon: Atom,       label: "Phosphorus",  value: LIVE_READINGS.phosphorus.value, unit: "ppm", status: LIVE_READINGS.phosphorus.status  },
  { icon: Leaf,       label: "Potassium",   value: LIVE_READINGS.potassium.value,  unit: "ppm", status: LIVE_READINGS.potassium.status   },
];

export default function Plant() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Bell Pepper" subtitle="Digital plant health profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant profile card */}
        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center">
            <Leaf size={40} className="text-green-600" />
          </div>
          <div>
            <StatusBadge status="Healthy" className="mb-2" />
            <h2 className="text-2xl font-semibold text-gray-900 mt-2">Healthy</h2>
            <p className="text-sm text-gray-500 mt-1">Bell Pepper · <em>Capsicum annuum</em></p>
          </div>
          <div className="w-full border-t border-gray-100 pt-4 text-left space-y-2">
            <InfoRow label="Species" value="Capsicum annuum" />
            <InfoRow label="Common Name" value="Bell Pepper" />
            <InfoRow label="Growth Stage" value="Fruiting" />
            <InfoRow label="Last Check" value="10 seconds ago" />
          </div>
        </Card>

        {/* Right side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Conditions mini grid */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Current Conditions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CONDITION_CARDS.map((c) => (
                <ConditionCard key={c.label} {...c} />
              ))}
            </div>
          </Card>

          {/* Suggestions */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">💡 Plant Suggestions</h2>
            <div className="space-y-3">
              {SUGGESTIONS.map((s) => (
                <SuggestionCard key={s.id} {...s} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
