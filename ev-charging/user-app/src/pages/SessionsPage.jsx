import { useEffect, useState } from "react";
import api from "../lib/api";

export default function SessionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get("/sessions");
        if (!cancelled) setItems(resp.data || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>My sessions</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Your charging session history.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : items.length ? (
              <div className="grid">
                {items.map((s) => (
                  <div key={s.id} className="card">
                    <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{s.status}</div>
                        <div className="muted">Start: {new Date(s.startTime).toLocaleString()}</div>
                        {s.endTime ? <div className="muted">End: {new Date(s.endTime).toLocaleString()}</div> : null}
                        <div className="muted">Charger: {s.charger?.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="pill">kWh: {s.energyKwh}</div>
                        <div className="pill">₱ {s.costPeso}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No sessions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
