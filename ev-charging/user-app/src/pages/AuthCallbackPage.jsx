import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken, setRefreshToken } from "../lib/auth";

export default function AuthCallbackPage({ onAuthed }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (!accessToken || !refreshToken) {
      setError("Missing tokens in callback URL. Did Google OAuth succeed?");
      return;
    }
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    if (typeof onAuthed === "function") onAuthed();
    navigate("/account", { replace: true });
  }, [navigate, onAuthed, params]);

  return (
    <div className="hero">
      <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="card-body">
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>Signing you in…</h2>
          {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : <p className="muted" style={{ marginTop: 8 }}>Please wait.</p>}
        </div>
      </div>
    </div>
  );
}
