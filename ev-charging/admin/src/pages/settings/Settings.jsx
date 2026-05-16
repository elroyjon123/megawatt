import { useState } from "react";
import axios from "axios";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/admin/profile`, profile);
      setMessage("Profile updated");
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/change-password`, passwords);
      setMessage("Password updated");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Admin Settings</h1>

        {message && <div className="mt-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>

          <input
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-lg border border-slate-200 p-3"
          />

          <input
            value={profile.email}
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            className="w-full rounded-lg border border-slate-200 p-3"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>

          <input
            type="password"
            value={passwords.currentPassword}
            onChange={(e) =>
              setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
            }
            placeholder="Current Password"
            className="w-full rounded-lg border border-slate-200 p-3"
          />

          <input
            type="password"
            value={passwords.newPassword}
            onChange={(e) =>
              setPasswords((p) => ({ ...p, newPassword: e.target.value }))
            }
            placeholder="New Password"
            className="w-full rounded-lg border border-slate-200 p-3"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {saving ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}