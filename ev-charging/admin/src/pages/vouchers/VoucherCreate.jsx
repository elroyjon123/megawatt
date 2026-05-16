import { useState } from "react";
import axios from "axios";

export default function VoucherCreate() {
  const [formData, setFormData] = useState({ code: "", discountPeso: "", discountPercent: "", maxUses: 1, expiresAt: "" });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/vouchers`, formData);
      setMessage("Voucher created successfully");
      setFormData({ code: "", discountPeso: "", discountPercent: "", maxUses: 1, expiresAt: "" });
    } catch (error) {
      setMessage(error.response?.data?.error || "Creation failed");
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Create Voucher</h1>
      {message && <div className="mb-4 text-slate-700">{message}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input name="code" value={formData.code} onChange={handleChange} placeholder="Code" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="discountPeso" value={formData.discountPeso} onChange={handleChange} placeholder="Discount PHP" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="discountPercent" value={formData.discountPercent} onChange={handleChange} placeholder="Discount %" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="maxUses" value={formData.maxUses} onChange={handleChange} type="number" min="1" className="w-full rounded-lg border border-slate-200 p-3" />
        <input name="expiresAt" value={formData.expiresAt} onChange={handleChange} type="date" className="w-full rounded-lg border border-slate-200 p-3" />
        <button type="submit" className="rounded-lg bg-slate-900 text-white px-5 py-3 hover:bg-slate-800">Create Voucher</button>
      </form>
    </div>
  );
}
