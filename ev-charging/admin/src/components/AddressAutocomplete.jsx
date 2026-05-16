import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useRef } from "react";

function getCityFromPlace(place) {
  const comps = place?.address_components || [];
  const find = (type) => comps.find((c) => (c.types || []).includes(type))?.long_name;

  // In PH you may get locality or admin_area_3/2
  return (
    find("locality") ||
    find("administrative_area_level_3") ||
    find("administrative_area_level_2") ||
    find("administrative_area_level_1") ||
    ""
  );
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Address" }) {
  const acRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
    libraries: ["places"],
  });

  const options = useMemo(
    () => ({
      componentRestrictions: { country: ["ph"] },
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["geocode"],
    }),
    []
  );

  // If API key is missing or script isn't loaded yet, gracefully degrade to a normal input.
  if (!apiKey || !isLoaded) {
    return (
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 p-3"
        autoComplete="off"
      />
    );
  }

  return (
    <Autocomplete
      onLoad={(ac) => {
        acRef.current = ac;
      }}
      options={options}
      onPlaceChanged={() => {
        const ac = acRef.current;
        const place = ac?.getPlace?.();
        const loc = place?.geometry?.location;
        const lat = typeof loc?.lat === "function" ? loc.lat() : null;
        const lng = typeof loc?.lng === "function" ? loc.lng() : null;
        const address = place?.formatted_address || "";
        const city = getCityFromPlace(place);
        if (address) onChange?.(address);
        if (typeof lat === "number" && typeof lng === "number") {
          onSelect?.({ address, city, lat, lng, place });
        }
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 p-3"
        autoComplete="off"
      />
    </Autocomplete>
  );
}
