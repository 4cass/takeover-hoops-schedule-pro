
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation, Routes, Route, useNavigate } from "react-router-dom";
import { DashboardStats } from "@/components/DashboardStats";
import { CalendarManager } from "@/components/CalendarManager";
import { SessionsManager } from "@/components/SessionsManager";
import { AttendanceManager } from "@/components/AttendanceManager";
import { StudentsManager } from "@/components/StudentsManager";
import { CoachesManager } from "@/components/CoachesManager";
import { BranchesManager } from "@/components/BranchesManager";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
      <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] flex w-full">
        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => navigate(`/dashboard/${tab === "overview" ? "" : tab}`)}
          userRole={role} // Pass user role to sidebar
        />
        <SidebarInset>
          <header className="sticky top-0 z-50 bg-gradient-to-br from-[#faf0e8] to-[#fffefe] flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="text-black hover:text-black bg-orange/30" />
          </header>
          <main className="flex-1 p-6 bg-gradient-to-br from-[#faf0e8] to-[#fffefe]">
            <Routes>
              <Route path="/" element={<DashboardStats />} />
              <Route path="calendar" element={<CalendarManager />} />
              <Route path="sessions" element={<SessionsManager />} />
              <Route path="attendance" element={<AttendanceManager />} />
              <Route path="attendance/:sessionId" element={<AttendanceManager />} />
              <Route path="students" element={<StudentsManager />} />
              
              {/* Protected routes - Admin only */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="coaches" element={<CoachesManager />} />
                <Route path="branches" element={<BranchesManager />} />
              </Route>
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
