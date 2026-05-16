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

const fetchBatches = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/messages/batches`, { params });
  return response.data;
};

export default function MessageBatches() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
    }),
    [page, q, type]
  );

  const { data, error, isLoading } = useQuery(["messageBatches", params], fetchBatches, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Sent Messages" rows={6} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load sent batches"
        description={error?.response?.data?.error || error?.message}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader>
        <ListHeader
          title="Sent Messages"
          subtitle="One row per broadcast batch."
          meta={`Page ${page} / ${totalPages} • total ${total}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search title/body"
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
            <option value="VOUCHER">VOUCHER</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="TRANSACTION">TRANSACTION</option>
          </Select>
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
          <EmptyState title="No sent batches found" description="Send a broadcast message to see it here." />
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <div key={m.batchId} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{m.title}</div>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{m.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Batch: {m.batchId} • {new Date(m.createdAt).toLocaleString()} • by {m.createdBy}
                    </p>
                  </div>
                  <Badge variant="info">{m.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
