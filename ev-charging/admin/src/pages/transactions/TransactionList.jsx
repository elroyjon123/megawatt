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

const fetchTransactions = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/transactions`, { params });
  return response.data;
};

export default function TransactionList() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(userId ? { userId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [from, page, q, to, type, userId]
  );

  const { data, error, isLoading } = useQuery(["transactions", params], fetchTransactions, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Transactions" rows={8} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load transactions"
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
          title="Transactions"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search description/ref/user"
            className="lg:col-span-2"
          />
          <Input
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            placeholder="userId"
          />
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="TOP_UP">TOP_UP</option>
            <option value="CHARGE">CHARGE</option>
            <option value="REFUND">REFUND</option>
            <option value="VOUCHER_REDEMPTION">VOUCHER_REDEMPTION</option>
          </Select>
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
          <EmptyState title="No transactions found" description="Try adjusting your filters." />
        ) : (
          <div className="space-y-3">
            {items.map((txn) => (
              <div
                key={txn.id}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{txn.type}</Badge>
                      {txn.createdAt ? (
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(txn.createdAt).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{txn.description}</div>
                    <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                      {txn.user?.email ? <div>{txn.user.email}</div> : null}
                      {txn.referenceId ? <div>Ref: {txn.referenceId}</div> : null}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">PHP {txn.amountPeso}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
