import { useNavigate, useLocation } from "react-router-dom";
import { Plug, Search, Zap, Inbox, User, QrCode } from "lucide-react";

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const Item = ({ label, path, center, icon }) => (
    <div
      onClick={() => navigate(path)}
      style={{
        flex: 1,
        textAlign: "center",
        padding: center ? "0" : "8px 0",
        fontSize: 12,
        color: pathname === path ? "#000" : "#666",
        cursor: "pointer",
      }}
    >
      {center ? (
        <div
          style={{
            background: "#FFC107",
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "-28px auto 0",
          }}
        >
          <QrCode size={24} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {icon}
          <span>{label}</span>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "#fff",
        borderTop: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <Item label="Stations" path="/stations" icon={<Plug size={18} />} />
      <Item label="Search" path="/search" icon={<Search size={18} />} />
      <Item center path="/charge" />
      <Item label="Inbox" path="/messages" icon={<Inbox size={18} />} />
      <Item label="Profile" path="/profile" icon={<User size={18} />} />
    </div>
  );
}