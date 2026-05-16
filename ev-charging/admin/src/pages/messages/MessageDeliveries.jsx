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
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Button from "../../components/ui/Button";

const fetchMessages = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/messages`, { params });
  return response.data;
};

export default function MessageDeliveries() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [onlySent, setOnlySent] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(onlySent ? { onlySent: true } : {}),
    }),
    [onlySent, page, q, type]
  );

  const { data, error, isLoading } = useQuery(["messageDeliveries", params], fetchMessages, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Message Deliveries" rows={10} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load messages"
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
          title="Message Deliveries"
          subtitle="One row per recipient delivery."
          meta={`Page ${page} / ${totalPages} • total ${total}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search title/body/user"
            className="lg:col-span-2"
          />
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="NOTIFICATION">NOTIFICATION</option>
            <option value="TRANSACTION">TRANSACTION</option>
            <option value="VOUCHER">VOUCHER</option>
            <option value="SUPPORT">SUPPORT</option>
          </Select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={onlySent}
              onChange={(e) => {
                setOnlySent(e.target.checked);
                setPage(1);
              }}
            />
            Only admin-sent
          </label>

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
        {items.length === 0 ? (
          <EmptyState title="No messages found" description="Try adjusting your filters." />
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                      <Badge variant="info">{m.type}</Badge>
                      <Badge variant={m.isRead ? "default" : "warning"}>{m.isRead ? "READ" : "UNREAD"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{m.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      To: {m.user?.email || m.userId} • {new Date(m.createdAt).toLocaleString()}
                      {m.batchId ? ` • batch ${m.batchId}` : ""}
                      {m.createdBy ? ` • by ${m.createdBy}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
