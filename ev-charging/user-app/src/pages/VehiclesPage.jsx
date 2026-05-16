import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

export default function VehiclesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ make: "", model: "", year: "", plateNumber: "", connectorType: "Type 2" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const canSubmit = useMemo(() => {
    const y = Number(form.year);
    return form.make && form.model && Number.isFinite(y) && y > 1970 && form.connectorType;
  }, [form]);

  const load = async () => {
    const resp = await api.get("/vehicles");
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
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load vehicles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.put(`/vehicles/${editingId}`, form);
      } else {
        await api.post("/vehicles", form);
      }
      setForm({ make: "", model: "", year: "", plateNumber: "", connectorType: "Type 2" });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setForm({
      make: v.make || "",
      model: v.model || "",
      year: v.year != null ? String(v.year) : "",
      plateNumber: v.plateNumber || "",
      connectorType: v.connectorType || "Type 2",
    });
  };

  const remove = async (id) => {
    if (!confirm("Delete this vehicle?")) return;
    setError("");
    try {
      await api.delete(`/vehicles/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Delete failed");
    }
  };

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>My vehicles</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Add/edit your EVs.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="card">
          <div className="card-body">
            <form className="grid" onSubmit={submit}>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <div className="label">Make</div>
                  <input className="input" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} />
                </div>
                <div className="field">
                  <div className="label">Model</div>
                  <input className="input" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <div className="label">Year</div>
                  <input className="input" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} placeholder="2024" />
                </div>
                <div className="field">
                  <div className="label">Connector</div>
                  <select className="input" value={form.connectorType} onChange={(e) => setForm((p) => ({ ...p, connectorType: e.target.value }))}>
                    <option>Type 1</option>
                    <option>Type 2</option>
                    <option>CCS</option>
                    <option>CHAdeMO</option>
                    <option>GB/T</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <div className="label">Plate number (optional)</div>
                <input className="input" value={form.plateNumber} onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary" disabled={saving || !canSubmit}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add vehicle"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ make: "", model: "", year: "", plateNumber: "", connectorType: "Type 2" });
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : items.length ? (
              <div className="grid">
                {items.map((v) => (
                  <div key={v.id} className="card">
                    <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{v.make} {v.model} ({v.year})</div>
                        <div className="muted">Connector: {v.connectorType}</div>
                        {v.plateNumber ? <div className="muted">Plate: {v.plateNumber}</div> : null}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn btn-primary" onClick={() => startEdit(v)}>Edit</button>
                        <button className="btn" onClick={() => remove(v.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No vehicles yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
