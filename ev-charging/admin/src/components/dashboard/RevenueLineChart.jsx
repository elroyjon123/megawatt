import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function RevenueLineChart({ data }) {
  const safe = (data || []).map((d) => ({
    date: d.date,
    revenue: Number(d.revenue || 0),
  }));

  if (!safe.length) {
    return <div className="p-4 text-sm text-slate-600">No revenue data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={safe} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
