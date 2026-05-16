import { useEffect, useMemo, useState } from "react";
import { getSocketAsync } from "../../lib/socket";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

function formatTs(v) {
  try {
    return v ? new Date(v).toLocaleString() : "-";
  } catch {
    return "-";
  }
}

function guessSeverity(payload) {
  const s = String(payload?.severity || payload?.level || "").toLowerCase();
  if (["critical", "crit", "high", "error"].includes(s)) return "danger";
  if (["warn", "warning", "medium"].includes(s)) return "warning";
  return "info";
}

export default function CpoAlerts() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  const counts = useMemo(() => {
    const c = { danger: 0, warning: 0, info: 0 };
    for (const e of events) c[guessSeverity(e)]++;
    return c;
  }, [events]);

  useEffect(() => {
    let socket;
    let mounted = true;

    const onAlert = (payload) => {
      if (!payload) return;
      setEvents((prev) => [{ ...payload }, ...prev].slice(0, 200));
    };

    (async () => {
      socket = await getSocketAsync();
      if (!mounted) return;
      setConnected(true);
      socket.emit("cpo:subscribe");
      socket.on("cpo_alert", onAlert);
    })().catch(() => {
      if (mounted) setConnected(false);
    });

    return () => {
      mounted = false;
      if (socket) {
        socket.emit("cpo:unsubscribe");
        socket.off("cpo_alert", onAlert);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">CPO Alerts</div>
              <div className="mt-1 text-sm text-slate-600">Live feed from Socket.IO event: cpo_alert</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "success" : "default"}>{connected ? "Live" : "Offline"}</Badge>
              <Button variant="secondary" onClick={() => setEvents([])}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Critical</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{counts.danger}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Warnings</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{counts.warning}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Info</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{counts.info}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-base font-semibold text-slate-900">Feed</div>
          <div className="text-sm text-slate-600">Showing the last {events.length} events (max 200).</div>
        </CardHeader>
        <CardBody>
          {events.length === 0 ? (
            <div className="text-sm text-slate-600">No alerts received yet.</div>
          ) : (
            <div className="space-y-2">
              {events.map((e, idx) => {
                const sev = guessSeverity(e);
                const badge = sev === "danger" ? "danger" : sev === "warning" ? "warning" : "info";
                const title = e.title || e.message || e.type || "Alert";
                const desc = e.description || e.details || e.error || e.reason || "";

                return (
                  <div key={idx} className="rounded-xl bg-white/60 p-3 ring-1 ring-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{title}</div>
                        {desc ? <div className="mt-1 text-sm text-slate-600">{String(desc)}</div> : null}
                        <div className="mt-2 text-xs text-slate-500">{formatTs(e.ts)}</div>
                      </div>
                      <Badge variant={badge}>{String(e.severity || e.level || sev).toUpperCase()}</Badge>
                    </div>
                    {(e.ocppId || e.chargePointId) && (
                      <div className="mt-2 text-xs text-slate-500">ChargePoint: {e.ocppId || e.chargePointId}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
