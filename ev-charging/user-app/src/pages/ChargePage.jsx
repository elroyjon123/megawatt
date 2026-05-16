import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ChargePage() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  function handleGo() {
    if (!input) return;
    navigate(`/chargers/${input}`);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Scan QR / Enter Charger ID</h2>

      <p style={{ fontSize: 12, color: "#666" }}>
        (Camera scanner can be added later — for now use manual input)
      </p>

      <input
        placeholder="Enter chargerId"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ padding: 10, width: "100%", marginTop: 10 }}
      />

      <button
        onClick={handleGo}
        style={{ marginTop: 10, width: "100%" }}
      >
        Go to Charger
      </button>
    </div>
  );
}