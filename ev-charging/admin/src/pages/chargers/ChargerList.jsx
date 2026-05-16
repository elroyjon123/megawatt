import { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import axios from "axios";
import { getSocketAsync } from "../../lib/socket";
import ListHeader from "../../components/ListHeader";
import PaginationControls from "../../components/PaginationControls";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import PageLoader from "../../components/ui/PageLoader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import QrScannerModal from "../../components/QrScannerModal";

const fetchChargers = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/chargers`, { params });
  return response.data;
};

export default function ChargerList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [includeOffline, setIncludeOffline] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [scannerOpen, setScannerOpen] = useState(false);

  const params = useMemo(
    () => ({
      page,
      pageSize,
      includeOffline,
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
    }),
    [includeOffline, page, q, status]
  );

  const { data, error, isLoading } = useQuery(["chargers", params], fetchChargers, {
    keepPreviousData: true,
  });

  const [live, setLive] = useState({});

  useEffect(() => {
    let socket;
    let mounted = true;
    const onStatus = (payload) => {
      if (!payload?.chargerId) return;
      setLive((prev) => ({
        ...prev,
        [payload.chargerId]: { status: payload.status, lastHeartbeat: payload.lastHeartbeat },
      }));
    };

    (async () => {
      socket = await getSocketAsync();
      if (!mounted) return;
      socket.on("charger:status", onStatus);
    })();

    return () => {
      mounted = false;
      if (socket) socket.off("charger:status", onStatus);
    };
  }, []);

  if (isLoading) return <PageLoader title="Chargers" />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load chargers"
        description={error?.response?.data?.error || error?.message}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  const items = data?.items ?? data ?? [];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader>
        <ListHeader
          title="Chargers"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setScannerOpen(true)} className="whitespace-nowrap">
                Scan QR
              </Button>
              <Button as={Link} to="/chargers/create" className="whitespace-nowrap">
                + Create
              </Button>
            </div>
          }
        />

        <QrScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(ocppId) => {
            // QR payload is just the OCPP ID string.
            const url = `/chargers/create?ocppId=${encodeURIComponent(ocppId)}`;
            window.location.assign(url);
          }}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search charger/station/ocppId"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="OCCUPIED">OCCUPIED</option>
            <option value="FAULTED">FAULTED</option>
            <option value="RESERVED">RESERVED</option>
            <option value="OFFLINE">OFFLINE</option>
          </Select>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeOffline}
              onChange={(e) => {
                setIncludeOffline(e.target.checked);
                setPage(1);
              }}
            />
            Include offline
          </label>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            disabled={!data?.items}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      </CardHeader>

      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            title="No chargers found"
            description="Try adjusting your filters or create your first charger."
            action={
              <Button as={Link} to="/chargers/create">
                + Create charger
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((charger) => {
              const liveStatus = live[charger.id]?.status;
              const effectiveStatus = liveStatus || charger.status;

              const badgeVariant =
                effectiveStatus === "AVAILABLE"
                  ? "success"
                  : effectiveStatus === "FAULTED" || effectiveStatus === "OFFLINE"
                    ? "danger"
                    : effectiveStatus === "OCCUPIED"
                      ? "warning"
                      : "default";

              return (
                <Link
                  key={charger.id || charger.ocppId}
                  to={`/chargers/${charger.id || charger.ocppId}`}
                  className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-900">{charger.name}</div>
                      <div className="mt-1 text-sm text-gray-600">{charger.station?.name}</div>
                      <div className="text-xs text-gray-500">OCPP: {charger.ocppId}</div>
                      <div className="mt-2 text-sm text-gray-700">
                        {charger.connectorType} • {charger.powerOutputKw} kW • PHP {charger.pricePerKwh}/kWh
                      </div>
                    </div>
                    <Badge variant={badgeVariant}>{effectiveStatus}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
