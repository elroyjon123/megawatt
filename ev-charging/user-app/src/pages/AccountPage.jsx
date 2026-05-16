import { useEffect, useState } from "react";
import api from "../lib/api";

export default function AccountPage({ user, setUser }) {
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get("/auth/me");
        if (!cancelled) setUser(resp.data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!user) load();
    return () => {
      cancelled = true;
    };
  }, [setUser, user]);

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>My account</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Basic profile loaded from <code>/api/auth/me</code>.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : user ? (
              <div className="grid">
                <div className="field">
                  <div className="label">Name</div>
                  <div>{user.name}</div>
                </div>
                <div className="field">
                  <div className="label">Email</div>
                  <div>{user.email}</div>
                </div>
                <div className="field">
                  <div className="label">Role</div>
                  <div>{user.role}</div>
                </div>
                <div className="field">
                  <div className="label">Created</div>
                  <div>{new Date(user.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <p className="muted">Not logged in.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 style={{ margin: 0, fontSize: 16, letterSpacing: "-0.02em" }}>Next steps</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              This is a placeholder “app home” after auth. Next we can add Stations/Chargers screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
