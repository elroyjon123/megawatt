import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import ListHeader from "../../components/ListHeader";
import PaginationControls from "../../components/PaginationControls";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import PageLoader from "../../components/ui/PageLoader";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { Table, TableContainer, TBody, THead, TD, TH, TR } from "../../components/ui/Table";
import { Link } from "react-router-dom";

const fetchSessions = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/sessions`, { params });
  return response.data;
};

export default function SessionList() {
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [chargerId, setChargerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
      ...(chargerId ? { chargerId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [chargerId, from, page, status, to, userId]
  );

  const { data, error, isLoading } = useQuery(["sessions", params], fetchSessions, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Sessions" rows={10} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load sessions"
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
          title="Sessions"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
          <Input
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            placeholder="userId"
          />
          <Input
            value={chargerId}
            onChange={(e) => {
              setChargerId(e.target.value);
              setPage(1);
            }}
            placeholder="chargerId"
          />
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
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
          <EmptyState title="No sessions found" description="Try adjusting your filters." />
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <TableContainer>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Status</TH>
                      <TH></TH>
                      <TH>Station</TH>
                      <TH>Charger</TH>
                      <TH>Start</TH>
                      <TH>End</TH>
                      <TH>kWh</TH>
                      <TH>Cost</TH>
                      <TH>OCPP Txn</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {items.map((s) => {
                      const badgeVariant =
                        s.status === "COMPLETED" ? "success" : s.status === "ACTIVE" ? "warning" : "default";

                      return (
                        <TR key={s.id}>
                          <TD>
                            <Badge variant={badgeVariant}>{s.status}</Badge>
                          </TD>
                          <TD>
                            <Link
                              to={`/sessions/${s.id}`}
                              className="text-slate-900 underline decoration-emerald-400/60 underline-offset-4"
                            >
                              View
                            </Link>
                          </TD>
                          <TD>{s.charger?.station?.name ?? "-"}</TD>
                          <TD>{s.charger?.name ?? s.chargerId}</TD>
                          <TD className="whitespace-nowrap">{new Date(s.startTime).toLocaleString()}</TD>
                          <TD className="whitespace-nowrap">
                            {s.endTime ? new Date(s.endTime).toLocaleString() : "-"}
                          </TD>
                          <TD>{s.energyKwh}</TD>
                          <TD>₱ {s.costPeso}</TD>
                          <TD>{s.ocppTransactionId ?? "-"}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableContainer>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {items.map((s) => {
                const badgeVariant =
                  s.status === "COMPLETED" ? "success" : s.status === "ACTIVE" ? "warning" : "default";

                return (
                  <div key={s.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {s.charger?.station?.name ?? "-"}
                      </div>
                      <Badge variant={badgeVariant}>{s.status}</Badge>
                    </div>
                    <div className="mt-2">
                      <Link
                        to={`/sessions/${s.id}`}
                        className="text-sm text-slate-900 underline decoration-emerald-400/60 underline-offset-4"
                      >
                        View session
                      </Link>
                    </div>
                    <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      Charger: {s.charger?.name ?? s.chargerId}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <div className="font-semibold">Start</div>
                        <div>{new Date(s.startTime).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-semibold">End</div>
                        <div>{s.endTime ? new Date(s.endTime).toLocaleString() : "-"}</div>
                      </div>
                      <div>
                        <div className="font-semibold">Energy</div>
                        <div>{s.energyKwh} kWh</div>
                      </div>
                      <div>
                        <div className="font-semibold">Cost</div>
                        <div>₱ {s.costPeso}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      OCPP Txn: {s.ocppTransactionId ?? "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
