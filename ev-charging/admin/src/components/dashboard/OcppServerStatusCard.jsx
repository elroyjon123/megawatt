import { useEffect, useState } from "react";
import axios from "axios";
import Card, { CardBody } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { getSocketAsync } from "../../lib/socket";

export default function OcppServerStatusCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectedCount, setConnectedCount] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/ocpp-server/connected`);
      setConnectedCount(resp.data?.count ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to load OCPP server status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let socket;
    let mounted = true;

    const onAlert = (payload) => {
      setAlerts((prev) => [payload, ...prev].slice(0, 5));
    };

    (async () => {
      try {
        socket = await getSocketAsync();
        if (!mounted) return;
        socket.emit("cpo:subscribe");
        socket.on("cpo_alert", onAlert);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.emit("cpo:unsubscribe");
        socket.off("cpo_alert", onAlert);
      }
    };
  }, []);

  const status = error ? "ERROR" : loading ? "LOADING" : "OK";

  return (
    <Card className="bg-white/70">
      <CardBody className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">OCPP Server</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {connectedCount == null ? "–" : connectedCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">Connected charge points</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={status === "OK" ? "success" : status === "LOADING" ? "secondary" : "danger"}>
              {status}
            </Badge>
            <Button variant="secondary" onClick={load} className="text-xs">
              Refresh
            </Button>
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-700">{error}</div>}

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest alerts</div>
          {alerts.length === 0 ? (
            <div className="mt-2 text-sm text-slate-600">No alerts yet.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {alerts.map((a, idx) => (
                <div key={idx} className="rounded-lg bg-white/60 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                  <div className="font-semibold">{a?.type || "alert"}</div>
                  <div className="mt-1 text-slate-500">{a?.ocppId || a?.chargePointId || ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
