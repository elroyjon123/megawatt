import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useMemo, useRef } from "react";

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

// ✅ FIX: keep libraries static (prevents reload warning)
const LIBRARIES = ["places"];

export default function MapPicker({ lat, lng, onPick, height = 320 }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const mapRef = useRef(null);
  const geolocatedOnceRef = useRef(false);

  const toFiniteNumberOrNull = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };

  const center = useMemo(() => {
    const latNum = toFiniteNumberOrNull(lat);
    const lngNum = toFiniteNumberOrNull(lng);
    if (latNum !== null && lngNum !== null) return { lat: latNum, lng: lngNum };
    return DEFAULT_CENTER;
  }, [lat, lng]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES,
  });

  const markerPos = (() => {
    const latNum = toFiniteNumberOrNull(lat);
    const lngNum = toFiniteNumberOrNull(lng);
    return latNum !== null && lngNum !== null ? { lat: latNum, lng: lngNum } : null;
  })();

  // Default map to user's current location (if no lat/lng yet)
  // IMPORTANT: this hook must be declared before any conditional returns.
  useEffect(() => {
    if (geolocatedOnceRef.current) return;
    if (markerPos) return;
    if (!navigator?.geolocation) return;

    geolocatedOnceRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos?.coords?.latitude;
        const nextLng = pos?.coords?.longitude;
        if (typeof nextLat === "number" && typeof nextLng === "number") {
          onPick(nextLat, nextLng);
        }
      },
      () => {
        // ignore (permission denied / unavailable)
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [markerPos, onPick]);

  // Pan/zoom when lat/lng changes (e.g. after address autocomplete)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const latNum = toFiniteNumberOrNull(lat);
    const lngNum = toFiniteNumberOrNull(lng);
    if (latNum === null || lngNum === null) return;

    map.panTo({ lat: latNum, lng: lngNum });
    if (map.getZoom() < 14) map.setZoom(15);
  }, [lat, lng]);

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Map picker disabled: set <code className="font-mono">VITE_GOOGLE_MAPS_KEY</code> in <code className="font-mono">admin/.env</code>.
      </div>
    );
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Loading map…</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height }}
      center={center}
      zoom={markerPos ? 15 : 11}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onUnmount={() => {
        mapRef.current = null;
      }}
      onClick={(e) => {
        const nextLat = e.latLng?.lat();
        const nextLng = e.latLng?.lng();
        if (typeof nextLat === "number" && typeof nextLng === "number") onPick(nextLat, nextLng);
      }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {markerPos && <MarkerF position={markerPos} />}
    </GoogleMap>
  );
}
