import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";

export default function ChargerCreate() {
  const location = useLocation();
  const scannedOcppId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("ocppId");
    return v ? String(v).trim() : "";
  }, [location.search]);

  const [stations, setStations] = useState([]);
  const [formData, setFormData] = useState({
    stationId: "",
    ocppId: "",
    name: "",
    connectorType: "",
    powerOutputKw: "",
    pricePerKwh: "",
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchStations = async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stations`);
      setStations(response.data);
    };
    fetchStations();
  }, []);

  useEffect(() => {
    if (!scannedOcppId) return;
    setFormData((prev) => ({ ...prev, ocppId: prev.ocppId || scannedOcppId }));
  }, [scannedOcppId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/chargers`, {
        ...formData,
      });
      setMessage("Charger created successfully");
      setFormData({ stationId: "", ocppId: "", name: "", connectorType: "", powerOutputKw: "", pricePerKwh: "" });
    } catch (error) {
      setMessage(error.response?.data?.error || "Creation failed");
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Create Charger</h1>
          {scannedOcppId && (
            <div className="mt-1 text-sm text-slate-600">
              Scanned OCPP ID: <span className="font-mono text-slate-900">{scannedOcppId}</span>
            </div>
          )}
        </div>
        <Link to="/chargers" className="text-sm font-semibold text-slate-700 underline">
          Back to chargers
        </Link>
      </div>
      {message && <div className="mb-4 text-slate-700">{message}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <select name="stationId" value={formData.stationId} onChange={handleChange} className="w-full rounded-lg border border-slate-200 p-3">
          <option value="">Select station</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>{station.name}</option>
          ))}
        </select>
        <input name="ocppId" value={formData.ocppId} onChange={handleChange} placeholder="OCPP Charger ID" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="name" value={formData.name} onChange={handleChange} placeholder="Display name" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="connectorType" value={formData.connectorType} onChange={handleChange} placeholder="Connector Type" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="powerOutputKw" value={formData.powerOutputKw} onChange={handleChange} placeholder="Power output (kW)" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="pricePerKwh" value={formData.pricePerKwh} onChange={handleChange} placeholder="Price per kWh" className="w-full rounded-lg border border-slate-200 p-3" />
        <button type="submit" className="rounded-lg bg-slate-900 text-white px-5 py-3 hover:bg-slate-800">Create Charger</button>
      </form>
    </div>
  );
}
