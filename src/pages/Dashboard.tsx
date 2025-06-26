
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, MapPin, UserCheck, BookOpen, ClipboardList } from "lucide-react";
import { StudentsManager } from "@/components/StudentsManager";
import { CoachesManager } from "@/components/CoachesManager";
import { BranchesManager } from "@/components/BranchesManager";
import { SessionsManager } from "@/components/SessionsManager";
import { AttendanceManager } from "@/components/AttendanceManager";
import { DashboardStats } from "@/components/DashboardStats";

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Takeover Basketball Management</h1>
        <p className="text-gray-600 mt-2">Manage training sessions, attendance, and administrative tasks</p>
      </div>

      <DashboardStats />

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="coaches" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Coaches
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <SessionsManager />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceManager />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentsManager />
        </TabsContent>

        <TabsContent value="coaches" className="space-y-4">
          <CoachesManager />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <BranchesManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>View detailed reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Reports functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
