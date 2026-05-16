import { useEffect, useState } from "react";
import api from "../lib/api";
import { clearTokens } from "../lib/auth";

export default function ProfilePage({ user, setUser }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const resp = await api.put("/auth/me", { name, phone });
      setUser(resp.data);
      setMessage("Profile updated");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    setMessage("");
    setError("");
    try {
      await api.put("/auth/password", { oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setMessage("Password updated");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Password change failed");
    } finally {
      setChangingPw(false);
    }
  };

  const logout = async () => {
    // backend logout is a no-op, but call it for consistency
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    clearTokens();
    setUser(null);
  };

  return (
    <div className="hero">
      <div className="grid" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>Profile</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Update your name/phone and password.
          </p>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="pill">{message}</div> : null}

        <div className="card">
          <div className="card-body">
            <form className="grid" onSubmit={saveProfile}>
              <div className="field">
                <div className="label">Name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">Phone</div>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <form className="grid" onSubmit={changePassword}>
              <div className="field">
                <div className="label">Old password</div>
                <input className="input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">New password</div>
                <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={changingPw}>
                {changingPw ? "Updating…" : "Change password"}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Log out</div>
              <div className="muted">Clears tokens from this browser.</div>
            </div>
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
