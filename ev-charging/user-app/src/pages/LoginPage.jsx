import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { setAccessToken, setRefreshToken } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken } = resp.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      navigate("/account", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-body">
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>Log in</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Use your email/password or continue with Google.
          </p>

          <div style={{ marginTop: 14 }} className="grid">
            <a className="btn btn-google" href={`${import.meta.env.VITE_API_URL}/auth/google/start`}>
              Continue with Google
            </a>

            <div className="divider">or</div>

            {error ? <div className="error">{error}</div> : null}

            <form className="grid" onSubmit={onSubmit}>
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
                <div className="label">Password</div>
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>

            <p className="muted">
              Don’t have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
