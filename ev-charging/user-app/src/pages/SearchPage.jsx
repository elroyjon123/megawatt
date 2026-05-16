import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Card, { CardBody } from "../components/ui/Card";

function getDistance(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  const d = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * d;
}

export default function SearchPage() {
  const [position, setPosition] = useState(null);
  const [stations, setStations] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = [pos.coords.latitude, pos.coords.longitude];
            setPosition(coords);

            const res = await api.get("/stations");
            const data = res.data || [];

            const sorted = data
              .map((s) => ({
                ...s,
                distance: getDistance(coords, [
                  Number(s.latitude),
                  Number(s.longitude),
                ]),
              }))
              .sort((a, b) => a.distance - b.distance);

            setStations(sorted);
          },
          async () => {
            const coords = [14.5547, 121.0244];
            setPosition(coords);

            const res = await api.get("/stations");
            const data = res.data || [];

            const sorted = data
              .map((s) => ({
                ...s,
                distance: getDistance(coords, [
                  Number(s.latitude),
                  Number(s.longitude),
                ]),
              }))
              .sort((a, b) => a.distance - b.distance);

            setStations(sorted);
          }
        );
      } catch (e) {
        console.error("Search load error:", e);
      }
    }

    load();
  }, []);

  const filtered = stations.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* HEADER */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          Find a charger
        </h2>
        <p className="text-sm text-gray-500">
          Search nearby EV charging stations
        </p>
      </div>

      {/* SEARCH */}
      <Input
        placeholder="Search stations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <Card>
          <CardBody className="text-center text-gray-500 text-sm">
            No stations found
          </CardBody>
        </Card>
      )}

      {/* LIST */}
      <div className="space-y-3">
        {filtered.map((s) => {
          const available =
            s.chargers?.filter((c) => c.status === "AVAILABLE").length || 0;
          const total = s.chargers?.length || 0;

          return (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => navigate(`/stations/${s.id}`)}
            >
              <CardBody className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {s.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {s.address || "Unknown location"}
                    </div>
                  </div>

                  <div className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                    {s.distance.toFixed(1)} km
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    ⚡ {available}/{total} available
                  </span>
                  <span className="text-green-600 font-medium">
                    ₱{s.chargers?.[0]?.pricePerKwh || "-"} / kWh
                  </span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}