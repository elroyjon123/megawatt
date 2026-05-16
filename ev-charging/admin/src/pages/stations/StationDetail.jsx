import { Suspense, lazy, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import CopyButton from "../../components/CopyButton";

import AddressAutocomplete from "../../components/AddressAutocomplete";

const MapPicker = lazy(() => import("../../components/MapPicker"));

export default function StationDetail() {
  const { id } = useParams();
  const [station, setStation] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const fetchStation = async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stations/${id}`);
    setStation(response.data);
    setForm({
      name: response.data.name || "",
      address: response.data.address || "",
      city: response.data.city || "",
      latitude: String(response.data.latitude ?? ""),
      longitude: String(response.data.longitude ?? ""),
      openHours: response.data.openHours || "",
      photos: (response.data.photos || []).join(", "),
      isActive: !!response.data.isActive,
    });
  };

  useEffect(() => {
    fetchStation();
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!station) return <div>Loading station details...</div>;

  const onSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const openHours =
        form.openHoursStart && form.openHoursEnd ? `${form.openHoursStart}-${form.openHoursEnd}` : form.openHours;
      const photosArray = form.photos ? form.photos.split(",").map((url) => url.trim()).filter(Boolean) : [];
      await axios.put(`${import.meta.env.VITE_API_URL}/admin/stations/${id}`, {
        name: form.name,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        openHours,
        photos: photosArray,
      });
      setMessage("Station updated");
      setEditing(false);
      await fetchStation();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update station");
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async () => {
    setMessage(null);
    setSaving(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/stations/${id}`);
      setMessage("Station deactivated");
      await fetchStation();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate station");
    } finally {
      setSaving(false);
    }
  };

  const onUploadPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("photos", f);
      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/admin/uploads/stations/photos`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const urls = resp.data?.urls || [];
      if (urls.length) {
        setForm((prev) => ({
          ...prev,
          photos: prev.photos ? `${prev.photos}, ${urls.join(", ")}` : urls.join(", "),
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-1 text-slate-900">{station.name}</h1>
            <p className="text-sm text-slate-600">{station.address}</p>
            <p className="text-sm text-slate-600">{station.city}</p>
            <p className="text-sm text-slate-600">{station.openHours}</p>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={station.id} label="Copy Station ID" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {station.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
            <button
              onClick={() => {
                setEditing((v) => !v);
                setMessage(null);
                setError(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={onDeactivate}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Deactivate
            </button>
          </div>
        </div>

        {message && <div className="mt-4 text-sm text-slate-700">{message}</div>}
        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        {/* ✅ Image carousel */}
        {station.photos?.length > 0 && (
          <div className="mt-4">
            <div className="relative">
              <img
                src={station.photos[photoIndex]}
                alt="Station"
                className="w-full h-64 object-cover rounded-xl border border-slate-200"
              />

              {station.photos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setPhotoIndex((i) => (i === 0 ? station.photos.length - 1 : i - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded shadow"
                  >
                    ‹
                  </button>

                  <button
                    onClick={() =>
                      setPhotoIndex((i) => (i === station.photos.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded shadow"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto">
              {station.photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt=""
                  onClick={() => setPhotoIndex(i)}
                  className={`h-14 w-20 object-cover rounded cursor-pointer border ${
                    i === photoIndex ? "border-slate-900" : "border-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {editing && form && (
          <form onSubmit={onSave} className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="Station name"
            />
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="City"
            />
            <div className="md:col-span-2">
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                onSelect={({ lat, lng, city }) =>
                  setForm((p) => ({
                    ...p,
                    latitude: lat.toFixed(6),
                    longitude: lng.toFixed(6),
                    city: city || p.city,
                  }))
                }
                placeholder="Address (PH autocomplete)"
              />
            </div>
            <input
              value={form.latitude}
              onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="Latitude"
            />
            <input
              value={form.longitude}
              onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="Longitude"
            />

            <div className="md:col-span-2">
              <Suspense
                fallback={
                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    Loading map…
                  </div>
                }
              >
                <MapPicker
                  lat={form.latitude}
                  lng={form.longitude}
                  onPick={(lat, lng) =>
                    setForm((p) => ({
                      ...p,
                      latitude: lat.toFixed(6),
                      longitude: lng.toFixed(6),
                    }))
                  }
                />
              </Suspense>
            </div>
            <input
              value={form.openHours}
              onChange={(e) => setForm((p) => ({ ...p, openHours: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder='Optional text override (e.g. "24/7" or "08:00-22:00")'
            />
            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Start</div>
                <input
                  type="time"
                  value={form.openHoursStart || ""}
                  onChange={(e) => setForm((p) => ({ ...p, openHoursStart: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">End</div>
                <input
                  type="time"
                  value={form.openHoursEnd || ""}
                  onChange={(e) => setForm((p) => ({ ...p, openHoursEnd: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>
            </div>
            <div className="md:col-span-2 text-xs text-slate-500">
              If Start/End are set, we’ll save as <code>HH:MM-HH:MM</code>. Otherwise we’ll use the text field.
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="text-sm font-semibold text-slate-700">Station photos</div>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => onUploadPhotos(Array.from(e.target.files || []))}
                className="w-full rounded-lg border border-slate-200 p-3"
                disabled={uploading}
              />
              <input
                value={form.photos}
                onChange={(e) => setForm((p) => ({ ...p, photos: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 p-3"
                placeholder="Photos (comma separated URLs)"
              />
              <div className="text-xs text-slate-500">Upload from mobile/PC above. Uploaded photo URLs will auto-fill here.</div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Chargers at this station</h2>
        <div className="mt-4 space-y-3">
          {station.chargers?.length ? (
            station.chargers.map((charger) => (
              <Link
                key={charger.id}
                to={`/chargers/${charger.id}`}
                className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{charger.name}</h3>
                    <p className="text-sm text-slate-600">{charger.connectorType} • {charger.powerOutputKw} kW</p>
                    <p className="text-sm text-slate-600">PHP {charger.pricePerKwh}/kWh</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{charger.status}</span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-600">No chargers yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
