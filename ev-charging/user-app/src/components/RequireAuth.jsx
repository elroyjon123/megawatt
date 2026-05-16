import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const loc = useLocation();
  const authed = Boolean(localStorage.getItem("accessToken"));
  if (!authed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}
