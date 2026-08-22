import { useState } from "react";
import {
  Radio,
  Zap,
  Cpu,
  Activity,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  Signal,
  SlidersHorizontal,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import CommunicationScene from "../components/CommunicationScene";
import { Card, StatusBadge } from "../components/ui";

const TABS = [
  { id: "rf", label: "RF & Signal", icon: Radio },
  { id: "device", label: "Device Info", icon: Cpu },
  { id: "diagnostics", label: "Diagnostics", icon: Clock },
];

export default function Communication() {
  const [activeTab, setActiveTab] = useState("rf");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        subtitle="Sensor node ↔ receiver, live LoRa telemetry"
      />

      {/* Split Layout: 3D Link (Left) & Windows-style Details Pane (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: 3D Wireless Link & Status Overview ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Three.js card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <Radio size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Wireless Link</h2>
                  <p className="text-xs text-gray-400">915.0 MHz · LoRa Point-to-Point</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <StatusBadge status="Connected" />
              </div>
            </div>

            {/* Node Endpoints pill bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50/80 rounded-xl border border-gray-100 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-medium text-gray-700">Node:</span>
                <span className="font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200/60 shadow-2xs">
                  ESP32-SN-01
                </span>
              </div>
              <ArrowRightLeft size={14} className="text-gray-400 mx-1" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Gateway:</span>
                <span className="font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200/60 shadow-2xs">
                  ESP32-GW-01
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
            </div>

            {/* 3D Scene View */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-gray-50/60 to-gray-100/40 border border-gray-100">
              <CommunicationScene />
            </div>

            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              The sensor node (left) collects environment readings and transmits them wirelessly to the
              receiver (right) via LoRa. Packets are forwarded to the cloud for processing.
            </p>
          </Card>

          {/* Status mini cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              icon={Signal}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              label="Signal Strength"
              badge="Good"
              detail="-87 dBm"
            />
            <InfoCard
              icon={Zap}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              label="ADR Status"
              badge="Good"
              detail="SF7 / Auto"
            />
            <InfoCard
              icon={Activity}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="Power Mode"
              badge="Sleep"
              detail="0.9 mA idle"
            />
          </div>
        </div>

        {/* ── Right Column: Interactive Tab-based Technical Details ── */}
        <div className="lg:col-span-5" id="technical-details">
          <Card className="p-6 divide-y divide-gray-100 shadow-sm">
            {/* Header */}
            <div className="pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Technical Details</h2>
                  <p className="text-xs text-gray-400">Node & Connection Inspector</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Live Telemetry
              </span>
            </div>

            {/* Tab Selector & Dynamic Content Section */}
            <div className="py-4 space-y-4">
              {/* Tab Navigation Pill Bar */}
              <div className="flex p-1 bg-gray-100/90 rounded-2xl gap-1 border border-gray-200/60 shadow-2xs">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] sm:text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ${
                        isActive
                          ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-semibold"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/40 border border-transparent"
                      }`}
                      title={tab.label}
                    >
                      <Icon
                        size={13}
                        className={isActive ? "text-green-600" : "text-gray-400"}
                      />
                      <span className="truncate whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: RF & Signal Parameters */}
              {activeTab === "rf" && (
                <div className="space-y-2.5 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]">
                      <Radio size={13} className="text-gray-400" />
                      <span>RF & Signal Parameters</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200/50">
                      915.0 MHz ISM
                    </span>
                  </div>
                  <TechRow
                    label="RSSI (Signal Strength)"
                    value="-87 dBm"
                    badge={
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/50">
                        Good
                      </span>
                    }
                  />
                  <TechRow
                    label="SNR (Signal-to-Noise Ratio)"
                    value="+9.2 dB"
                    badge={
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/50">
                        Optimal
                      </span>
                    }
                  />
                  <TechRow label="Frequency Band" value="915.0 MHz (US915)" />
                  <TechRow label="Spreading Factor" value="SF7" />
                  <TechRow label="Signal Bandwidth" value="125 kHz" />
                  <TechRow label="Tx Power Output" value="+14 dBm (25 mW)" />
                  <TechRow label="Coding Rate" value="4/5" />
                  <TechRow label="Preamble Length" value="8 Symbols" />
                  <TechRow label="Sync Word" value="0x12 (Private Net)" />
                </div>
              )}

              {/* Tab 2: Device & Identification */}
              {activeTab === "device" && (
                <div className="space-y-2.5 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]">
                      <Cpu size={13} className="text-gray-400" />
                      <span>Device & Identification</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
                      SX1276 · ESP32
                    </span>
                  </div>
                  <TechRow label="Transmitter Node ID" value="ESP32-SN-01" highlight />
                  <TechRow label="Receiver Gateway ID" value="ESP32-GW-01" />
                  <TechRow label="Radio Transceiver" value="Semtech SX1276" />
                  <TechRow label="Microcontroller" value="ESP32-WROOM-32D (240MHz)" />
                  <TechRow label="Network Protocol" value="LoRa Point-to-Point" />
                  <TechRow label="Hardware DevEUI / MAC" value="70:B3:D5:7E:D0:05:4A:11" />
                  <TechRow label="Firmware Version" value="v1.3.2-prod" />
                  <TechRow label="Power Source" value="3.7V LiPo + Solar Harvester" />
                </div>
              )}

              {/* Tab 3: Transmission Diagnostics */}
              {activeTab === "diagnostics" && (
                <div className="space-y-2.5 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]">
                      <Clock size={13} className="text-gray-400" />
                      <span>Transmission Diagnostics</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200/50">
                      0% Loss
                    </span>
                  </div>
                  <TechRow
                    label="Last Handshake"
                    value="10 seconds ago"
                    badge={<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                  />
                  <TechRow label="Uplink Interval" value="Every 15 min" />
                  <TechRow label="Total Packets Sent" value="1,428 pkts" />
                  <TechRow
                    label="Packet Loss Rate"
                    value="0.00%"
                    badge={
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/50">
                        0 dropped
                      </span>
                    }
                  />
                  <TechRow label="Payload Data Length" value="24 Bytes" />
                  <TechRow label="Airtime per Packet" value="41.2 ms" />
                  <TechRow
                    label="Link Reliability"
                    value="99.98%"
                    badge={
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200/50">
                        High
                      </span>
                    }
                  />
                  <TechRow label="Queue Latency" value="1.4 ms" />
                </div>
              )}
            </div>

            {/* Footer / Security Info */}
            <div className="pt-4 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5 text-gray-600">
                <ShieldCheck size={14} className="text-green-600" />
                <span className="font-medium">AES-128 Encryption</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="font-mono text-[11px]">CRC Valid</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, iconBg, iconColor, label, badge, detail }) {
  return (
    <Card className="p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg ${
                iconBg ?? "bg-gray-50"
              } flex items-center justify-center ${iconColor ?? "text-gray-600"}`}
            >
              <Icon size={15} />
            </div>
          )}
          <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
        <StatusBadge status={badge} />
      </div>
      {detail && (
        <div className="text-right">
          <span className="text-xs font-mono font-medium text-gray-400">{detail}</span>
        </div>
      )}
    </Card>
  );
}

function TechRow({ label, value, badge, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-xs ${
            highlight
              ? "font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200/60"
              : "font-medium text-gray-800"
          }`}
        >
          {value}
        </span>
        {badge}
      </div>
    </div>
  );
}
