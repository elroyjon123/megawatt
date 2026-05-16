import { useEffect, useState } from "react";
import api from "../lib/api";

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get("/transactions");
        if (!cancelled) setItems(resp.data || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load transactions");
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
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>My transactions</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Wallet top-ups, charges, voucher redemptions.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : items.length ? (
              <div className="grid">
                {items.map((t) => (
                  <div key={t.id} className="card">
                    <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{t.type}</div>
                        <div className="muted">{t.description}</div>
                        <div className="muted">{new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="pill">₱ {t.amountPeso}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No transactions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
