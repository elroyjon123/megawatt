import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const CONNECTORS = ["CCS", "CHAdeMO", "TYPE2", "GB/T", "NACS"];

export default function VehicleCatalogCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    connectorType: "TYPE2",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/vehicle-catalog`, {
        ...form,
        year: Number(form.year),
      });
      navigate("/vehicles", { replace: true });
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || "Failed to create vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Create Vehicle (Catalog)</h1>
          <div className="mt-1 text-sm text-slate-600">
            This list is used as dropdown options for users.
          </div>
        </div>
        <Link to="/vehicles" className="text-sm font-semibold text-slate-700 underline">
          Back to vehicles
        </Link>
      </div>

      {message && <div className="mb-4 text-sm text-red-700">{message}</div>}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="make"
            value={form.make}
            onChange={onChange}
            placeholder="Make (e.g. Tesla)"
            className="w-full rounded-lg border border-slate-200 p-3"
            required
          />
          <input
            name="model"
            value={form.model}
            onChange={onChange}
            placeholder="Model (e.g. Model 3)"
            className="w-full rounded-lg border border-slate-200 p-3"
            required
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="year"
            value={form.year}
            onChange={onChange}
            placeholder="Year (e.g. 2024)"
            type="number"
            min={1980}
            max={2100}
            className="w-full rounded-lg border border-slate-200 p-3"
            required
          />
          <select
            name="connectorType"
            value={form.connectorType}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-200 p-3"
            required
          >
            {CONNECTORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
          Active (visible to users)
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 text-white px-5 py-3 hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create vehicle"}
        </button>
      </form>
    </div>
  );
}
