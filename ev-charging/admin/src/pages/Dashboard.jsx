import { useQuery } from "react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { Suspense, lazy, useMemo, useEffect, useState } from "react";
import Card, { CardBody } from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";

const StatusPieChart = lazy(() => import("../components/dashboard/StatusPieChart"));
const RevenueLineChart = lazy(() => import("../components/dashboard/RevenueLineChart"));
const OcppServerStatusCard = lazy(() => import("../components/dashboard/OcppServerStatusCard"));

const fetchSummary = async () => {
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard/summary`);
  return response.data;
};

function KpiCard({ label, value }) {
  return (
    <Card>
      <CardBody className="px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</div>
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery(["dashboardSummary"], fetchSummary, {
    refetchInterval: false,
  });

  const [liveTick, setLiveTick] = useState(0);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let socket;
    let mounted = true;

    const onUpdate = () => {
      setLiveTick((t) => t + 1);
      refetch();
    };

    const onAlert = (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 10));
    };

    (async () => {
      const mod = await import("../lib/socket");
      socket = await mod.getSocketAsync();
      if (!mounted) return;

      socket.on("charger:status", onUpdate);
      socket.on("chargers:heartbeat", onUpdate);
      socket.on("session_progress", onUpdate);
      socket.on("alert:new", onAlert);
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.off("charger:status", onUpdate);
        socket.off("chargers:heartbeat", onUpdate);
        socket.off("session_progress", onUpdate);
        socket.off("alert:new", onAlert);
      }
    };
  }, [refetch]);

  // IMPORTANT: hooks must run on every render. Keep derived-state hooks above early returns.
  const kpis = data?.kpis ?? {};
  const status = data?.statusOverview ?? {};
  const recentSessions = data?.recentSessions ?? [];
  const revenueLast7Days = data?.revenueLast7Days ?? [];

  const statusChartData = useMemo(
    () =>
      Object.entries(status).map(([name, value]) => ({
        name,
        value: Number(value || 0),
      })),
    [status]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-white/70">
              <CardBody className="px-5 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-white/70">
            <CardBody>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-4 h-64 w-full" />
            </CardBody>
          </Card>
          <Card className="bg-white/70">
            <CardBody>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-4 h-64 w-full" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        description={error?.response?.data?.error || error?.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <KpiCard label="Total Chargers" value={kpis.totalChargers ?? 0} />
        <KpiCard label="Active Chargers" value={kpis.activeChargers ?? 0} />
        <KpiCard label="Active Sessions" value={kpis.activeSessions ?? 0} />
        <KpiCard label="Revenue Today" value={`₱ ${kpis.revenueToday ?? 0}`} />
        <KpiCard label="Total Users" value={kpis.totalUsers ?? 0} />
      </div>

      <Suspense fallback={null}>
        <OcppServerStatusCard />
      </Suspense>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">Latest alerts</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No alerts yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-700">{a.message}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600">OCPP: {a.ocppId}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-gray-900">Revenue (last 7 days)</h2>

            <Suspense
              fallback={<div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading chart…</div>}
            >
              <div className="mt-4 min-h-[240px] rounded-lg border border-gray-200 bg-white">
                <RevenueLineChart data={revenueLast7Days} />
              </div>
            </Suspense>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-gray-900">Recent sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">No sessions yet.</p>
          ) : (
            <div className="mt-4 overflow-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Charger</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">kWh</th>
                    <th className="px-3 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSessions.map((s) => (
                    <tr key={s.id} className="text-gray-700">
                      <td className="px-3 py-2 pr-3">{s.charger?.station?.name ?? "-"}</td>
                      <td className="px-3 py-2 pr-3">
                        {s.charger?.id ? (
                          <Link to={`/chargers/${s.charger.id}`} className="text-gray-900 underline underline-offset-4">
                            {s.charger?.name ?? "-"}
                          </Link>
                        ) : (
                          s.charger?.name ?? "-"
                        )}
                      </td>
                      <td className="px-3 py-2 pr-3">{s.status}</td>
                      <td className="px-3 py-2 pr-3">{new Date(s.startTime).toLocaleString()}</td>
                      <td className="px-3 py-2 pr-3">{s.energyKwh}</td>
                      <td className="px-3 py-2 pr-3">₱ {s.costPeso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-gray-900">Charger status overview</h2>

          <Suspense
            fallback={
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {Object.keys(status).length === 0 ? (
                  <p className="text-gray-600">No chargers found.</p>
                ) : (
                  Object.entries(status).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-white p-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-500">{k}</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{v}</div>
                    </div>
                  ))
                )}
              </div>
            }
          >
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="min-h-[240px] rounded-lg border border-gray-200 bg-white">
                <StatusPieChart data={statusChartData} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.keys(status).length === 0 ? (
                  <p className="text-gray-600">No chargers found.</p>
                ) : (
                  Object.entries(status).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-white p-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-500">{k}</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{v}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Suspense>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
