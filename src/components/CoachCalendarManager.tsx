
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Eye, ChevronLeft, ChevronRight, CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format, isSameDay, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Session = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  branches: { name: string };
  session_participants: { students: { name: string } }[];
};

type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "pending";
  marked_at: string | null;
  students: { name: string };
};

type AttendanceStatus = "present" | "absent" | "pending";

const attendanceStatuses = ["present", "absent", "pending"] as const;

export function CoachCalendarManager() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showUpcomingSessions, setShowUpcomingSessions] = useState(false);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { coachData, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  console.log("CoachCalendarManager - Coach data:", coachData, "Loading:", loading);

  const { data: sessions = [], isLoading: sessionsLoading, error } = useQuery({
    queryKey: ["coach-sessions", coachData?.id],
    queryFn: async () => {
      console.log("Fetching sessions for coach ID:", coachData?.id);
      if (!coachData?.id) {
        console.log("No coach ID available");
        return [];
      }
      
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
        .eq("coach_id", coachData.id)
        .order("date", { ascending: true });
      
      if (error) {
        console.error("Error fetching sessions:", error);
        throw error;
      }
      
      console.log("Fetched sessions:", data);
      return data as Session[];
    },
    enabled: !!coachData?.id && !loading,
  });

  const { data: attendanceRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", selectedSessionForAttendance],
    queryFn: async () => {
      if (!selectedSessionForAttendance) return [];
      console.log("Fetching attendance for session:", selectedSessionForAttendance);
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_at, students (name)")
        .eq("session_id", selectedSessionForAttendance)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching attendance:", error);
        throw error;
      }
      
      console.log("Fetched attendance records:", data);
      return data || [];
    },
    enabled: !!selectedSessionForAttendance,
  });

  const updateAttendance = useMutation<void, unknown, { recordId: string; status: AttendanceStatus }>({
    mutationFn: async ({ recordId, status }) => {
      console.log("Updating attendance:", recordId, status);
      const { error } = await supabase
        .from("attendance_records")
        .update({ status, marked_at: status !== "pending" ? new Date().toISOString() : null })
        .eq("id", recordId);
      if (error) {
        console.error("Error updating attendance:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Attendance updated");
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedSessionForAttendance] });
    },
    onError: (error) => {
      console.error("Attendance update failed:", error);
      toast.error("Failed to update attendance");
    },
  });

  const selectedDateSessions = selectedDate
    ? sessions.filter((session) => {
        const sessionDate = parseISO(session.date);
        const isMatch = isSameDay(sessionDate, selectedDate);
        console.log("Comparing session date:", session.date, "with selected date:", format(selectedDate, "yyyy-MM-dd"), "Match:", isMatch);
        return isMatch;
      })
    : [];

  console.log("Selected date:", selectedDate);
  console.log("Selected date sessions:", selectedDateSessions);

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting datetime:", error);
      return new Date(dateString).toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getAttendanceIcon = (status: AttendanceStatus) => {
    switch (status) {
      case "present": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "absent": return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending": return <Clock className="w-4 h-4 text-amber-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAttendanceBadgeColor = (status: AttendanceStatus) => {
    switch (status) {
      case "present": return "bg-green-50 text-green-700 border-green-200";
      case "absent": return "bg-red-50 text-red-700 border-red-200";
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const today = new Date();
  const todayDateOnly = new Date(format(today, "yyyy-MM-dd") + "T00:00:00");

  const upcomingSessions = sessions.filter(session => {
    const sessionDate = parseISO(session.date);
    return (isAfter(sessionDate, todayDateOnly) || isSameDay(sessionDate, todayDateOnly)) &&
           session.status !== 'cancelled' && session.status !== 'completed';
  }) || [];

  const pastSessions = sessions.filter(session => {
    const sessionDate = parseISO(session.date);
    return session.status === 'completed' || isBefore(sessionDate, todayDateOnly);
  }) || [];

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handleDateSelect = (date: Date) => {
    console.log("Date selected:", date);
    setSelectedDate(date);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleAttendanceRedirect = (sessionId: string) => {
    setSelectedSessionForAttendance(sessionId);
  };

  const handleAttendanceChange = (recordId: string, status: AttendanceStatus) => {
    updateAttendance.mutate({ recordId, status });
  };

  const filteredAttendanceRecords = attendanceRecords?.filter((record) =>
    record.students.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const presentCount = filteredAttendanceRecords.filter((r) => r.status === "present").length;
  const absentCount = filteredAttendanceRecords.filter((r) => r.status === "absent").length;
  const pendingCount = filteredAttendanceRecords.filter((r) => r.status === "pending").length;

  if (loading || sessionsLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <CalendarIcon className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-black mb-3">Error loading calendar</h3>
          <p className="text-lg text-gray-600">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            Your Calendar
          </h1>
          <p className="text-lg text-gray-700">
            View and manage your training sessions
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar - Left Side */}
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-black bg-black">
              <CardTitle className="text-2xl font-bold text-white flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3 text-accent" />
                Session Calendar
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Click on any date to view session details for {format(currentMonth, 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-lg">
                {/* Calendar Navigation */}
                <div className="flex justify-between items-center mb-6">
                  <Button
                    onClick={handlePrevMonth}
                    variant="outline"
                    size="sm"
                    className="border-accent/30 text-accent hover:bg-accent hover:text-white transition-all duration-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-2xl font-bold text-black">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <Button
                    onClick={handleNextMonth}
                    variant="outline"
                    size="sm"
                    className="border-accent/30 text-accent hover:bg-accent hover:text-white transition-all duration-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center py-3 bg-black text-white font-semibold rounded-lg text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {daysInMonth.map(day => {
                    const daySessions = sessions.filter(session => isSameDay(parseISO(session.date), day)) || [];
                    const hasScheduled = daySessions.some(s => s.status === 'scheduled');
                    const hasCompleted = daySessions.some(s => s.status === 'completed');
                    const hasCancelled = daySessions.some(s => s.status === 'cancelled');
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <button
                        key={day.toString()}
                        onClick={() => handleDateSelect(day)}
                        className={`
                          relative p-3 h-20 rounded-xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg
                          ${isSelected 
                            ? 'bg-gradient-to-br from-accent to-accent/80 text-white shadow-lg scale-105' 
                            : isToday
                              ? 'bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent text-black'
                              : daySessions.length > 0
                                ? 'bg-gradient-to-br from-gray-50 to-white border border-accent/30 text-black hover:border-accent'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="font-semibold text-lg mb-1">
                          {format(day, 'd')}
                        </div>
                        {daySessions.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs opacity-90">
                              {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex space-x-1">
                              {hasScheduled && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                              {hasCompleted && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                              {hasCancelled && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Cancelled</span>
                  </div>
                </div>
              </div>

              {/* Session Action Buttons */}
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {/* Upcoming Sessions Button */}
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg">
                  <CardHeader className="border-b border-green-200 bg-gradient-to-r from-green-100/50 to-green-50 p-4">
                    <CardTitle className="text-lg font-bold text-green-800 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-green-600" />
                      Upcoming Sessions
                    </CardTitle>
                    <CardDescription className="text-green-600 text-sm">
                      {upcomingSessions.length} upcoming session{upcomingSessions.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 text-center">
                    <Button
                      onClick={() => setShowUpcomingSessions(true)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full"
                    >
                      View {upcomingSessions.length} Upcoming
                    </Button>
                  </CardContent>
                </Card>

                {/* Past Sessions Button */}
                <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-lg">
                  <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-100/50 to-gray-50 p-4">
                    <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
                      Past Sessions
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      {pastSessions.length} past session{pastSessions.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 text-center">
                    <Button
                      onClick={() => setShowPastSessions(true)}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full"
                    >
                      View {pastSessions.length} Past
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Sessions - Right Side */}
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-accent/10 bg-accent/5">
              <CardTitle className="text-2xl font-bold text-black flex items-center">
                <Eye className="h-6 w-6 mr-3 text-accent" />
                {selectedDate ? `Sessions on ${format(selectedDate, 'EEEE, MMMM dd, yyyy')}` : 'Select a Date'}
              </CardTitle>
              <CardDescription className="text-gray-600 text-base">
                {selectedDate ? 'View session details for the selected date' : 'Click on a date in the calendar to view sessions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {selectedDateSessions.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateSessions.map(session => (
                    <Card key={session.id} className="border border-accent/20 bg-gradient-to-r from-accent/5 to-white hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="grid md:grid-cols-3 gap-4 items-center">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-accent" />
                              <div>
                                <p className="text-sm font-medium text-gray-600">Time</p>
                                <p className="font-semibold text-black">
                                  {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-accent" />
                              <div>
                                <p className="text-sm font-medium text-gray-600">Branch</p>
                                <p className="font-semibold text-black">{session.branches.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(session.status)} font-medium px-3 py-1`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-accent" />
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Players ({session.session_participants?.length || 0}):</p>
                              <div className="space-y-1">
                                {session.session_participants?.length > 0 ? (
                                  session.session_participants.map((participant, idx) => (
                                    <div key={idx} className="text-sm text-black font-medium">
                                      {participant.students.name}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">No players assigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleAttendanceRedirect(session.id)}
                              className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/80 hover:to-accent text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                            >
                              Manage Attendance
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : selectedDate ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    No sessions on this day
                  </p>
                  <p className="text-gray-400">
                    No sessions scheduled for this date.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    Select a date
                  </p>
                  <p className="text-gray-400">
                    Click on a date in the calendar to view sessions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Date Selection Modal */}
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-5xl max-h-[80vh] border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-white shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-black flex items-center">
                <Eye className="h-6 w-6 mr-3 text-accent" />
                Sessions on {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : ''}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                View and manage session details for the selected date
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedDateSessions.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateSessions.map(session => (
                    <Card key={session.id} className="border border-accent/20 bg-gradient-to-r from-accent/5 to-white hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="grid md:grid-cols-3 gap-4 items-center">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-accent" />
                              <div>
                                <p className="text-sm font-medium text-gray-600">Time</p>
                                <p className="font-semibold text-black">
                                  {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-accent" />
                              <div>
                                <p className="text-sm font-medium text-gray-600">Branch</p>
                                <p className="font-semibold text-black">{session.branches.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(session.status)} font-medium px-3 py-1`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-accent" />
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Players ({session.session_participants?.length || 0}):</p>
                              <div className="space-y-1">
                                {session.session_participants?.length > 0 ? (
                                  session.session_participants.map((participant, idx) => (
                                    <div key={idx} className="text-sm text-black font-medium">
                                      {participant.students.name}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">No players assigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleAttendanceRedirect(session.id)}
                              className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/80 hover:to-accent text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                            >
                              Manage Attendance
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    No sessions on this day
                  </p>
                  <p className="text-gray-400">
                    No sessions scheduled for this date.
                  </p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Attendance Management Modal */}
        <Dialog open={!!selectedSessionForAttendance} onOpenChange={() => setSelectedSessionForAttendance(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] border-2 border-black bg-white shadow-xl">
            <DialogHeader className="border-b border-accent/10 bg-accent/5 p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-black flex items-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-accent" />
                    Attendance Management
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 text-sm sm:text-base">
                    Manage player attendance for this session
                  </DialogDescription>
                </div>
                
                {/* Stats */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium">Present: {presentCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium">Absent: {absentCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium">Pending: {pendingCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
              {/* Search for Attendance Records */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-accent mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold text-black">Filter Players</h3>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border-2 border-black rounded-2xl bg-white shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-sm sm:text-base">Player Name</th>
                        <th className="py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-sm sm:text-base">Status</th>
                        <th className="py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-sm sm:text-base">Marked At</th>
                        <th className="py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-sm sm:text-base">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceRecords.map((record, index) => (
                        <tr 
                          key={record.id} 
                          className={`transition-all duration-300 hover:bg-accent/5 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm">
                                {record.students.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <span className="font-semibold text-black text-sm sm:text-base">{record.students.name}</span>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="flex items-center space-x-2">
                              {getAttendanceIcon(record.status)}
                              <Badge className={`${getAttendanceBadgeColor(record.status)} border capitalize font-medium text-xs sm:text-sm`}>
                                {record.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-600 text-sm">
                            {record.marked_at ? (
                              <span className="font-medium">{formatDateTime(record.marked_at)}</span>
                            ) : (
                              <span className="italic text-gray-400">Not marked</span>
                            )}
                          </td>
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                              {attendanceStatuses.map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={record.status === status ? "default" : "outline"}
                                  onClick={() => handleAttendanceChange(record.id, status)}
                                  className={`transition-all duration-300 hover:scale-105 text-xs sm:text-sm ${
                                    record.status === status
                                      ? status === "present"
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : status === "absent"
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : "bg-amber-600 hover:bg-amber-700 text-white"
                                      : "border-accent/30 text-accent hover:bg-accent hover:text-white"
                                  }`}
                                >
                                  {getAttendanceIcon(status)}
                                  <span className="ml-1 capitalize hidden sm:inline">{status}</span>
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredAttendanceRecords.length === 0 && (
                  <div className="py-8 sm:py-12 text-center">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm ? 'No players found' : 'No attendance records'}
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {searchTerm 
                        ? 'Try adjusting your search terms.' 
                        : 'No attendance records found for this session.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upcoming Sessions Modal */}
        <Dialog open={showUpcomingSessions} onOpenChange={setShowUpcomingSessions}>
          <DialogContent className="max-w-6xl max-h-[80vh] border-2 border-green-200 bg-gradient-to-br from-green-50/30 to-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-green-800 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-green-600" />
                Upcoming Sessions ({upcomingSessions.length})
              </DialogTitle>
              <DialogDescription className="text-green-600 text-base">
                All scheduled sessions for today and future dates
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <Card key={session.id} className="border border-green-200 bg-gradient-to-r from-green-50/50 to-white hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="text-sm font-medium text-green-600">Date</p>
                            <p className="font-semibold text-black">{format(parseISO(session.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600">Time</p>
                            <p className="font-semibold text-black">
                              {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600">Branch</p>
                            <p className="font-semibold text-black">{session.branches.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600">Players</p>
                            <p className="font-semibold text-black">{session.session_participants?.length || 0}</p>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => {
                                setShowUpcomingSessions(false);
                                handleAttendanceRedirect(session.id);
                              }}
                              size="sm"
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                            >
                              Manage Attendance
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-green-300 mx-auto mb-4" />
                  <p className="text-lg text-green-600 mb-2">No upcoming sessions</p>
                  <p className="text-green-500 text-sm">Schedule new training sessions to get started.</p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Past Sessions Modal */}
        <Dialog open={showPastSessions} onOpenChange={setShowPastSessions}>
          <DialogContent className="max-w-6xl max-h-[80vh] border-2 border-gray-200 bg-gradient-to-br from-gray-50/30 to-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3 text-gray-600" />
                Past Sessions ({pastSessions.length})
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                All completed sessions and sessions before today
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {pastSessions.length > 0 ? (
                <div className="space-y-4">
                  {pastSessions.map((session) => (
                    <Card key={session.id} className="border border-gray-200 bg-gradient-to-r from-gray-50/50 to-white hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Date</p>
                            <p className="font-semibold text-black">{format(parseISO(session.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Time</p>
                            <p className="font-semibold text-black">
                              {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Branch</p>
                            <p className="font-semibold text-black">{session.branches.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Players</p>
                            <p className="font-semibold text-black">{session.session_participants?.length || 0}</p>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => {
                                setShowPastSessions(false);
                                handleAttendanceRedirect(session.id);
                              }}
                              size="sm"
                              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500 mb-2">No past sessions</p>
                  <p className="text-gray-400 text-sm">Completed sessions will appear here.</p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
