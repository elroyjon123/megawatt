import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import CopyButton from "../../components/CopyButton";

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({ name: "", phone: "", role: "USER" });
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [topUpNote, setTopUpNote] = useState("");
  const [refundAmount, setRefundAmount] = useState(100);
  const [refundNote, setRefundNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ make: "", model: "", year: "2024", plateNumber: "", connectorType: "" });
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
        setUser(response.data);
        setProfile({
          name: response.data.name || "",
          phone: response.data.phone || "",
          role: response.data.role || "USER",
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load user");
      }
    };
    fetchUser();
  }, [id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, profile);
      setMessage("User updated");
      setEditMode(false);
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    setMessage(null);
    setSaving(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setMessage("User deactivated");
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Deactivate failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/wallets/${id}/topup`, {
        amountPeso: Number(topUpAmount),
        note: topUpNote,
      });
      setTopUpNote("");
      setMessage("Top-up successful");
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Top-up failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/wallets/${id}/refund`, {
        amountPeso: Number(refundAmount),
        note: refundNote,
      });
      setRefundNote("");
      setMessage("Refund successful");
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Refund failed");
    } finally {
      setSaving(false);
    }
  };

  const submitVehicle = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      if (editingVehicleId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/vehicles/${editingVehicleId}`, vehicleForm);
        setMessage("Vehicle updated");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/admin/vehicles/user/${id}`, vehicleForm);
        setMessage("Vehicle added");
      }
      setVehicleForm({ make: "", model: "", year: "2024", plateNumber: "", connectorType: "" });
      setEditingVehicleId(null);
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Vehicle save failed");
    } finally {
      setSaving(false);
    }
  };

  const editVehicle = (v) => {
    setEditingVehicleId(v.id);
    setVehicleForm({
      make: v.make || "",
      model: v.model || "",
      year: String(v.year || ""),
      plateNumber: v.plateNumber || "",
      connectorType: v.connectorType || "",
    });
  };

  const deleteVehicle = async (vehicleId) => {
    setMessage(null);
    setSaving(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/vehicles/${vehicleId}`);
      setMessage("Vehicle deleted");
      const refreshed = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users/${id}`);
      setUser(refreshed.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Vehicle delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div>{error}</div>;
  if (!user) return <div>Loading user details...</div>;

  const walletBalance = user.wallet?.balancePeso ?? 0;
  const topUps = user.wallet?.topUps ?? [];
  const vehicles = user.vehicles ?? [];
  const transactions = user.transactions ?? [];
  const sessions = user.sessions ?? [];

  const totalSpent = transactions
    .filter((t) => t.type === "CHARGE")
    .reduce((sum, t) => sum + Number(t.amountPeso || 0), 0);

  const totalSessions = sessions.length;

  const totalKwh = sessions.reduce((sum, s) => sum + Number(s.energyKwh || 0), 0);

  const [filterType, setFilterType] = useState("ALL");

  const timeline = [
    ...transactions.map((t) => ({
      type: "TRANSACTION",
      label: t.type,
      amount: t.amountPeso,
      date: t.createdAt,
      description: t.description,
    })),
    ...sessions.map((s) => ({
      type: "SESSION",
      label: s.status,
      amount: s.costPeso,
      date: s.startTime,
      description: `${s.energyKwh} kWh`,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((item) => (filterType === "ALL" ? true : item.type === filterType));

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-600">{user.email}</p>
          {user.phone && <p className="text-sm text-slate-600">{user.phone}</p>}
          <div className="mt-2">
            <Link
              to={`/vehicles?userId=${user.id}`}
              className="text-xs font-semibold text-slate-900 underline"
            >
              View this user's vehicles
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={user.id} label="Copy User ID" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{user.role}</span>
          <button
            onClick={() => {
              setEditMode((v) => !v);
              setMessage(null);
              setError(null);
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleDeactivateUser}
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Deactivate
          </button>
        </div>
      </div>

      {editMode && (
        <form onSubmit={handleSaveProfile} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 p-3"
            placeholder="Name"
          />
          <input
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 p-3"
            placeholder="Phone"
          />
          <select
            value={profile.role}
            onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 p-3"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Wallet</h2>
          <p className="mt-2 text-sm text-slate-600">Balance</p>
          <p className="text-2xl font-semibold text-slate-900">₱ {walletBalance}</p>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Admin top-up</h3>
            {message && <div className="mt-2 text-sm text-slate-700">{message}</div>}
            <form onSubmit={handleTopUp} className="mt-3 space-y-2">
              <input
                type="number"
                min="1"
                step="1"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2"
                placeholder="Amount (PHP)"
              />
              <input
                type="text"
                value={topUpNote}
                onChange={(e) => setTopUpNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2"
                placeholder="Note (optional)"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Processing..." : "Top up"}
              </button>
            </form>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Admin refund</h3>
            <form onSubmit={handleRefund} className="mt-3 space-y-2">
              <input
                type="number"
                min="1"
                step="1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2"
                placeholder="Amount (PHP)"
              />
              <input
                type="text"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2"
                placeholder="Note (optional)"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Processing..." : "Refund"}
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Top-up history</h2>
          {topUps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No top-ups yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {topUps
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((t) => (
                  <div key={t.id} className="flex items-start justify-between rounded-lg bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">₱ {t.amountPeso}</p>
                      <p className="text-xs text-slate-600">{new Date(t.createdAt).toLocaleString()}</p>
                      {t.note && <p className="text-xs text-slate-600">Note: {t.note}</p>}
                    </div>
                    <p className="text-xs text-slate-500">by {t.createdByUser?.email || t.createdBy}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">User Metrics</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div>Total spent: ₱ {totalSpent}</div>
            <div>Total sessions: {totalSessions}</div>
            <div>Total energy: {totalKwh.toFixed(2)} kWh</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No transactions yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {transactions.slice(0, 10).map((txn) => (
                <div key={txn.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{txn.type}</p>
                      <p className="text-xs text-slate-600">{txn.description}</p>
                      <p className="text-xs text-slate-600">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">₱ {txn.amountPeso}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Sessions</h2>

          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No sessions yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{s.status}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(s.startTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div>{s.energyKwh} kWh</div>
                      <div>₱ {s.costPeso}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Activity Timeline</h2>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 p-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="SESSION">Sessions</option>
              <option value="TRANSACTION">Transactions</option>
            </select>
          </div>

          {timeline.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No activity yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {timeline.slice(0, 20).map((item, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm flex justify-between">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-600">{item.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right font-semibold">
                    ₱ {item.amount || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Vehicles</h2>
          <form onSubmit={submitVehicle} className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={vehicleForm.make}
              onChange={(e) => setVehicleForm((p) => ({ ...p, make: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2"
              placeholder="Make"
            />
            <input
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2"
              placeholder="Model"
            />
            <input
              value={vehicleForm.year}
              onChange={(e) => setVehicleForm((p) => ({ ...p, year: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2"
              placeholder="Year"
            />
            <input
              value={vehicleForm.connectorType}
              onChange={(e) => setVehicleForm((p) => ({ ...p, connectorType: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2"
              placeholder="Connector type"
            />
            <input
              value={vehicleForm.plateNumber}
              onChange={(e) => setVehicleForm((p) => ({ ...p, plateNumber: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2 md:col-span-2"
              placeholder="Plate number (optional)"
            />
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              {editingVehicleId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicleId(null);
                    setVehicleForm({ make: "", model: "", year: "2024", plateNumber: "", connectorType: "" });
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Working..." : editingVehicleId ? "Update vehicle" : "Add vehicle"}
              </button>
            </div>
          </form>

          {vehicles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No vehicles yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {v.make} {v.model} ({v.year})
                      </p>
                      <p className="text-xs text-slate-600">Connector: {v.connectorType}</p>
                      {v.plateNumber && <p className="text-xs text-slate-600">Plate: {v.plateNumber}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editVehicle(v)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteVehicle(v.id)}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
