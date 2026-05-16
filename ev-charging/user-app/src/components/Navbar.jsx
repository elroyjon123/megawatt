import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../lib/api";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function loadWallet() {
      try {
        const res = await api.get("/wallet");
        setBalance(res.data.balance || 0);
      } catch {}
    }
    if (user) loadWallet();
  }, [user]);

  return (
    <div className="nav">
      <Link to="/" className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src="/megawatt-logo.png"
          alt="Megawatt"
          style={{ height: 42, width: 42, objectFit: "contain" }}
        />
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>
          Megawatt
        </span>
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user ? (
          <>
            {/* Mobile app: navigation moved to bottom nav */}
            <span className="pill">₱{balance.toFixed(2)}</span>
            <span className="pill">{user.email}</span>
            <button
              className="btn"
              onClick={() => {
                onLogout?.();
                navigate("/");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-link" to="/login">
              Log in
            </Link>
            <Link className="btn btn-primary" to="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

