import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  allowedRoles: ('admin' | 'coach')[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/index" replace />;
  }

  return <Outlet />;
}