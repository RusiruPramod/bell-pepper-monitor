import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("login"); // "login" | "register"
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
  });

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email: form.email, name: form.name });
    navigate("/");
  };

  const inputCls =
    "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center mb-4 shadow-md">
            <Sprout size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Bell Pepper Monitor</h1>
          <p className="text-sm text-gray-500 text-center mt-1 leading-relaxed">
            Monitor your plant. Understand its health. Grow better.
          </p>
        </div>

        {/* Toggle pill */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {["login", "register"].map((t) => (
            <button
              key={t}
              id={`auth-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                id="register-name"
                type="text"
                required
                placeholder="Your name"
                value={form.name}
                onChange={set("name")}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              {tab === "login" && (
                <a href="#" className="text-xs text-green-600 hover:underline">
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPw ? "text" : "password"}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {tab === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="register-confirm"
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set("confirm")}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors mt-2"
          >
            {tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Demo mode — any email/password will sign you in.
        </p>
      </div>
    </div>
  );
}
