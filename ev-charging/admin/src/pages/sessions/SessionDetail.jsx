import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { getSocketAsync } from "../../lib/socket";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";

function formatTs(v) {
  try {
    return v ? new Date(v).toLocaleString() : "-";
  } catch {
    return "-";
  }
}

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const badgeVariant = useMemo(() => {
    if (!session?.status) return "default";
    return session.status === "COMPLETED" ? "success" : session.status === "ACTIVE" ? "warning" : "default";
  }, [session?.status]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/sessions/${id}`);
        if (!mounted) return;
        setSession(resp.data);
      } catch (err) {
        if (!mounted) return;
        // Allow viewing a dev-only session ID even if the DB is down.
        if (String(id).startsWith("dev-")) {
          setSession({
            id,
            status: "ACTIVE",
            startTime: new Date().toISOString(),
            endTime: null,
            energyKwh: 0,
            costPeso: 0,
            ocppTransactionId: null,
            chargerId: "-",
            charger: { id: null, name: "Dev charger", station: { name: "Dev station" } },
          });
          setError(null);
        } else {
          setError(err.response?.data?.error || "Failed to load session");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let socket;
    let mounted = true;

    const onProgress = (payload) => {
      if (!payload) return;
      if (payload.sessionId && payload.sessionId !== id) return;
      setProgress((prev) => [{ ...payload }, ...prev].slice(0, 50));
    };

    (async () => {
      try {
        socket = await getSocketAsync();
        if (!mounted) return;
        socket.emit("session:subscribe", id);
        socket.on("session_progress", onProgress);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.emit("session:unsubscribe", id);
        socket.off("session_progress", onProgress);
      }
    };
  }, [id]);

  if (loading) return <PageLoader title="Session" rows={6} />;
  if (error) return <ErrorState title="Failed to load session" description={error} />;
  if (!session) return <div className="text-sm text-slate-700">Session not found.</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{session.id}</div>
              <div className="mt-1 text-sm text-slate-600">
                Station: {session.charger?.station?.name ?? "-"} • Charger:{" "}
                {session.charger?.id ? (
                  <Link
                    to={`/chargers/${session.charger.id}`}
                    className="text-slate-900 underline decoration-emerald-400/60 underline-offset-4"
                  >
                    {session.charger?.name ?? session.charger.id}
                  </Link>
                ) : (
                  session.chargerId
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant}>{session.status}</Badge>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-4 text-sm">
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Start</div>
              <div className="mt-1 text-slate-900">{formatTs(session.startTime)}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">End</div>
              <div className="mt-1 text-slate-900">{formatTs(session.endTime)}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Energy</div>
              <div className="mt-1 text-slate-900">{session.energyKwh} kWh</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Cost</div>
              <div className="mt-1 text-slate-900">₱ {session.costPeso}</div>
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-600">OCPP transactionId: {session.ocppTransactionId ?? "-"}</div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-base font-semibold text-slate-900">Live session progress</div>
          <div className="text-sm text-slate-600">Listening on Socket.IO event: session_progress</div>
        </CardHeader>
        <CardBody>
          {progress.length === 0 ? (
            <div className="text-sm text-slate-600">No progress events received yet.</div>
          ) : (
            <div className="space-y-2">
              {progress.map((p, idx) => (
                <div key={idx} className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
                  <div className="text-xs text-slate-500">{formatTs(p.ts)}</div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-3 text-sm">
                    <div>kWh: {p.energyDelivered ?? "-"}</div>
                    <div>Cost: {p.totalCost ?? "-"}</div>
                    <div>kW: {p.powerKw ?? "-"}</div>
                  </div>
                  {(p.ocppId || p.ocppTransactionId != null) && (
                    <div className="mt-1 text-xs text-slate-500">
                      ocppId: {p.ocppId ?? "-"} • ocppTxn: {p.ocppTransactionId ?? "-"}
                    </div>
                  )}
                  {p.warning && <div className="mt-2 text-xs text-amber-700">{p.warning}</div>}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
