import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, Sprout } from "lucide-react";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content area — offset by sidebar width on lg */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
          <button
            id="mobile-menu-btn"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Sprout size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Bell Pepper Monitor</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
