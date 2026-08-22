import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogOut } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { Card, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { FIREBASE_CONFIGURED } from "../services/firebase";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [apiKey, setApiKey]         = useState("");
  const [savedKey, setSavedKey]     = useState("");
  const [showKey, setShowKey]       = useState(false);
  const aiConfigured                = Boolean(savedKey);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      setSavedKey(apiKey.trim());
      setApiKey("");
    }
  };

  const handleRemoveKey = () => {
    setSavedKey("");
    setApiKey("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const inputCls =
    "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white font-mono";

  const masked = savedKey
    ? savedKey.slice(0, 4) + "••••••••••••" + savedKey.slice(-4)
    : "";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, AI, and device configuration" />

      {/* Account */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Account</h2>
        <div className="space-y-3 text-sm mb-5">
          <InfoRow label="Profile name" value={user?.name ?? "—"} />
          <InfoRow label="Email"        value={user?.email ?? "—"} />
        </div>
        <button
          id="settings-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 border border-red-100 transition-colors font-medium"
        >
          <LogOut size={15} />
          Logout
        </button>
      </Card>

      {/* AI Suggestions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">AI Suggestions</h2>
          <StatusBadge status={aiConfigured ? "AI Ready" : "AI Not Configured"} />
        </div>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Add an API key to unlock AI-powered plant health suggestions. Your key is stored locally
          and never sent to our servers.
        </p>

        {aiConfigured ? (
          <div className="space-y-3">
            <div className="relative">
              <input
                id="settings-api-key-display"
                type={showKey ? "text" : "password"}
                readOnly
                value={showKey ? savedKey : masked}
                className={`${inputCls} pr-10 bg-gray-50`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                id="settings-update-key-btn"
                onClick={() => { setSavedKey(""); }}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
              >
                Update API Key
              </button>
              <button
                id="settings-remove-key-btn"
                onClick={handleRemoveKey}
                className="px-4 py-2 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                id="settings-api-key-input"
                type={showKey ? "text" : "password"}
                placeholder="Paste your API key here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              id="settings-save-key-btn"
              onClick={handleSaveKey}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              Save API Key
            </button>
          </div>
        )}
      </Card>

      {/* Device */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Device</h2>
        <div className="space-y-3 text-sm">
          <InfoRow label="Device Name"        value="ESP32-SN-01" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Connection Status</span>
            <StatusBadge status="Connected" />
          </div>
          <InfoRow label="Last Seen" value="10 seconds ago" />
        </div>
      </Card>

      {/* System */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">System</h2>
        <div className="space-y-3 text-sm">
          <InfoRow label="Application Version" value="1.0.0" />
          <InfoRow label="Data Retention"       value="30 days" />
          <InfoRow
            label="Firebase"
            value={FIREBASE_CONFIGURED ? "Configured" : "Not configured (demo mode)"}
          />
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
