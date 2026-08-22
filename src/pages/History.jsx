import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import PageHeader from "../components/PageHeader";
import { Card } from "../components/ui";
import { genHistory } from "../data/mockData";

const RANGES = ["Today", "7 Days", "30 Days"];

function ChartCard({ title, children }) {
  return (
    <Card className="p-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
          {p.name === "Temperature" ? "°C" : p.name === "Humidity" ? "%" : " ppm"}
        </p>
      ))}
    </div>
  );
};

export default function History() {
  const [range, setRange] = useState("7 Days");
  const data = genHistory(range);

  return (
    <div className="space-y-6">
      <PageHeader title="Plant History" subtitle="Trends over time" />

      {/* Filter pills */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            id={`history-range-${r.replace(" ", "-").toLowerCase()}`}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${range === r
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {r}
          </button>
        ))}
      </div>
      {/* NPK grouped bar chart */}
      <ChartCard title="NPK Levels (ppm)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="nitrogen" name="Nitrogen" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="phosphorus" name="Phosphorus" fill="#65a30d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="potassium" name="Potassium" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {/* Temperature line chart */}
      <ChartCard title="Temperature (°C)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[18, 36]} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#16a34a" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Humidity line chart */}
      <ChartCard title="Humidity (%)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[40, 90]} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="humidity"
              name="Humidity"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3, fill: "#0ea5e9" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>


    </div>
  );
}
