
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
import { useEffect } from "react";

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="min-h-screen bg-white flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/dashboard/${tab === "overview" ? "" : tab}`)} />
        <SidebarInset>
          <header className="sticky top-0 z-50 bg-white flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="text-black hover:text-accent hover:bg-muted" />
          </header>
          <main className="flex-1 p-6 bg-white">
            <Routes>
              <Route path="/" element={<DashboardStats />} />
              <Route path="calendar" element={<CalendarManager />} />
              <Route element={<ProtectedRoute allowedRoles={['admin']} restrictedForCoaches={true} />}>
                <Route path="sessions" element={<SessionsManager />} />
                <Route path="students" element={<StudentsManager />} />
                <Route path="coaches" element={<CoachesManager />} />
                <Route path="branches" element={<BranchesManager />} />
              </Route>
              <Route path="attendance" element={<AttendanceManager />} />
              <Route path="attendance/:sessionId" element={<AttendanceManager />} />
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
