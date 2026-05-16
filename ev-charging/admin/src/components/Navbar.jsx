import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getTheme, setTheme } from "../lib/theme";
import logo from "../assets/megawatt-logo.png";

export default function Navbar({ user, onLogout, toggleSidebar }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return getTheme();
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      applyTheme(theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      setTheme(next);
    } finally {
      setThemeState(next);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800/70 dark:bg-slate-950/60">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            aria-label="Toggle sidebar"
          >
            <span className="text-lg">≡</span>
          </button>
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Megawatt"
              className="h-8 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Megawatt Admin</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {user?.name || "Admin"}{user?.role ? ` • ${user.role}` : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
