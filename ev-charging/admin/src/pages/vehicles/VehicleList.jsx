import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ListHeader from "../../components/ListHeader";
import PaginationControls from "../../components/PaginationControls";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageLoader from "../../components/ui/PageLoader";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { Table, TableContainer, TBody, THead, TD, TH, TR } from "../../components/ui/Table";

const fetchVehicles = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-catalog`, { params });
  return response.data;
};

export default function VehicleList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [isActive, setIsActive] = useState(searchParams.get("isActive") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const pageSize = 25;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(isActive ? { isActive } : {}),
    }),
    [page, q, isActive]
  );

  const { data, error, isLoading } = useQuery(["vehicles", params], fetchVehicles, {
    keepPreviousData: true,
  });

  const syncUrl = (next) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    setSearchParams(sp, { replace: true });
  };

  if (isLoading) return <PageLoader title="Vehicles" rows={10} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load vehicles"
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
          title="Vehicles"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
          actions={
            <Button as={Link} to="/vehicles/create" className="whitespace-nowrap">
              + Create vehicle
            </Button>
          }
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
              syncUrl({ q: e.target.value, page: 1 });
            }}
            placeholder="Search make/model/plate/user"
          />
          <Input
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
              syncUrl({ isActive: e.target.value, page: 1 });
            }}
            placeholder='Filter isActive: "true" or "false"'
          />
          <div className="lg:col-span-2">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              disabled={!data?.items}
              onPrev={() =>
                setPage((p) => {
                  const next = Math.max(1, p - 1);
                  syncUrl({ page: next });
                  return next;
                })
              }
              onNext={() =>
                setPage((p) => {
                  const next = Math.min(totalPages, p + 1);
                  syncUrl({ page: next });
                  return next;
                })
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {items.length === 0 ? (
          <EmptyState title="No vehicles found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="hidden md:block">
              <TableContainer>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Vehicle</TH>
                      <TH>Connector</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {items.map((v) => (
                      <TR key={v.id}>
                        <TD className="font-semibold">
                          {v.make} {v.model} ({v.year})
                        </TD>
                        <TD>{v.connectorType}</TD>
                        <TD>{v.isActive ? "ACTIVE" : "INACTIVE"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
            </div>

            <div className="space-y-3 md:hidden">
              {items.map((v) => (
                <div key={v.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/40">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {v.make} {v.model} ({v.year})
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <div className="font-semibold">Connector</div>
                      <div>{v.connectorType}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Status</div>
                      <div>{v.isActive ? "ACTIVE" : "INACTIVE"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
