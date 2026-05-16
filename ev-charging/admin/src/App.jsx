import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import axios from "axios";
import { clearTokens, configureAxiosAuth, setAccessToken, setRefreshToken } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import RequireRole from "./components/RequireRole";

// Lazy-load route pages for better initial bundle size.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StationList = lazy(() => import("./pages/stations/StationList"));
const StationCreate = lazy(() => import("./pages/stations/StationCreate"));
const StationDetail = lazy(() => import("./pages/stations/StationDetail"));
const ChargerList = lazy(() => import("./pages/chargers/ChargerList"));
const ChargerCreate = lazy(() => import("./pages/chargers/ChargerCreate"));
const ChargerDetail = lazy(() => import("./pages/chargers/ChargerDetail"));
const UserList = lazy(() => import("./pages/users/UserList"));
const UserDetail = lazy(() => import("./pages/users/UserDetail"));
const TransactionList = lazy(() => import("./pages/transactions/TransactionList"));
const SessionList = lazy(() => import("./pages/sessions/SessionList"));
const SessionDetail = lazy(() => import("./pages/sessions/SessionDetail"));
const VoucherList = lazy(() => import("./pages/vouchers/VoucherList"));
const VoucherCreate = lazy(() => import("./pages/vouchers/VoucherCreate"));
const MessageCompose = lazy(() => import("./pages/messages/MessageCompose"));
const MessageBatches = lazy(() => import("./pages/messages/MessageBatches"));
const MessageDeliveries = lazy(() => import("./pages/messages/MessageDeliveries"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const VehicleList = lazy(() => import("./pages/vehicles/VehicleList"));
const VehicleCatalogCreate = lazy(() => import("./pages/vehicles/VehicleCatalogCreate"));
const CpoAlerts = lazy(() => import("./pages/alerts/CpoAlerts"));

// Configure axios once for the whole app.
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="rounded-xl bg-white p-6 shadow-sm text-sm text-slate-700">Loading…</div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Configure refresh-token interceptor once
  useEffect(() => {
    configureAxiosAuth({
      onLogout: () => {
        setIsAuthenticated(false);
        setUser(null);
      },
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setIsAuthenticated(true);
      setAccessToken(token);
    }
  }, []);

  useEffect(() => {
    // Persist user across reloads for role-based UI.
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogin = (accessToken, refreshToken, userData) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);
    setUser(userData);
    if (userData) localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    clearTokens();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("user");
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen">
          {/* Mobile overlay when sidebar drawer is open */}
          {sidebarOpen && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] sm:hidden"
            />
          )}

          <div className="flex min-h-screen">
            <Sidebar isOpen={sidebarOpen} user={user} onClose={() => setSidebarOpen(false)} />

            <div className="flex min-w-0 flex-1 flex-col">
              <Navbar
                user={user}
                onLogout={handleLogout}
                toggleSidebar={() => setSidebarOpen((v) => !v)}
              />

              <main className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="mx-auto w-full max-w-7xl">
              <Routes>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/stations"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <StationList />
                    </Suspense>
                  }
                />
                <Route
                  path="/stations/create"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <StationCreate />
                    </Suspense>
                  }
                />
                <Route
                  path="/stations/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <StationDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/chargers"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ChargerList />
                    </Suspense>
                  }
                />
                <Route
                  path="/chargers/create"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ChargerCreate />
                    </Suspense>
                  }
                />
                <Route
                  path="/chargers/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ChargerDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <UserList />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/users/:id"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <UserDetail />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <TransactionList />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <SessionList />
                    </Suspense>
                  }
                />
                <Route
                  path="/sessions/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <SessionDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/vouchers"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <VoucherList />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/vouchers/create"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <VoucherCreate />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <MessageCompose />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/messages/sent"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <MessageBatches />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/messages/deliveries"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <MessageDeliveries />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <Settings />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <CpoAlerts />
                    </Suspense>
                  }
                />
                <Route
                  path="/vehicles"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <VehicleList />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route
                  path="/vehicles/create"
                  element={
                    <RequireRole user={user} allowed={["ADMIN"]}>
                      <Suspense fallback={<RouteFallback />}>
                        <VehicleCatalogCreate />
                      </Suspense>
                    </RequireRole>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
                </div>
              </main>
            </div>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
