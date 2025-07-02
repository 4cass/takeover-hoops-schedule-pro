
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { DashboardStats } from "@/components/DashboardStats";
import { CalendarManager } from "@/components/CalendarManager";
import { SessionsManager } from "@/components/SessionsManager";
import { AttendanceManager } from "@/components/AttendanceManager";
import { StudentsManager } from "@/components/StudentsManager";
import { CoachesManager } from "@/components/CoachesManager";
import { BranchesManager } from "@/components/BranchesManager";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to login if no role is found
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Derive active tab from current URL
  const path = location.pathname;
  const activeTab = 
    path.includes("/dashboard/calendar") ? "calendar" :
    path.includes("/dashboard/sessions") ? "sessions" :
    path.includes("/dashboard/attendance") ? "attendance" :
    path.includes("/dashboard/students") ? "students" :
    path.includes("/dashboard/coaches") ? "coaches" :
    path.includes("/dashboard/branches") ? "branches" :
    "overview";

  // Function to check if route is allowed for current role
  const isRouteAllowed = (routePath: string) => {
    const adminOnlyRoutes = ['/dashboard/sessions', '/dashboard/students', '/dashboard/coaches', '/dashboard/branches'];
    
    if (role === 'admin') return true;
    if (role === 'coach' && adminOnlyRoutes.some(route => routePath.includes(route))) {
      return false;
    }
    return true;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/dashboard/${tab === "overview" ? "" : tab}`)} />
        <SidebarInset>
          <header className="sticky top-0 z-50 bg-white flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="text-black hover:text-accent hover:bg-muted" />
          </header>
          <main className="flex-1 p-6 bg-white">
            <Routes>
              <Route path="/" element={<DashboardStats />} />
              
              {/* Routes available to both admin and coach */}
              <Route path="calendar" element={<CalendarManager />} />
              <Route path="attendance" element={<AttendanceManager />} />
              <Route path="attendance/:sessionId" element={<AttendanceManager />} />
              
              {/* Admin-only routes */}
              {role === 'admin' && (
                <>
                  <Route path="sessions" element={<SessionsManager />} />
                  <Route path="students" element={<StudentsManager />} />
                  <Route path="coaches" element={<CoachesManager />} />
                  <Route path="branches" element={<BranchesManager />} />
                </>
              )}
              
              {/* Redirect coaches trying to access admin-only routes */}
              {role === 'coach' && (
                <>
                  <Route path="sessions" element={<Navigate to="/dashboard" replace />} />
                  <Route path="students" element={<Navigate to="/dashboard" replace />} />
                  <Route path="coaches" element={<Navigate to="/dashboard" replace />} />
                  <Route path="branches" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
