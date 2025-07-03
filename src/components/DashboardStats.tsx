import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, MapPin, BookOpen, CheckCircle, AlertTriangle, Plus, Clock, TrendingUp, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { CoachDashboardStats } from "./CoachDashboardStats";

type RecentActivity = {
  id: string;
  type: string;
  description: string;
  created_at: string;
};

type StudentAlert = {
  id: string;
  name: string;
  remaining_sessions: number;
};

export function DashboardStats() {
  const navigate = useNavigate();
  const { role } = useAuth();

  // If user is a coach, show coach-specific dashboard
  if (role === 'coach') {
    return <CoachDashboardStats />;
  }

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, coachesRes, branchesRes, sessionsRes] = await Promise.all([
        supabase.from('students').select('id'),
        supabase.from('coaches').select('id'),
        supabase.from('branches').select('id'),
        supabase.from('training_sessions').select('id').eq('status', 'scheduled')
      ]);

      return {
        students: studentsRes.data?.length || 0,
        coaches: coachesRes.data?.length || 0,
        branches: branchesRes.data?.length || 0,
        sessions: sessionsRes.data?.length || 0
      };
    }
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          branches (name),
          coaches (name),
          session_participants (count)
        `)
        .eq('status', 'scheduled')
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const [attendanceRes, sessionsRes, studentsRes] = await Promise.all([
        supabase
          .from('attendance_records')
          .select(`
            id,
            created_at,
            students (name),
            training_sessions (date)
          `)
          .eq('status', 'present')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('training_sessions')
          .select('id, created_at, coaches (name)')
          .eq('status', 'scheduled')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('students')
          .select('id, created_at, name')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const activities: RecentActivity[] = [
        ...(attendanceRes.data?.map(item => ({
          id: item.id,
          type: 'attendance',
          description: `${item.students.name} attended a session on ${format(new Date(item.training_sessions.date), 'MMM dd, yyyy')}`,
          created_at: item.created_at
        })) || []),
        ...(sessionsRes.data?.map(item => ({
          id: item.id,
          type: 'session',
          description: `New session scheduled by ${item.coaches.name}`,
          created_at: item.created_at
        })) || []),
        ...(studentsRes.data?.map(item => ({
          id: item.id,
          type: 'student',
          description: `New player ${item.name} added`,
          created_at: item.created_at
        })) || [])
      ];

      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    }
  });

  const { data: lowSessionAlerts } = useQuery({
    queryKey: ['low-session-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, remaining_sessions')
        .lte('remaining_sessions', 2)
        .gt('remaining_sessions', 0)
        .order('remaining_sessions', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data as StudentAlert[];
    }
  });

  const statCards = [
    {
      title: "Total Players",
      value: stats?.students || 0,
      icon: Users,
      color: "text-[#181A18]",
      bgColor: "bg-[#181A18]",
      borderColor: "border-black"
    },
    {
      title: "Active Coaches",
      value: stats?.coaches || 0,
      icon: BookOpen,
      color: "text-[#181A18]",
      bgColor: "bg-[#181A18]",
      borderColor: "border-black"
    },
    {
      title: "Branch Locations",
      value: stats?.branches || 0,
      icon: MapPin,
      color: "text-[#181A18]",
      bgColor: "bg-[#181A18]",
      borderColor: "border-black"
    },
    {
      title: "Scheduled Sessions",
      value: stats?.sessions || 0,
      icon: Calendar,
      color: "text-[#181A18]",
      bgColor: "bg-[#181A18]",
      borderColor: "border-black"
    }
  ];

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'session':
        return <Calendar className="h-5 w-5 text-[#fc7416]" />;
      case 'student':
        return <Users className="h-5 w-5 text-[#fe822d]" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-white pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
          
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            Takeover Basketball Dashboard
          </h1>
          <p className="text-lg text-gray-700">
            Welcome back! Here's your training center overview.
          </p>
        </div>

        {/* Stat Cards */}
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  {statCards.map((stat, index) => {
    const IconComponent = stat.icon;
    return (
      <Card 
        key={index} 
        className={`
          relative overflow-hidden border-2 ${stat.borderColor} ${stat.bgColor}
          backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 
          hover:-translate-y-1 hover:scale-105 cursor-pointer group
        `}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider">
            {stat.title}
          </CardTitle>
          <div className={`
            p-2 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform duration-300
          `}>
            <IconComponent className={`h-5 w-5 ${stat.color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
          <div className="flex items-center text-xs text-gray-400">
            <TrendingUp className="h-3 w-3 mr-1" />
            Active
          </div>
        </CardContent>
      </Card>
    );
  })}
</div>

        {/* Quick Actions */}
        <Card className="border-2 border-black bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="border-b border-black bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
            <CardTitle className="text-2xl font-bold text-black flex items-center">
              <Plus className="h-6 w-6 mr-3 text-[#fc7416]" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Streamline your basketball training management
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Schedule Session", icon: Calendar, route: "/dashboard/sessions" },
                { label: "Manage Players", icon: Users, route: "/dashboard/students" },
                { label: "Track Attendance", icon: CheckCircle, route: "/dashboard/attendance" },
                { label: "Manage Coaches", icon: BookOpen, route: "/dashboard/coaches" },
                { label: "Manage Branches", icon: MapPin, route: "/dashboard/branches" }
              ].map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <Button 
                    key={index}
                    onClick={() => navigate(action.route)}
                    className="
                      h-auto p-4 bg-[#181A18] to-[#fe822d] 
                      hover:from-[#fe822d] hover:to-[#fc7416] text-white font-semibold
                      transition-all duration-300 hover:scale-105 hover:shadow-lg
                      flex flex-col items-center gap-2 border-none
                    "
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-sm text-center">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Upcoming Sessions */}
          <Card className="border-2 border-black bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-black flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-[#fc7416]" />
                    Upcoming Sessions
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Next scheduled training sessions
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard/calendar')}
                  className="border-[#fc7416] text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-colors"
                >
                  View Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingSessions && upcomingSessions.length > 0 ? (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5 border-b border-[#fc7416]/10">
                        <TableHead className="font-semibold text-black">Date & Time</TableHead>
                        <TableHead className="font-semibold text-black">Branch</TableHead>
                        <TableHead className="font-semibold text-black">Coach</TableHead>
                        <TableHead className="font-semibold text-black">Players</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingSessions.map((session, index) => (
                        <TableRow 
                          key={session.id} 
                          className={`
                            hover:bg-[#fc7416]/5 transition-colors border-b border-gray-100
                            ${index % 2 === 0 ? 'bg-[#faf0e8]/30' : 'bg-white'}
                          `}
                        >
                          <TableCell className="py-4">
                            <div className="font-semibold text-black">
                              {format(new Date(session.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-[#fc7416] font-medium">
                              {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.branches?.name}</TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.coaches?.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#fc7416]/10 text-[#fc7416]">
                              {session.session_participants?.[0]?.count || 0} players
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No upcoming sessions scheduled</p>
                  <p className="text-gray-400 text-sm mt-1">Schedule your first training session to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-2 border-black bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
              <CardTitle className="text-xl font-bold text-black flex items-center">
                <Activity className="h-5 w-5 mr-3 text-[#fc7416]" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Latest system updates and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={activity.id} 
                      className={`
                        flex items-start space-x-4 p-3 rounded-lg transition-colors
                        ${index % 2 === 0 ? 'bg-[#faf0e8]/30' : 'bg-white'}
                        hover:bg-[#fc7416]/5
                      `}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black leading-5">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No recent activity</p>
                  <p className="text-gray-400 text-sm mt-1">System activity will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Low Session Alerts */}
        {lowSessionAlerts && lowSessionAlerts.length > 0 && (
          <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
            <CardHeader className="border-b border-red-200 bg-gradient-to-r from-red-100/50 to-orange-100/50">
              <CardTitle className="text-xl font-bold text-red-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-3 text-red-600" />
                Session Alerts
              </CardTitle>
              <CardDescription className="text-red-600 mt-1">
                Students with low remaining sessions require attention
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lowSessionAlerts.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-red-200 shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">{student.name}</p>
                        <p className="text-sm text-red-600">
                          {student.remaining_sessions} session{student.remaining_sessions !== 1 ? 's' : ''} left
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/dashboard/students')}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all hover:scale-105"
                    >
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
