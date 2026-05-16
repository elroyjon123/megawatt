import { useEffect, useState } from "react";
import api from "../lib/api";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadWallet() {
    try {
      const res = await api.get("/wallet");
      setBalance(res.data.balance || 0);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function topup() {
    if (!amount) return;

    setLoading(true);
    try {
      await api.post("/wallet/topup", { amount: parseFloat(amount) });
      setAmount("");
      await loadWallet();
    } catch (e) {
      alert("Top-up failed");
    }
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-900">Wallet</h2>

      {/* Balance Card */}
      <Card>
        <CardBody>
          <div className="text-sm text-gray-500">Current Balance</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            ₱ {balance.toFixed(2)}
          </div>
        </CardBody>
      </Card>

      {/* Top-up */}
      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold text-gray-900">Top Up</div>

          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={topup}
            disabled={loading}
          >
            {loading ? "Processing..." : "Top Up"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}