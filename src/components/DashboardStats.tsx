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
      color: "text-blue-600",
      gradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
    },
    {
      title: "Active Coaches",
      value: stats?.coaches || 0,
      icon: BookOpen,
      color: "text-green-600",
      gradient: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
    },
    {
      title: "Branches",
      value: stats?.branches || 0,
      icon: MapPin,
      color: "text-purple-600",
      gradient: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
    },
    {
      title: "Scheduled Sessions",
      value: stats?.sessions || 0,
      icon: Calendar,
      color: "text-orange-600",
      gradient: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card 
            key={index}
            className={`shadow-lg border-none bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">{stat.title}</CardTitle>
              <IconComponent className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}