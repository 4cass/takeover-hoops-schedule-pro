
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, TrendingUp, Eye, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function CoachDashboardStats() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: coachStats } = useQuery({
    queryKey: ["coach-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get coach record
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!coach) return null;

      // Get students count
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("coach_id", coach.id);

      // Get upcoming sessions
      const { data: upcomingSessions } = await supabase
        .from("training_sessions")
        .select("*, branches(name)")
        .eq("coach_id", coach.id)
        .eq("status", "scheduled")
        .gte("date", new Date().toISOString().split('T')[0])
        .order("date", { ascending: true })
        .limit(5);

      // Get completed sessions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: completedSessions } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("coach_id", coach.id)
        .eq("status", "completed")
        .gte("date", startOfMonth.toISOString().split('T')[0]);

      return {
        studentsCount: students?.length || 0,
        upcomingSessionsCount: upcomingSessions?.length || 0,
        completedSessionsThisMonth: completedSessions?.length || 0,
        upcomingSessions: upcomingSessions || []
      };
    },
    enabled: !!user?.id,
  });

  if (!coachStats) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <h3 className="text-2xl font-bold text-black mb-3">Loading your dashboard...</h3>
          <p className="text-lg text-gray-600">Please wait while we fetch your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Coach Dashboard</h1>
          <p className="text-lg text-gray-700">Welcome back! Here's your training overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Your Students</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{coachStats.studentsCount}</div>
              <p className="text-xs text-gray-600 mt-1">Active players under your coaching</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Upcoming Sessions</CardTitle>
              <Calendar className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{coachStats.upcomingSessionsCount}</div>
              <p className="text-xs text-gray-600 mt-1">Scheduled training sessions</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">This Month</CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{coachStats.completedSessionsThisMonth}</div>
              <p className="text-xs text-gray-600 mt-1">Completed sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <Card className="border-2 border-black bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black flex items-center">
              <Clock className="h-6 w-6 mr-3 text-accent" />
              Your Upcoming Sessions
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your next scheduled training sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coachStats.upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {coachStats.upcomingSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-accent" />
                        <span className="font-semibold text-black">
                          {new Date(session.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-700">
                          {new Date(`1970-01-01T${session.start_time}`).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{session.branches.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming sessions</h3>
                <p className="text-gray-600">Check your calendar for future sessions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-2 border-black bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Commonly used features for coaches
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={() => navigate('/dashboard/calendar')}
              className="bg-accent hover:bg-accent/90 text-white h-16 text-lg font-semibold"
            >
              <Eye className="w-5 h-5 mr-2" />
              View Calendar
            </Button>
            <Button
              onClick={() => navigate('/dashboard/attendance')}
              className="bg-accent hover:bg-accent/90 text-white h-16 text-lg font-semibold"
            >
              <UserCheck className="w-5 h-5 mr-2" />
              Manage Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
