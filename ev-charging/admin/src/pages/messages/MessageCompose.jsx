import { useState } from "react";
import axios from "axios";

export default function MessageCompose() {
  const [formData, setFormData] = useState({ recipientType: "all", recipientId: "", title: "", body: "", type: "NOTIFICATION" });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/messages`, formData);
      setMessage("Message sent successfully");
      setFormData({ recipientType: "all", recipientId: "", title: "", body: "", type: "NOTIFICATION" });
    } catch (error) {
      setMessage(error.response?.data?.error || "Send failed");
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Compose Message</h1>
      {message && <div className="mb-4 text-slate-700">{message}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <select name="recipientType" value={formData.recipientType} onChange={handleChange} className="w-full rounded-lg border border-slate-200 p-3">
          <option value="all">All Users</option>
          <option value="specific">Specific User</option>
        </select>
        {formData.recipientType === "specific" && (
          <input name="recipientId" value={formData.recipientId} onChange={handleChange} placeholder="User ID" className="w-full rounded-lg border border-slate-200 p-3" />
        )}
        <select name="type" value={formData.type} onChange={handleChange} className="w-full rounded-lg border border-slate-200 p-3">
          <option value="NOTIFICATION">Notification</option>
          <option value="VOUCHER">Voucher</option>
          <option value="SUPPORT">Support</option>
        </select>
        <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="w-full rounded-lg border border-slate-200 p-3" />
        <textarea name="body" value={formData.body} onChange={handleChange} placeholder="Body" className="w-full rounded-lg border border-slate-200 p-3" rows="5"></textarea>
        <button type="submit" className="rounded-lg bg-slate-900 text-white px-5 py-3 hover:bg-slate-800">Send Message</button>
      </form>
    </div>
  );
}
