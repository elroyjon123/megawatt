import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { setAccessToken, setRefreshToken } from "../lib/auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await api.post("/auth/register", { name, email, phone, password });
      const { accessToken, refreshToken } = resp.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      navigate("/account", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero">
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="card-body">
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>Create your account</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Sign up with email/password or continue with Google.
          </p>

          <div style={{ marginTop: 14 }} className="grid">
            <a className="btn btn-google" href={`${import.meta.env.VITE_API_URL}/auth/google/start`}>
              Continue with Google
            </a>

            <div className="divider">or</div>

            {error ? <div className="error">{error}</div> : null}

            <form className="grid" onSubmit={onSubmit}>
              <div className="field">
                <div className="label">Full name</div>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  autoComplete="name"
                />
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <div className="label">Email</div>
                  <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <div className="label">Phone (optional)</div>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63..."
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="field">
                <div className="label">Password</div>
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>

              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>

            <p className="muted">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
