import { useEffect, useState } from "react";
import api from "../lib/api";

export default function InboxPage() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/messages");
        setMessages(res.data || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Inbox</h2>

      {messages.length === 0 && <p>No messages yet</p>}

      {messages.map((m) => (
        <div key={m.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 10 }}>
          <b>{m.title}</b>
          <p>{m.body}</p>
        </div>
      ))}
    </div>
  );
}