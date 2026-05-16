import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function StationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get("/stations");
        if (!cancelled) setItems(resp.data || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load stations");
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
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>Stations</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Browse active stations and their chargers.
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
                  <Link key={s.id} to={`/stations/${s.id}`} className="card" style={{ display: "block" }}>
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{s.name}</div>
                          <div className="muted">{s.address}</div>
                          <div className="muted">{s.city}</div>
                        </div>
                        <div className="pill">Chargers: {s.chargers?.length ?? 0}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">No stations yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
