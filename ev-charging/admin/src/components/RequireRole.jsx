import { Navigate } from "react-router-dom";

/**
 * Simple client-side route guard.
 *
 * IMPORTANT: Backend remains the source of truth. This only improves UX and
 * prevents operators from seeing pages they don't have access to.
 */
export default function RequireRole({ user, allowed = [], children }) {
  if (!user) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm text-sm text-slate-700">
        Loading user…
      </div>
    );
  }

  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
