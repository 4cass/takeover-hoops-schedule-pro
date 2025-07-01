
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  allowedRoles: ('admin' | 'coach')[];
  restrictedForCoach?: boolean; // New prop to restrict certain pages for coaches
};

export function ProtectedRoute({ allowedRoles, restrictedForCoach = false }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/index" replace />;
  }

  // If this is a restricted page for coaches and user is a coach, redirect
  if (restrictedForCoach && role === 'coach') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
