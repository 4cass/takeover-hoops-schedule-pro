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

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/dashboard/${tab === "overview" ? "" : tab}`)} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 bg-[#272828] px-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="flex flex-1 items-center gap-2 px-3">
              <h1 className="text-xl font-bold text-white">
                {activeTab === "overview" ? "Dashboard Overview" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-6 bg-white">
            <Routes>
              <Route path="/" element={<DashboardStats />} />
              <Route path="calendar" element={<CalendarManager />} />
              <Route path="sessions" element={<SessionsManager />} />
              <Route path="attendance" element={<AttendanceManager />} />
              <Route path="attendance/:sessionId" element={<AttendanceManager />} />
              <Route path="students" element={<StudentsManager />} />
              <Route path="coaches" element={<CoachesManager />} />
              <Route path="branches" element={<BranchesManager />} />
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
