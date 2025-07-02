
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { DashboardStats } from "@/components/DashboardStats";
import { CalendarManager } from "@/components/CalendarManager";
import { CoachCalendarManager } from "@/components/CoachCalendarManager";
import { SessionsManager } from "@/components/SessionsManager";
import { AttendanceManager } from "@/components/AttendanceManager";
import { CoachAttendanceManager } from "@/components/CoachAttendanceManager";
import { StudentsManager } from "@/components/StudentsManager";
import { CoachesManager } from "@/components/CoachesManager";
import { BranchesManager } from "@/components/BranchesManager";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, loading } = useAuth();

  console.log("Dashboard - Role:", role, "Loading:", loading, "Path:", location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-2xl font-bold text-black mb-2">Loading Dashboard...</div>
          <div className="text-lg text-gray-600">Please wait while we verify your access.</div>
        </div>
      </div>
    );
  }

  // Redirect to login if no role is found
  if (!role) {
    console.log("No role found, redirecting to login");
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
              
              {/* Calendar routes - role-specific components */}
              <Route 
                path="calendar" 
                element={role === 'coach' ? <CoachCalendarManager /> : <CalendarManager />} 
              />
              
              {/* Attendance routes - role-specific components */}
              <Route 
                path="attendance" 
                element={role === 'coach' ? <CoachAttendanceManager /> : <AttendanceManager />} 
              />
              <Route 
                path="attendance/:sessionId" 
                element={role === 'coach' ? <CoachAttendanceManager /> : <AttendanceManager />} 
              />
              
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
