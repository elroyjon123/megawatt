import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function SessionPage() {
  const { sessionId } = useParams();

  const [energy, setEnergy] = useState(0);
  const [cost, setCost] = useState(0);
  const [power, setPower] = useState(0);
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    if (!sessionId) return;

    socket.emit("session:subscribe", sessionId);

    socket.on("session_progress", (data) => {
      if (data.sessionId !== sessionId) return;

      setEnergy(data.energyDelivered || 0);
      setCost(data.totalCost || 0);
      setPower(data.powerKw || 0);
    });

    return () => {
      socket.emit("session:unsubscribe", sessionId);
      socket.off("session_progress");
    };
  }, [sessionId]);

  async function stopCharging() {
    try {
      await fetch(`http://localhost:3001/api/sessions/${sessionId}/stop`, {
        method: "POST",
      });
      setStatus("COMPLETED");
    } catch (err) {
      console.error("Stop failed", err);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Charging Session</h2>

      <div>Session ID: {sessionId}</div>
      <div>Status: {status}</div>

      <h3>Live Data</h3>
      <div>Energy: {energy.toFixed(2)} kWh</div>
      <div>Cost: ₱{cost.toFixed(2)}</div>
      <div>Power: {power} kW</div>

      {status === "ACTIVE" && (
        <button onClick={stopCharging} style={{ marginTop: 20 }}>
          Stop Charging
        </button>
      )}

      {status === "COMPLETED" && (
        <div style={{ marginTop: 20 }}>
          <h3>✅ Charging Complete</h3>
          <p>Please remove the charger and close your EV lid.</p>
          <p>A receipt will be sent from Megawatt.</p>
          <p>Your transaction is recorded in Inbox.</p>
        </div>
      )}
    </div>
  );
}