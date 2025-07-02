
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

type Session = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  branches: { name: string };
  session_participants: { students: { name: string } }[];
};

export function CoachCalendarManager() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { user } = useAuth();

  const { data: coachId } = useQuery({
    queryKey: ["coach-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      return coach?.id;
    },
    enabled: !!user?.id,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["coach-sessions", coachId],
    queryFn: async () => {
      if (!coachId) return [];
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          branches (name),
          session_participants (students (name))
        `)
        .eq("coach_id", coachId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!coachId,
  });

  const selectedDateSessions = sessions.filter(
    (session) => selectedDate && session.date === format(selectedDate, "yyyy-MM-dd")
  );

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-green-50 text-green-700 border-green-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-black mb-3">Loading your calendar...</h3>
          <p className="text-lg text-gray-600">Please wait while we fetch your sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Your Calendar</h1>
          <p className="text-lg text-gray-700">View and manage your training sessions</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Calendar */}
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-black bg-black">
              <CardTitle className="text-2xl font-bold text-white flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3 text-accent" />
                Session Calendar
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Select a date to view your sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border-2 border-accent/20"
              />
            </CardContent>
          </Card>

          {/* Sessions for Selected Date */}
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-accent/10 bg-accent/5">
              <CardTitle className="text-2xl font-bold text-black flex items-center">
                <Clock className="h-6 w-6 mr-3 text-accent" />
                Sessions for {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select a date"}
              </CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Your scheduled sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {selectedDateSessions.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateSessions.map((session) => (
                    <div key={session.id} className="border-2 border-accent/20 rounded-xl p-4 bg-gradient-to-r from-white to-accent/5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-accent" />
                          <span className="font-bold text-black text-lg">
                            {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                          </span>
                        </div>
                        <Badge className={`${getStatusColor(session.status)} border capitalize font-medium`}>
                          {session.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-700 font-medium">{session.branches.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-700">
                            {session.session_participants.length > 0
                              ? session.session_participants.map(p => p.students.name).join(", ")
                              : "No participants"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions scheduled</h3>
                  <p className="text-gray-600">
                    {selectedDate ? "No sessions on this date." : "Select a date to view sessions."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
