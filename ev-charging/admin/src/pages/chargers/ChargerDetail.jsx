import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getSocketAsync } from "../../lib/socket";
import CopyButton from "../../components/CopyButton";

export default function ChargerDetail() {
  const { id } = useParams();
  const [charger, setCharger] = useState(null);
  const [status, setStatus] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState({ energy: 0, powerKw: 0, cost: 0 });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [connectorId, setConnectorId] = useState(1);
  const [idTag, setIdTag] = useState("ADMIN");
  const [transactionId, setTransactionId] = useState("");
  const [connectedInfo, setConnectedInfo] = useState(null);
  const [availabilityType, setAvailabilityType] = useState("Operative");
  const [ocppConnectorId, setOcppConnectorId] = useState(0);
  const [configKeys, setConfigKeys] = useState("HeartbeatInterval");
  const [configResult, setConfigResult] = useState(null);

  const load = async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/chargers/${id}`);
    setCharger(response.data);
    setStatus({ status: response.data.status, lastHeartbeat: response.data.lastHeartbeat });
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load charger");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let socket;
    let mounted = true;

    const onStatus = (payload) => {
      if (payload?.chargerId !== id) return;
      setStatus({ status: payload.status, lastHeartbeat: payload.lastHeartbeat });
    };

    const onSessionProgress = (payload) => {
      if (payload?.chargerId !== id && payload?.ocppId !== charger?.ocppId) return;

      const newPoint = {
        time: Date.now(),
        power: payload.powerKw || 0,
      };

      setLiveMetrics({
        energy: payload.energyDelivered || 0,
        powerKw: payload.powerKw || 0,
        cost: payload.totalCost || 0,
      });

      setHistory((prev) => [...prev.slice(-20), newPoint]);
    };

    (async () => {
      socket = await getSocketAsync();
      if (!mounted) return;
      socket.emit("charger:subscribe", id);
      socket.on("charger:status", onStatus);
      socket.on("session_progress", onSessionProgress);
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.emit("charger:unsubscribe", id);
        socket.off("charger:status", onStatus);
        socket.off("session_progress", onSessionProgress);
      }
    };
  }, [id]);

  const call = async (fn) => {
    setMessage(null);
    setError(null);
    try {
      const resp = await fn();
      setMessage(resp?.data?.message || "Command sent");
    } catch (err) {
      setError(err.response?.data?.error || "Command failed");
    }
  };

  const callOcpp = async (fn) => {
    setMessage(null);
    setError(null);
    try {
      const resp = await fn();
      setMessage(resp?.data?.message || "OK");
      return resp;
    } catch (err) {
      setError(err.response?.data?.error || "Command failed");
      throw err;
    }
  };

  const refreshConnectedInfo = async () => {
    if (!charger?.ocppId) return;
    const resp = await callOcpp(() => axios.get(`${import.meta.env.VITE_API_URL}/admin/ocpp-server/connected/${charger.ocppId}`));
    setConnectedInfo(resp.data);
  };

  if (error && !charger) return <div>{error}</div>;
  if (!charger) return <div>Loading charger...</div>;

  const effectiveStatus = status?.status || charger.status;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{charger.name}</h1>
            <p className="text-sm text-slate-600">{charger.station?.name}</p>
            <p className="text-xs text-slate-500">OCPP: {charger.ocppId}</p>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={charger.id} label="Copy Charger ID" />
            <CopyButton value={charger.ocppId} label="Copy OCPP ID" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {effectiveStatus}
            </span>
            {status?.lastHeartbeat && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                LIVE
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-700">
          <div className="rounded-lg bg-slate-50 p-3">Connector: {charger.connectorType}</div>
          <div className="rounded-lg bg-slate-50 p-3">Power: {charger.powerOutputKw} kW</div>
          <div className="rounded-lg bg-slate-50 p-3">Price: PHP {charger.pricePerKwh}/kWh</div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Last heartbeat: {status?.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleString() : "-"}
        </p>

        {/* ✅ Fault diagnostics */}
        {(charger.errorCode || status?.errorCode) && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <div className="font-semibold">
              ⚠ Fault: {status?.errorCode || charger.errorCode}
            </div>
            {(status?.errorInfo || charger.errorInfo) && (
              <div className="text-xs mt-1">
                {status?.errorInfo || charger.errorInfo}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg bg-green-50 p-3">
            ⚡ Energy: {liveMetrics.energy} kWh
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            🔌 Power: {liveMetrics.powerKw} kW
          </div>
          <div className="rounded-lg bg-yellow-50 p-3">
            💰 Cost: ₱ {liveMetrics.cost}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Live Power Graph</h3>
          <div className="flex items-end gap-1 h-24 bg-slate-50 p-2 rounded-lg">
            {history.map((p, i) => (
              <div
                key={i}
                style={{ height: `${Math.min(100, p.power * 5)}%` }}
                className="w-2 bg-blue-500 rounded"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Controls</h2>
        {message && <div className="mt-3 text-sm text-slate-700">{message}</div>}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={idTag}
            onChange={(e) => setIdTag(e.target.value)}
            className="w-full rounded-lg border border-slate-200 p-3"
            placeholder="idTag"
          />
          <input
            type="number"
            min="1"
            value={connectorId}
            onChange={(e) => setConnectorId(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 p-3"
            placeholder="connectorId"
          />
          <button
            onClick={() =>
              call(() =>
                axios.post(`${import.meta.env.VITE_API_URL}/admin/chargers/${id}/start`, {
                  idTag,
                  connectorId,
                })
              )
            }
            className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            Remote Start
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 p-3"
            placeholder="transactionId"
          />
          <button
            onClick={() =>
              call(() =>
                axios.post(`${import.meta.env.VITE_API_URL}/admin/chargers/${id}/stop`, {
                  transactionId,
                })
              )
            }
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
          >
            Remote Stop
          </button>
          <button
            onClick={() => call(() => axios.post(`${import.meta.env.VITE_API_URL}/admin/chargers/${id}/reset`, { type: "Soft" }))}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
          >
            Reset (Soft)
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">OCPP Server (Option A)</h3>
          <p className="mt-1 text-xs text-slate-500">
            Uses backend proxy: <code>/api/admin/ocpp-server/*</code>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={refreshConnectedInfo}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Refresh connected info
            </button>
            {connectedInfo?.connected != null && (
              <span className="text-sm text-slate-700">
                Connected: <span className="font-semibold">{String(connectedInfo.connected)}</span>
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="number"
              value={ocppConnectorId}
              onChange={(e) => setOcppConnectorId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="connectorId (0 = whole charger)"
            />
            <select
              value={availabilityType}
              onChange={(e) => setAvailabilityType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3"
            >
              <option value="Operative">Operative</option>
              <option value="Inoperative">Inoperative</option>
            </select>
            <button
              onClick={() =>
                callOcpp(() =>
                  axios.post(`${import.meta.env.VITE_API_URL}/admin/ocpp-server/change-availability`, {
                    chargePointId: charger.ocppId,
                    connectorId: ocppConnectorId,
                    type: availabilityType,
                  })
                )
              }
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
            >
              Change Availability
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              type="number"
              value={ocppConnectorId}
              onChange={(e) => setOcppConnectorId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 p-3"
              placeholder="connectorId"
            />
            <button
              onClick={() =>
                callOcpp(() =>
                  axios.post(`${import.meta.env.VITE_API_URL}/admin/ocpp-server/unlock-connector`, {
                    chargePointId: charger.ocppId,
                    connectorId: ocppConnectorId,
                  })
                )
              }
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
            >
              Unlock Connector
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={configKeys}
              onChange={(e) => setConfigKeys(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 md:col-span-2"
              placeholder="Comma-separated configuration keys (e.g. HeartbeatInterval,NumberOfConnectors)"
            />
            <button
              onClick={async () => {
                const keys = String(configKeys)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const resp = await callOcpp(() =>
                  axios.post(`${import.meta.env.VITE_API_URL}/admin/ocpp-server/get-configuration`, {
                    chargePointId: charger.ocppId,
                    key: keys,
                  })
                );
                setConfigResult(resp.data);
              }}
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
            >
              Get Configuration
            </button>
          </div>

          {configResult && (
            <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(configResult, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Session history</h2>
        {charger.sessions?.length ? (
          <div className="mt-4 space-y-3">
            {charger.sessions
              .slice()
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 10)
              .map((s) => (
                <div key={s.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{s.status}</div>
                      <div className="text-xs text-slate-600">Start: {new Date(s.startTime).toLocaleString()}</div>
                      {s.endTime && <div className="text-xs text-slate-600">End: {new Date(s.endTime).toLocaleString()}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-600">kWh: {s.energyKwh}</div>
                      <div className="text-xs text-slate-600">Cost: ₱ {s.costPeso}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
