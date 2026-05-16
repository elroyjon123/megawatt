import { useEffect, useState } from "react";

export default function OcppLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState("");

  async function fetchLogs() {
    try {
      const query = sessionId ? `?sessionId=${sessionId}` : "";
      const res = await fetch(`/api/admin/ocpp-logs${query}`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading logs...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>OCPP Logs</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Filter by sessionId"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          style={{ padding: 6, width: 300 }}
        />
      </div>

      <table border="1" cellPadding="6" style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>OCPP ID</th>
            <th>Type</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.ocppId}</td>
              <td>{log.type}</td>
              <td>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}