import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { MapPin, SlidersHorizontal, Zap, Car } from "lucide-react";
import Button from "../components/ui/Button";

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 14);
  }, [position]);
  return null;
}

export default function HomePage() {
  const [position, setPosition] = useState([14.5547, 121.0244]); // default BGC
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        fetchStations(coords);
      },
      () => fetchStations(position)
    );

    const s = io("http://localhost:3001");
    setSocket(s);

    return () => s.disconnect();
  }, []);

  async function fetchStations(coords) {
    try {
      const res = await api.get("/stations");
      setStations(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (!socket) return;

    socket.on("charger_status_update", (updatedCharger) => {
      setStations((prev) =>
        prev.map((station) => ({
          ...station,
          chargers: station.chargers?.map((c) =>
            c.id === updatedCharger.id ? { ...c, status: updatedCharger.status } : c
          ),
        }))
      );

      setSelectedStation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chargers: prev.chargers?.map((c) =>
            c.id === updatedCharger.id ? { ...c, status: updatedCharger.status } : c
          ),
        };
      });
    });

    return () => socket.off("charger_status_update");
  }, [socket]);

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      {/* MAP */}
      <MapContainer center={position} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter position={position} />

        {stations.map((s) => {
          const isAvailable = s.chargers?.some(c => c.status === "AVAILABLE");

          const total = s.chargers?.length || 0;
          const available = s.chargers?.filter(c => c.status === "AVAILABLE").length || 0;

          let color = "#ef4444";
          if (available === total) color = "#22c55e";
          else if (available > 0) color = "#f59e0b";

          const icon = L.divIcon({
            className: "custom-marker",
            iconSize: [36, 46],
            iconAnchor: [18, 46],
            html: `
              <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="
                  width:36px;
                  height:36px;
                  border-radius:50%;
                  background:${color};
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  border:3px solid white;
                  box-shadow:0 8px 20px rgba(0,0,0,0.25);
                ">
                  <img src="/megawatt-logo.png" onerror="this.style.display='none'" style="width:18px;height:18px;pointer-events:none;" />
                </div>
                <div style="
                  width:10px;
                  height:10px;
                  background:${color};
                  transform:rotate(45deg);
                  margin-top:-6px;
                "></div>
              </div>
            `,
            className: ""
          });

          const types = [...new Set(
            (s.chargers || [])
              .map(c => c.type || c.connectorType || "Unknown")
          )].join(", ");

          return (
            <Marker
              key={s.id}
              position={[Number(s.latitude), Number(s.longitude)]}
              icon={icon}
              eventHandlers={{
                click: async () => {
                  try {
                    const res = await api.get(`/stations/${s.id}`);
                    setSelectedStation(res.data);
                    setSelectedCharger(null);
                  } catch (e) {
                    console.error("Failed to load station details", e);
                    setSelectedStation(s);
                  }
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <b>{s.name}</b>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Chargers: {available}/{total}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Type: {types && types !== "Unknown" ? types : "Standard Charger"}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* USER RADIUS + CAR */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.15)",
            position: "absolute",
            top: "-90px",
            left: "-90px",
          }}
        />
        <div
          style={{
            background: "#2563eb",
            borderRadius: "50%",
            padding: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          }}
        >
          <Car size={20} color="#fff" />
        </div>
      </div>

      {/* BOTTOM SHEET */}
      {selectedStation && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg transition-all">
          {/* drag handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center gap-3 mb-3">
            <img src="/megawatt-logo.png" className="w-10 h-10 rounded-lg" />
            <div>
              <div className="font-semibold text-gray-900">{selectedStation.name}</div>
              <div className="text-sm text-gray-600">{selectedStation.address}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-500">POWER OUTPUT</div>
            <div className="font-semibold text-gray-900">
              {selectedStation.chargers?.[0]?.powerKw || 7} kW
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs text-gray-500 mb-2">CHARGE POINTS</div>

            <div className="grid gap-3">
              {(selectedStation.chargers || []).map((c) => {
                const isAvailable = c.status === "AVAILABLE";
                const isSelected = selectedCharger?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => isAvailable && setSelectedCharger(c)}
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500 shadow-md"
                        : isAvailable
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    } ${isAvailable ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        isAvailable ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {isAvailable ? "AVAILABLE" : "IN USE"}
                    </div>

                    <div className="font-semibold text-gray-900">
                      {c.name || `Charger ${c.id}`}
                    </div>

                    <div className="text-sm text-gray-600 mt-1">
                      {c.type || "AC Charger"}
                    </div>

                    <div className="flex justify-between text-sm text-gray-700 mt-2">
                      <span>{c.powerKw || 7} kW</span>
                      <span>₱{c.pricePerKwh || 28.5}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">
              Directions
            </Button>

            <Button
              className="flex-1 font-semibold"
              style={{ opacity: selectedCharger ? 1 : 0.5 }}
              disabled={!selectedCharger}
              onClick={async () => {
                try {
                  const res = await api.post("/sessions/start", {
                    chargerId: selectedCharger.id,
                  });

                  const session = res.data;
                  navigate(`/session/${session.id}`);
                } catch (e) {
                  alert("Failed to start session");
                }
              }}
            >
              Charge Now
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* TOP CARD */}
      <div className="absolute top-3 left-3 right-3 bg-white rounded-lg p-4 shadow-sm">
        <div className="text-xs text-gray-500 mb-1">CURRENT VEHICLE</div>
        <div className="font-semibold text-gray-900">My EV</div>
      </div>

      {/* FILTER BAR */}
      <div className="absolute top-20 left-3 right-3 flex gap-2">
        <Button variant="secondary" className="flex items-center gap-2">
          <Zap size={16} /> All
        </Button>
        <Button variant="secondary">Available</Button>
        <Button variant="secondary" className="flex items-center gap-2">
          <SlidersHorizontal size={16} /> Filters
        </Button>
      </div>

      {/* LOCATE BUTTON */}
      <button
        onClick={() =>
          navigator.geolocation.getCurrentPosition((pos) =>
            setPosition([pos.coords.latitude, pos.coords.longitude])
          )
        }
        className="absolute bottom-24 right-5 w-13 h-13 rounded-full bg-white shadow-lg flex items-center justify-center"
      >
        <MapPin className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}