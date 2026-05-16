import { useState } from "react";
import api from "../lib/api";

export default function VouchersPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const redeem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const resp = await api.post("/vouchers/redeem", { code });
      setMessage(`Redeemed. Discount credited: ₱${resp.data?.discountAmount ?? 0}`);
      setCode("");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Redeem failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>Redeem voucher</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Enter a voucher code. Fixed peso discounts will credit your wallet.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="pill">{message}</div> : null}

        <div className="card">
          <div className="card-body">
            <form className="grid" onSubmit={redeem}>
              <div className="field">
                <div className="label">Voucher code</div>
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME100" />
              </div>
              <button className="btn btn-primary" disabled={loading || !code.trim()}>
                {loading ? "Redeeming…" : "Redeem"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
