
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function DashboardStats() {
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

  const statCards = [
    {
      title: "Total Students",
      value: stats?.students || 0,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Coaches",
      value: stats?.coaches || 0,
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      title: "Branches",
      value: stats?.branches || 0,
      icon: MapPin,
      color: "text-purple-600"
    },
    {
      title: "Scheduled Sessions",
      value: stats?.sessions || 0,
      icon: Calendar,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <IconComponent className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
