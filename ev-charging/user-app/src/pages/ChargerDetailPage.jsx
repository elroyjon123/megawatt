import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import Button from "../components/ui/Button";
import Card, { CardBody } from "../components/ui/Card";

export default function ChargerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [charger, setCharger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [live, setLive] = useState({ energy: 0, power: 0, cost: 0 });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        let data;
        try {
          const resp = await api.get(`/chargers/${id}`);
          data = resp.data;
        } catch {
          const resp2 = await api.get(`/chargers?ocppId=${id}`);
          data = Array.isArray(resp2.data) ? resp2.data[0] : resp2.data;
        }

        if (!cancelled) setCharger(data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || "Failed to load charger");
        }
      }
    };

    (async () => {
      setLoading(true);
      await fetchData();
      if (!cancelled) setLoading(false);
    })();

    const interval = setInterval(fetchData, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    const socket =
      (window.io &&
        window.io(import.meta.env.VITE_API_URL.replace("/api", ""))) ||
      null;

    if (!socket) return;

    socket.on("session_progress", (payload) => {
      if (
        payload?.chargerId !== id &&
        payload?.ocppId !== charger?.ocppId
      )
        return;

      setLive({
        energy: payload.energyDelivered || 0,
        power: payload.powerKw || 0,
        cost: payload.totalCost || 0,
      });
    });

    return () => socket.disconnect();
  }, [id, charger]);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Charger</h2>
        <Link to="/stations">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <Card>
        <CardBody>
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : charger ? (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-900">
                    {charger.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {charger.ocppId}
                  </div>
                </div>

                <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {charger.status}
                </div>
              </div>

              {/* Live Metrics */}
              <Card>
                <CardBody className="text-sm text-gray-700">
                  ⚡ Power: <b>{live.power}</b> kW &nbsp;
                  🔋 Energy: <b>{live.energy}</b> kWh &nbsp;
                  💰 Cost: <b>₱ {live.cost}</b>
                </CardBody>
              </Card>

              {/* Actions */}
              <Card>
                <CardBody className="flex gap-2">
                  <Button
                    disabled={loadingAction || activeSessionId}
                    onClick={async () => {
                      setLoadingAction(true);
                      try {
                        const resp = await api.post(`/sessions/start`, {
                          chargerId: charger.id,
                          ocppId: charger.ocppId,
                        });

                        const sessionId =
                          resp?.data?.sessionId ||
                          charger?.sessions?.[0]?.id;

                        if (sessionId) {
                          navigate(`/session/${sessionId}`);
                        } else {
                          setActionMsg("Started but no session found");
                        }
                      } catch {
                        setActionMsg("Start failed");
                      }
                      setLoadingAction(false);
                    }}
                  >
                    Start
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={loadingAction || !activeSessionId}
                    onClick={async () => {
                      setLoadingAction(true);
                      try {
                        const latest = charger?.sessions?.[0];
                        if (!latest) throw new Error();

                        await api.post(
                          `/admin/chargers/${charger.id || charger.ocppId}/stop`,
                          { transactionId: latest.id }
                        );

                        setActionMsg("Stopped");
                        setActiveSessionId(null);
                      } catch {
                        setActionMsg("Stop failed");
                      }
                      setLoadingAction(false);
                    }}
                  >
                    Stop
                  </Button>

                  {actionMsg && (
                    <span className="text-sm text-gray-600">
                      {actionMsg}
                    </span>
                  )}
                </CardBody>
              </Card>

              {/* Sessions */}
              <div>
                <div className="font-semibold text-gray-900 mb-2">
                  Recent sessions
                </div>

                <div className="space-y-2">
                  {charger.sessions?.map((s) => (
                    <div
                      key={s.id}
                      className="text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
                    >
                      {s.status} • {s.energyKwh} kWh • ₱{s.costPeso}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Not found</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}