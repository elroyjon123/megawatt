import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  AVAILABLE: "#16a34a",
  OCCUPIED: "#f59e0b",
  FAULTED: "#ef4444",
  OFFLINE: "#64748b",
  RESERVED: "#8b5cf6",
};

export default function StatusPieChart({ data }) {
  const filtered = (data || []).filter((d) => Number(d.value || 0) > 0);

  if (!filtered.length) {
    return <div className="p-4 text-sm text-slate-600">No charger status data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Tooltip />
        <Pie data={filtered} dataKey="value" nameKey="name" outerRadius={90}>
          {filtered.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
