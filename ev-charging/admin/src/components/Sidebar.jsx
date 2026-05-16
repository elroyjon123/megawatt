import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  PlugZap,
  Users,
  Car,
  Receipt,
  Activity,
  Ticket,
  MessageSquare,
  Bell,
  Settings,
} from "lucide-react";
import logo from "../assets/megawatt-logo.png";

export default function Sidebar({ isOpen, user, onClose }) {
  const location = useLocation();
  const role = user?.role || "ADMIN";
  const canSee = {
    dashboard: role === "ADMIN" || role === "OPERATOR",
    stations: role === "ADMIN" || role === "OPERATOR",
    chargers: role === "ADMIN" || role === "OPERATOR",
    sessions: role === "ADMIN" || role === "OPERATOR",
    users: role === "ADMIN",
    vehicles: role === "ADMIN",
    transactions: role === "ADMIN",
    vouchers: role === "ADMIN",
    messages: role === "ADMIN",
    settings: role === "ADMIN",
    alerts: role === "ADMIN" || role === "OPERATOR",
  };

  return (
    <aside
      className={
        "fixed inset-y-0 left-0 z-40 sm:static sm:z-auto " +
        "border-r border-slate-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 " +
        "dark:border-slate-800/70 dark:bg-slate-950/60 " +
        "transition-all duration-200 " +
        (isOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full sm:w-16 sm:translate-x-0")
      }
    >
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Megawatt"
            className="h-10 w-10 object-contain rounded-lg"
          />
          {isOpen && (
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Megawatt</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">EV Charging</div>
            </div>
          )}

          {/* Mobile close button */}
          {isOpen && (
            <button
              type="button"
              className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
              aria-label="Close sidebar"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <nav className="space-y-1 px-3 pb-4">
        {isOpen && (
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Menu
          </div>
        )}

        {/** helper */}
        {(() => {
          const item = (to, label, Icon) => {
            const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link
                to={to}
                className={
                  "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900/60")
                }
                title={label}
              >
                {active && <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-emerald-500" />}
                <span
                  className={
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg " +
                    (active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300")
                  }
                >
                  {Icon ? <Icon size={18} /> : "•"}
                </span>
                {isOpen && <span className="truncate">{label}</span>}
              </Link>
            );
          };

          return (
            <>
        {canSee.dashboard && <>{item("/", "Dashboard", LayoutDashboard)}</>}
        {canSee.stations && <>{item("/stations", "Stations", MapPin)}</>}
        {canSee.chargers && <>{item("/chargers", "Chargers", PlugZap)}</>}
        {canSee.users && <>{item("/users", "Users", Users)}</>}
        {canSee.vehicles && <>{item("/vehicles", "Vehicles", Car)}</>}
        {canSee.transactions && <>{item("/transactions", "Transactions", Receipt)}</>}
        {canSee.sessions && <>{item("/sessions", "Sessions", Activity)}</>}
        {canSee.alerts && <>{item("/alerts", "CPO Alerts", Bell)}</>}
        {canSee.vouchers && <>{item("/vouchers", "Vouchers", Ticket)}</>}
        {canSee.messages && (
          <>
            {item("/messages", "Compose Message", MessageSquare)}
            {item("/messages/sent", "Sent Messages", MessageSquare)}
            {item("/messages/deliveries", "Message Deliveries", MessageSquare)}
          </>
        )}
        {canSee.settings && <>{item("/settings", "Settings", Settings)}</>}
            </>
          );
        })()}
      </nav>
    </aside>
  );
}
