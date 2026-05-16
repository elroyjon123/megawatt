import { useEffect, useState } from "react";
import axios from "axios";

export default function InboxList() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/messages`);
      setMessages(resp.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = messages.filter((m) =>
    filter === "ALL" ? true : m.type === filter
  );

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Message History</h1>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-200 p-2 text-sm"
        >
          <option value="ALL">All</option>
          <option value="NOTIFICATION">Notification</option>
          <option value="TRANSACTION">Transaction</option>
          <option value="VOUCHER">Voucher</option>
          <option value="SUPPORT">Support</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-600">No messages found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-600">{m.type}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="mt-2 text-sm text-slate-700">{m.body}</p>

              <div className="mt-2 text-xs text-slate-500">
                User: {m.user?.email || m.userId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}