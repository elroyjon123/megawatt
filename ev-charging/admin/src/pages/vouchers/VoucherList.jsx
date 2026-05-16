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
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const fetchVouchers = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vouchers`, { params });
  return response.data;
};

export default function VoucherList() {
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);
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

  const { data, error, isLoading, refetch } = useQuery(["vouchers", params], fetchVouchers, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Vouchers" rows={8} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load vouchers"
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

  const deactivate = async (id) => {
    setMessage(null);
    setSavingId(id);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/vouchers/${id}`);
      setMessage("Voucher deactivated");
      await refetch();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to deactivate");
    } finally {
      setSavingId(null);
    }
  };

  const reactivate = async (id) => {
    setMessage(null);
    setSavingId(id);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/admin/vouchers/${id}`, { isActive: true });
      setMessage("Voucher reactivated");
      await refetch();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to reactivate");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <ListHeader
          title="Vouchers"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
          actions={
            <Button as={Link} to="/vouchers/create" className="whitespace-nowrap">
              + Create
            </Button>
          }
        />

        {message && <div className="mt-3 text-sm text-slate-700">{message}</div>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search code"
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
        {items.length === 0 ? (
          <EmptyState title="No vouchers found" description="Try adjusting your filters or create a voucher." />
        ) : (
          <div className="space-y-3">
            {items.map((voucher) => (
              <div key={voucher.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{voucher.code}</div>
                    <div className="mt-1 text-sm text-slate-700">
                      Discount: {voucher.discountPeso ? `PHP ${voucher.discountPeso}` : `${voucher.discountPercent}%`}
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                      <div>
                        Uses: {voucher.usedCount} / {voucher.maxUses}
                      </div>
                      <div>
                        Expires: {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : "No expiry"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={voucher.isActive ? "success" : "default"}>
                      {voucher.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>

                    {voucher.isActive ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deactivate(voucher.id)}
                        disabled={savingId === voucher.id}
                      >
                        {savingId === voucher.id ? "Working..." : "Deactivate"}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => reactivate(voucher.id)}
                        disabled={savingId === voucher.id}
                      >
                        {savingId === voucher.id ? "Working..." : "Reactivate"}
                      </Button>
                    )}
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
