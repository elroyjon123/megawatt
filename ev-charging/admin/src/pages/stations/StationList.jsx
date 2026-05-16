import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import axios from "axios";
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
import { Suspense, lazy } from "react";

const MapPicker = lazy(() => import("../../components/MapPicker"));

const fetchStations = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stations`, { params });
  return response.data;
};

export default function StationList() {
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(isActive !== "" ? { isActive } : {}),
    }),
    [isActive, page, q]
  );

  const { data, error, isLoading } = useQuery(["stations", params], fetchStations, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Stations" />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load stations"
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
          title="Stations"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
          actions={
            <Button as={Link} to="/stations/create" size="md" className="whitespace-nowrap">
              + Create
            </Button>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name/address/city"
          />
          <Select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <div className="lg:col-span-2">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              disabled={!data?.items}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      </CardHeader>

      <CardBody>

        {/* ✅ Map preview */}
        <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden">
          <Suspense fallback={<div className="p-4 text-sm">Loading map…</div>}>
            <MapPicker
              lat={items[0]?.latitude}
              lng={items[0]?.longitude}
              height={240}
              onPick={() => {}}
            />
          </Suspense>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="No stations found"
            description="Try adjusting your filters or create your first station."
            action={
              <Button as={Link} to="/stations/create">
                + Create station
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((station) => (
              <Link
                key={station.id}
                to={`/stations/${station.id}`}
                className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      {/* ✅ Station photo */}
                      {station.photos?.[0] && (
                        <img
                          src={station.photos[0]}
                          alt={station.name}
                          className="h-20 w-28 rounded-lg object-cover border border-gray-200"
                        />
                      )}

                      <div>
                        <div className="text-base font-semibold text-gray-900">{station.name}</div>
                        <div className="mt-1 text-sm text-gray-600">{station.address}</div>
                        <div className="text-sm text-gray-600">{station.city}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          Chargers: {station.chargers?.length ?? 0}
                        </div>
                      </div>
                    </div>

                    <Badge variant={station.isActive ? "success" : "default"}>
                      {station.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>

                  {/* ✅ Mini map per station */}
                  {station.latitude && station.longitude && (
                    <div className="h-40 rounded-lg overflow-hidden border border-gray-200">
                      <Suspense fallback={<div className="p-2 text-xs">Loading map…</div>}>
                        <MapPicker
                          lat={station.latitude}
                          lng={station.longitude}
                          height={160}
                          onPick={() => {}}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
