import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
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

const fetchUsers = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, { params });
  return response.data;
};

export default function UserList() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [includeDeactivated, setIncludeDeactivated] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(q ? { q } : {}),
      ...(role ? { role } : {}),
      includeDeactivated,
    }),
    [includeDeactivated, page, q, role]
  );

  const { data, error, isLoading } = useQuery(["users", params], fetchUsers, {
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader title="Users" rows={10} />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load users"
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
          title="Users"
          subtitle={`Showing ${items.length} of ${total}`}
          meta={`Page ${page} / ${totalPages}`}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name/email"
          />
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={includeDeactivated}
              onChange={(e) => {
                setIncludeDeactivated(e.target.checked);
                setPage(1);
              }}
            />
            Include deactivated
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
          <EmptyState title="No users found" description="Try adjusting your filters." />
        ) : (
          <div className="space-y-3">
            {items.map((user) => (
              <Link
                key={user.id}
                to={`/users/${user.id}`}
                className="block rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm transition hover:bg-white"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{user.name}</div>
                    <div className="mt-1 text-sm text-slate-600">{user.email}</div>
                    {user.phone ? <div className="text-sm text-slate-600">{user.phone}</div> : null}
                  </div>
                  <Badge variant={user.role === "ADMIN" ? "info" : "default"}>{user.role}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
