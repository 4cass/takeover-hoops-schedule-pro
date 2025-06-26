
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentsManager } from "@/components/StudentsManager";
import { CoachesManager } from "@/components/CoachesManager";
import { BranchesManager } from "@/components/BranchesManager";
import { SessionsManager } from "@/components/SessionsManager";
import { AttendanceManager } from "@/components/AttendanceManager";
import { DashboardStats } from "@/components/DashboardStats";
import { AppSidebar } from "@/components/AppSidebar";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardStats />;
      case "sessions":
        return <SessionsManager />;
      case "attendance":
        return <AttendanceManager />;
      case "students":
        return <StudentsManager />;
      case "coaches":
        return <CoachesManager />;
      case "branches":
        return <BranchesManager />;
      case "reports":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>View detailed reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Reports functionality coming soon...</p>
            </CardContent>
          </Card>
        );
      default:
        return <DashboardStats />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 bg-[#000004] px-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="flex flex-1 items-center gap-2 px-3">
              <h1 className="text-xl font-bold text-white">
                {activeTab === "overview" ? "Dashboard Overview" : 
                 activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-6 bg-white">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
