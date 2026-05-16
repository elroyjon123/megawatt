import { useEffect, useState } from "react";
import api from "../lib/api";

export default function MessagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    const resp = await api.get("/messages");
    setItems(resp.data || []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = async (id) => {
    await api.put(`/messages/${id}/read`);
    await load();
  };

  const remove = async (id) => {
    await api.delete(`/messages/${id}`);
    await load();
  };

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>Inbox</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Notifications and transaction messages.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : items.length ? (
              <div className="grid">
                {items.map((m) => (
                  <div key={m.id} className="card">
                    <div className="card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{m.title}</div>
                          <div className="muted">{m.type} • {new Date(m.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="pill">{m.isRead ? "Read" : "Unread"}</div>
                      </div>
                      <p className="muted" style={{ marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap" }}>{m.body}</p>
                      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                        {!m.isRead ? (
                          <button className="btn btn-primary" onClick={() => markRead(m.id)}>
                            Mark read
                          </button>
                        ) : null}
                        <button className="btn" onClick={() => remove(m.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No messages.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
