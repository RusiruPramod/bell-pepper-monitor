import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login         from "./pages/Login";
import AppLayout     from "./components/AppLayout";
import Dashboard     from "./pages/Dashboard";
import Plant         from "./pages/Plant";
import History       from "./pages/History";
import Power         from "./pages/Power";
import Communication from "./pages/Communication";
import Settings      from "./pages/Settings";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — nested under AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index             element={<Dashboard />}     />
        <Route path="plant"      element={<Plant />}         />
        <Route path="history"    element={<History />}       />
        <Route path="power"      element={<Power />}         />
        <Route path="communication" element={<Communication />} />
        <Route path="settings"   element={<Settings />}      />
      </Route>

      {/* Catch-all → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
