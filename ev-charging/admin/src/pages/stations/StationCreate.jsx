import { Suspense, lazy, useState } from "react";
import axios from "axios";

import AddressAutocomplete from "../../components/AddressAutocomplete";

const MapPicker = lazy(() => import("../../components/MapPicker"));

export default function StationCreate() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
    openHours: "",
    openHoursStart: "",
    openHoursEnd: "",
    photos: "",
  });
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    try {
      const openHours =
        formData.openHoursStart && formData.openHoursEnd
          ? `${formData.openHoursStart}-${formData.openHoursEnd}`
          : formData.openHours;
      const photosArray = formData.photos ? formData.photos.split(",").map((url) => url.trim()) : [];
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/stations`, {
        ...formData,
        openHours,
        photos: photosArray,
      });
      setMessage("Station created successfully");
      setFormData({
        name: "",
        address: "",
        city: "",
        latitude: "",
        longitude: "",
        openHours: "",
        openHoursStart: "",
        openHoursEnd: "",
        photos: "",
      });
    } catch (error) {
      setMessage(error.response?.data?.error || "Creation failed");
    }
  };

  const onUploadPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("photos", f);
      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/admin/uploads/stations/photos`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const urls = resp.data?.urls || [];
      if (urls.length) {
        setFormData((prev) => ({
          ...prev,
          photos: prev.photos ? `${prev.photos}, ${urls.join(", ")}` : urls.join(", "),
        }));
      }
    } catch (error) {
      setMessage(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Create Station</h1>
      {message && <div className="mb-4 text-slate-700">{message}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input name="name" value={formData.name} onChange={handleChange} placeholder="Station name" className="w-full rounded-lg border border-slate-200 p-3" />

        <AddressAutocomplete
          value={formData.address}
          onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
          onSelect={({ lat, lng, city }) =>
            setFormData((p) => ({
              ...p,
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6),
              city: city || p.city,
            }))
          }
          placeholder="Address (PH autocomplete)"
        />

        <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="w-full rounded-lg border border-slate-200 p-3" />
        <div className="grid gap-4 md:grid-cols-2">
          <input name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" className="w-full rounded-lg border border-slate-200 p-3" />
          <input name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" className="w-full rounded-lg border border-slate-200 p-3" />
        </div>

        <Suspense
          fallback={
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              Loading map…
            </div>
          }
        >
          <MapPicker
            lat={formData.latitude}
            lng={formData.longitude}
            onPick={(lat, lng) =>
              setFormData((prev) => ({
                ...prev,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
              }))
            }
          />
        </Suspense>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">Open hours</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Start</div>
              <input
                type="time"
                name="openHoursStart"
                value={formData.openHoursStart}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-3"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">End</div>
              <input
                type="time"
                name="openHoursEnd"
                value={formData.openHoursEnd}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-3"
              />
            </div>
          </div>
          <input
            name="openHours"
            value={formData.openHours}
            onChange={handleChange}
            placeholder='Optional text override (e.g. "24/7" or "08:00-22:00")'
            className="w-full rounded-lg border border-slate-200 p-3"
          />
          <div className="text-xs text-slate-500">If Start/End are set, we’ll save as <code>HH:MM-HH:MM</code>. Otherwise we’ll use the text field.</div>
        </div>

        <div className="space-y-2">
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
            name="photos"
            value={formData.photos}
            onChange={handleChange}
            placeholder="Photo URLs (comma separated)"
            className="w-full rounded-lg border border-slate-200 p-3"
          />
          <div className="text-xs text-slate-500">
            Upload from mobile/PC above. Uploaded photo URLs will auto-fill here.
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-slate-900 text-white px-5 py-3 hover:bg-slate-800">Create Station</button>
      </form>
    </div>
  );
}
