import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import api from "./lib/api";
import { clearTokens, configureAxiosAuth, loadTokensFromStorage } from "./lib/auth";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AccountPage from "./pages/AccountPage";

import RequireAuth from "./components/RequireAuth";

import StationsPage from "./pages/StationsPage";
import StationDetailPage from "./pages/StationDetailPage";
import ChargerDetailPage from "./pages/ChargerDetailPage";
import WalletPage from "./pages/WalletPage";
import SessionsPage from "./pages/SessionsPage";
import TransactionsPage from "./pages/TransactionsPage";
import MessagesPage from "./pages/MessagesPage";
import InboxPage from "./pages/InboxPage";
import VouchersPage from "./pages/VouchersPage";
import VehiclesPage from "./pages/VehiclesPage";
import ProfilePage from "./pages/ProfilePage";
import SessionPage from "./pages/SessionPage";
import BottomNav from "./components/BottomNav";
import ChargePage from "./pages/ChargePage";

export default function App() {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const resp = await api.get("/auth/me");
      setUser(resp.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTokensFromStorage();
    configureAxiosAuth({
      onLogout: () => {
        setUser(null);
      },
    });

    refreshMe().finally(() => setBooted(true));
  }, [refreshMe]);

  const onLogout = () => {
    clearTokens();
    setUser(null);
  };

  if (!booted) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="hero">
            <div className="card">
              <div className="card-body">
                <p className="muted">Loading…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        <Navbar user={user} onLogout={onLogout} />

        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route
            path="/search"
            element={
              <RequireAuth>
                <SearchPage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage onAuthed={refreshMe} />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage user={user} setUser={setUser} />
              </RequireAuth>
            }
          />

          <Route
            path="/stations"
            element={
              <RequireAuth>
                <StationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/stations/:id"
            element={
              <RequireAuth>
                <StationDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chargers/:id"
            element={
              <RequireAuth>
                <ChargerDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <RequireAuth>
                <SessionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/charge"
            element={
              <RequireAuth>
                <ChargePage />
              </RequireAuth>
            }
          />
          <Route
            path="/wallet"
            element={
              <RequireAuth>
                <WalletPage />
              </RequireAuth>
            }
          />
          <Route
            path="/sessions"
            element={
              <RequireAuth>
                <SessionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <TransactionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/messages"
            element={
              <RequireAuth>
                <InboxPage />
              </RequireAuth>
            }
          />
          <Route
            path="/vouchers"
            element={
              <RequireAuth>
                <VouchersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/vehicles"
            element={
              <RequireAuth>
                <VehiclesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage user={user} setUser={setUser} />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <BottomNav />
      </div>
    </div>
  );
}
