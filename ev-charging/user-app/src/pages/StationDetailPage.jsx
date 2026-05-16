import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

export default function StationDetailPage() {
  const { id } = useParams();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get(`/stations/${id}`);
        if (!cancelled) setStation(resp.data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load station");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>Station</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Details + chargers.
            </p>
          </div>
          <Link className="btn" to="/stations">
            Back
          </Link>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : station ? (
              <div className="grid">
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{station.name}</div>
                  <div className="muted">{station.address}</div>
                  <div className="muted">{station.city}</div>
                  <div className="muted">Open hours: {station.openHours || "-"}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Chargers</div>
                  {station.chargers?.length ? (
                    <div className="grid">
                      {station.chargers.map((c) => (
                        <Link key={c.id} to={`/chargers/${c.id}`} className="card" style={{ display: "block" }}>
                          <div className="card-body">
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div>
                                <div style={{ fontWeight: 900 }}>{c.name}</div>
                                <div className="muted">{c.connectorType} • {c.powerOutputKw} kW</div>
                                <div className="muted">₱ {c.pricePerKwh}/kWh</div>
                              </div>
                              <div className="pill">{c.status}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No chargers.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">Not found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
