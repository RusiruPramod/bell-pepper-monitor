import PageHeader from "../components/PageHeader";
import CommunicationScene from "../components/CommunicationScene";
import { Card, StatusBadge } from "../components/ui";

export default function Communication() {
  return (
    <div className="space-y-6">
      <PageHeader title="Communication" subtitle="Sensor node ↔ receiver, live" />

      {/* Main Three.js card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Wireless Link</h2>
          <StatusBadge status="Connected" />
        </div>

        <CommunicationScene />

        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
          The sensor node (left) collects environment readings and transmits them wirelessly to the
          receiver (right) via LoRa. Packets are forwarded to the cloud for processing.
        </p>
      </Card>

      {/* Status mini cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard label="Signal Strength" value="Good" badge="Good" />
        <InfoCard label="ADR" value="Good" badge="Good" />
        <InfoCard label="Power Mode" value="Deep Sleep" badge="Deep Sleep" />
      </div>

      {/* Technical details (collapsible) */}
      <Card className="p-6">
        <details id="technical-details">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 select-none flex items-center gap-2">
            <span>View Technical Details</span>
          </summary>
          <div className="mt-4 space-y-2 text-sm">
            <TechRow label="RSSI"           value="-87 dBm" />
            <TechRow label="SNR"            value="9.2 dB"  />
            <TechRow label="Device ID"      value="ESP32-SN-01" />
            <TechRow label="Last Handshake" value="10 seconds ago" />
          </div>
        </details>
      </Card>
    </div>
  );
}

function InfoCard({ label, badge }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <StatusBadge status={badge} />
    </Card>
  );
}

function TechRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 font-mono text-xs">{value}</span>
    </div>
  );
}
