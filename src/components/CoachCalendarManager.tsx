
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format, isSameDay, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const { coachData, loading } = useAuth();
  const navigate = useNavigate();

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

  const selectedDateSessions = sessions.filter(
    (session) => selectedDate && session.date === format(selectedDate, "yyyy-MM-dd")
  );

  console.log("Selected date:", selectedDate);
  console.log("Selected date sessions:", selectedDateSessions);

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-[#fc7416]/10 text-[#fc7416] border-[#fc7416]/20";
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const today = new Date();
  const todayDateOnly = new Date(format(today, "yyyy-MM-dd") + "T00:00:00");

  const upcomingSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date + "T00:00:00");
    return (isAfter(sessionDate, todayDateOnly) || isSameDay(sessionDate, todayDateOnly)) &&
           session.status !== 'cancelled' && session.status !== 'completed';
  }) || [];

  const pastSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date + "T00:00:00");
    return session.status === 'completed' || isBefore(sessionDate, todayDateOnly);
  }) || [];

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handleDateSelect = (date: Date | undefined) => {
    console.log("Date selected:", date);
    setSelectedDate(date);
    if (date) {
      const dateSessions = sessions.filter(
        (session) => session.date === format(date, "yyyy-MM-dd")
      );
      console.log("Sessions for selected date:", dateSessions);
      setIsModalOpen(true);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleAttendanceClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsAttendanceModalOpen(true);
  };

  if (loading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">Loading your calendar...</h3>
          <p className="text-base sm:text-lg text-gray-600">Please wait while we fetch your sessions.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <CalendarIcon className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">Error loading calendar</h3>
          <p className="text-base sm:text-lg text-gray-600">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 -mt-5">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2 tracking-tight">
            Your Calendar
          </h1>
          <p className="text-base sm:text-lg text-gray-700">
            View and manage your training sessions
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid">
          {/* Calendar */}
          <Card className="border-2 border-black bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-black bg-black p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-[#fc7416]" />
                Session Calendar
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm sm:text-base">
                View and manage training sessions for {format(currentMonth, 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="border-2 border-black rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
                {/* Calendar Navigation */}
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <Button
                    onClick={handlePrevMonth}
                    variant="outline"
                    size="sm"
                    className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <Button
                    onClick={handleNextMonth}
                    variant="outline"
                    size="sm"
                    className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center py-2 sm:py-3 bg-black text-white font-semibold rounded-lg text-xs sm:text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {daysInMonth.map(day => {
                    const daySessions = sessions.filter(session => isSameDay(new Date(session.date), day)) || [];
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
                          relative p-2 sm:p-3 h-16 sm:h-20 rounded-xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg
                          ${isSelected 
                            ? 'bg-gradient-to-br from-[#fc7416] to-[#fe822d] text-white shadow-lg scale-105' 
                            : isToday
                              ? 'bg-gradient-to-br from-[#fc7416]/20 to-[#fe822d]/20 border-2 border-[#fc7416] text-black'
                              : daySessions.length > 0
                                ? 'bg-gradient-to-br from-[#faf0e8] to-white border border-[#fc7416]/30 text-black hover:border-[#fc7416]'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-[#faf0e8]/50'
                          }
                        `}
                      >
                        <div className="font-semibold text-sm sm:text-lg mb-1">
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
                <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-4 justify-center text-sm">
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
            </CardContent>
          </Card>

          {/* Sessions Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="bg-white border border-gray-200 shadow-xl max-w-[95vw] sm:max-w-4xl mx-auto p-0 rounded-lg max-h-[90vh] overflow-y-auto">
              
              {/* Clean Header */}
              <DialogHeader className="bg-black text-white px-4 sm:px-8 py-4 sm:py-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                      Sessions - {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "Select a date"}
                    </DialogTitle>
                    <p className="text-gray-300 text-sm sm:text-base">
                      {selectedDateSessions.length} session{selectedDateSessions.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                  
                  {/* Close Button (X) */}
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fc7416] rounded-lg flex items-center justify-center text-white text-xl sm:text-2xl font-bold hover:bg-[#e5661a] transition-colors"
                  >
                    ×
                  </button>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="p-4 sm:p-8">
                {selectedDateSessions.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    {selectedDateSessions.map((session, index) => (
                      <div 
                        key={session.id} 
                        className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:border-[#fc7416] hover:shadow-md transition-all duration-200"
                      >

                        {/* Session First Row: Training, Location, Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
                          
                          {/* Left Side: Session Info and Location */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                            
                            {/* Session Number and Time */}
                            <div className="flex items-center gap-4 mb-2 sm:mb-0">
                              <div className="w-8 h-8 bg-[#fc7416] rounded-full flex items-center justify-center text-white font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <h3 className="text-lg sm:text-xl font-bold text-black">
                                  {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                                </h3>
                                <p className="text-gray-600 text-sm sm:text-base">Training Session</p>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#fc7416]" />
                              <p className="font-bold text-black text-sm sm:text-base">{session.branches.name}</p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <Badge className={`${getStatusColor(session.status)} font-semibold px-4 py-2 capitalize rounded-full text-sm`}>
                            {session.status}
                          </Badge>
                        </div>

                        {/* Second Row: Players and Manage Attendance */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 pt-4">
                          
                          {/* Players */}
                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#fc7416]" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">
                                Players ({session.session_participants.length})
                              </p>
                              <div className="font-semibold text-black text-sm sm:text-base">
                                {session.session_participants.length > 0 ? (
                                  <div className="space-y-1">
                                    {session.session_participants.slice(0, 2).map((participant, idx) => (
                                      <div key={idx}>{participant.students.name}</div>
                                    ))}
                                    {session.session_participants.length > 2 && (
                                      <div className="text-gray-600 text-sm">
                                        +{session.session_participants.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No players assigned</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Manage Attendance Button */}
                          <Button
                            onClick={() => handleAttendanceClick(session.id)}
                            className="bg-[#fc7416] hover:bg-[#e5661a] text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
                          >
                            Manage Attendance
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Simple Empty State */
                  <div className="text-center py-12 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CalendarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-black mb-2">No sessions scheduled</h3>
                    <p className="text-gray-600 text-sm sm:text-base">No training sessions are scheduled for this date.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Attendance Management Modal */}
          <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
            <DialogContent className="bg-white border border-gray-200 shadow-xl max-w-[95vw] sm:max-w-4xl mx-auto p-0 rounded-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader className="bg-black text-white px-4 sm:px-8 py-4 sm:py-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                      Attendance Management
                    </DialogTitle>
                    <p className="text-gray-300 text-sm sm:text-base">
                      Manage player attendance for this session
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setIsAttendanceModalOpen(false)} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fc7416] rounded-lg flex items-center justify-center text-white text-xl sm:text-2xl font-bold hover:bg-[#e5661a] transition-colors"
                  >
                    ×
                  </button>
                </div>
              </DialogHeader>
              
              <div className="p-4 sm:p-8">
                <div className="text-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#fc7416] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Attendance Management</h3>
                  <p className="text-gray-600 text-sm sm:text-base mb-6">
                    This feature will be available soon. For now, use the main attendance page.
                  </p>
                  <Button
                    onClick={() => {
                      setIsAttendanceModalOpen(false);
                      navigate(`/dashboard/attendance/${selectedSessionId}`);
                    }}
                    className="bg-[#fc7416] hover:bg-[#e5661a] text-white font-semibold px-6 py-3 rounded-lg"
                  >
                    Go to Attendance Page
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          {/* Upcoming Sessions */}
          <Card className="border-2 border-black bg-gradient-to-br from-green-50 to-white shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-green-100/50 to-green-50 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-green-800 flex items-center">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-green-600" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription className="text-green-600 text-sm sm:text-base">
                Scheduled sessions for today or the future ({upcomingSessions.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingSessions.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-green-100 to-green-50 border-b border-black">
                          <TableHead className="font-semibold text-green-800 text-sm">Date & Time</TableHead>
                          <TableHead className="font-semibold text-green-800 text-sm">Branch</TableHead>
                          <TableHead className="font-semibold text-green-800 text-sm">Players</TableHead>
                          <TableHead className="font-semibold text-green-800 text-sm">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingSessions.map((session, index) => (
                          <TableRow 
                            key={session.id} 
                            className={`
                              hover:bg-green-50 transition-colors border-b border-green-100 cursor-pointer
                              ${index % 2 === 0 ? 'bg-white' : 'bg-green-25'}
                            `}
                            onClick={() => handleAttendanceClick(session.id)}
                          >
                            <TableCell className="py-4">
                              <div className="font-semibold text-black text-sm">
                                {session.date ? format(new Date(session.date), 'MMM dd, yyyy') : 'Invalid Date'}
                              </div>
                              <div className="text-sm text-green-600 font-medium">
                                {session.start_time && session.end_time ? (
                                  `${formatTime12Hour(session.start_time)} - ${formatTime12Hour(session.end_time)}`
                                ) : (
                                  'Invalid Time'
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-700 font-medium text-sm">{session.branches.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-sm">{session.session_participants?.length || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(session.status)} text-xs`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-green-300 mx-auto mb-4" />
                  <p className="text-lg sm:text-xl text-green-600 mb-2">No upcoming scheduled sessions</p>
                  <p className="text-green-500 text-sm sm:text-base">Schedule new training sessions to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Sessions */}
          <Card className="border-2 border-black bg-gradient-to-br from-gray-50 to-white shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-gray-100/50 to-gray-50 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-gray-600" />
                Past Sessions
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base">
                Completed sessions or sessions before today ({pastSessions.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pastSessions.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-black">
                          <TableHead className="font-semibold text-gray-800 text-sm">Date & Time</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-sm">Branch</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-sm">Players</TableHead>
                          <TableHead className="font-semibold text-gray-800 text-sm">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastSessions.map((session, index) => (
                          <TableRow 
                            key={session.id} 
                            className={`
                              hover:bg-gray-50 transition-colors border-b border-gray-100
                              ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                            `}
                          >
                            <TableCell className="py-4">
                              <div className="font-semibold text-black text-sm">
                                {session.date ? format(new Date(session.date), 'MMM dd, yyyy') : 'Invalid Date'}
                              </div>
                              <div className="text-sm text-gray-500 font-medium">
                                {session.start_time && session.end_time ? (
                                  `${formatTime12Hour(session.start_time)} - ${formatTime12Hour(session.end_time)}`
                                ) : (
                                  'Invalid Time'
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-700 font-medium text-sm">{session.branches.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-sm">{session.session_participants?.length || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(session.status)} text-xs`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <CalendarIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg sm:text-xl text-gray-500 mb-2">No past or completed sessions</p>
                  <p className="text-gray-400 text-sm sm:text-base">Completed sessions or sessions before today will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
