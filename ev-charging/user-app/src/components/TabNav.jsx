import { NavLink } from "react-router-dom";

const linkBase = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "rgba(255,255,255,0.7)",
  fontWeight: 800,
  fontSize: 13,
};

export default function TabNav() {
  const authed = Boolean(localStorage.getItem("accessToken"));
  if (!authed) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0 8px" }}>
      <NavLink
        to="/stations"
        style={({ isActive }) => ({
          ...linkBase,
          borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor,
        })}
      >
        Stations
      </NavLink>
      <NavLink to="/wallet" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Wallet
      </NavLink>
      <NavLink to="/sessions" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Sessions
      </NavLink>
      <NavLink to="/transactions" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Transactions
      </NavLink>
      <NavLink to="/messages" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Inbox
      </NavLink>
      <NavLink to="/vouchers" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Vouchers
      </NavLink>
      <NavLink to="/vehicles" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Vehicles
      </NavLink>
      <NavLink to="/profile" style={({ isActive }) => ({ ...linkBase, borderColor: isActive ? "rgba(16,185,129,0.55)" : linkBase.borderColor })}>
        Profile
      </NavLink>
    </div>
  );
}
