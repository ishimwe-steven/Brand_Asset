import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (
    user.role === "designer" &&
    user.must_change_password &&
    window.location.pathname !== "/dashboard/change-password"
  ) {
    return <Navigate to="/dashboard/change-password" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
