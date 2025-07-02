
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Clock, MapPin, User, ChevronLeft, ChevronRight, Filter, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, addMonths, subMonths, isAfter } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { CoachCalendarManager } from "./CoachCalendarManager";

type SessionStatus = Database['public']['Enums']['session_status'];

type TrainingSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  coach_id: string;
  status: SessionStatus;
  package_type: "Camp Training" | "Personal Training" | null;
  branches: { name: string };
  coaches: { name: string };
  session_participants: Array<{ students: { name: string } }>;
};

const formatTime12Hour = (timeString: string) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function CalendarManager() {
  const { role, coachData, loading: authLoading } = useAuth();

  // If user is a coach, show coach-specific calendar
  if (role === 'coach') {
    return <CoachCalendarManager />;
  }

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [filterPackageType, setFilterPackageType] = useState<"All" | "Camp Training" | "Personal Training">("All");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const navigate = useNavigate();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['training-sessions', selectedCoach, selectedBranch, filterPackageType, currentMonth, role],
    queryFn: async () => {
      console.log("Fetching sessions with role:", role);
      
      let query = supabase
        .from('training_sessions')
        .select(`
          id, date, start_time, end_time, branch_id, coach_id, status, package_type,
          branches (name),
          coaches (name),
          session_participants (
            students (name)
          )
        `)
        .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

      if (selectedCoach !== "all") {
        query = query.eq('coach_id', selectedCoach);
      }
      if (selectedBranch !== "all") {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data, error } = await query.order('date', { ascending: true });
      if (error) {
        console.error("Error fetching sessions:", error);
        throw error;
      }
      
      console.log("Fetched sessions:", data);
      return data as TrainingSession[];
    },
    enabled: !authLoading && role === 'admin' // Only fetch if not loading auth and user is admin
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches-select', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name')
        .order('name');
      if (error) {
        console.error("Error fetching coaches:", error);
        throw error;
      }
      return data;
    },
    enabled: !authLoading && role === 'admin'
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-select', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (error) {
        console.error("Error fetching branches:", error);
        throw error;
      }
      return data;
    },
    enabled: !authLoading && role === 'admin'
  });

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect if not admin (coaches should see CoachCalendarManager above)
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access denied. Admin role required.</div>
      </div>
    );
  }

  const filteredSessions = sessions
    ?.filter((session) =>
      filterPackageType === "All" || session.package_type === filterPackageType
    ) || [];

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[#fc7416]/10 text-[#fc7416] border-[#fc7416]/20';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const selectedDateSessions = selectedDate
    ? filteredSessions.filter(session => isSameDay(new Date(session.date), selectedDate)) || []
    : [];

  const today = new Date();
  const todayDateOnly = new Date(format(today, "yyyy-MM-dd") + "T00:00:00");

  const upcomingSessions = filteredSessions.filter(session => {
    const sessionDate = new Date(session.date + "T00:00:00");
    return (isAfter(sessionDate, todayDateOnly) || isSameDay(sessionDate, todayDateOnly)) &&
           session.status !== 'cancelled' && session.status !== 'completed';
  }) || [];

  const pastSessions = filteredSessions.filter(session => {
    const sessionDate = new Date(session.date + "T00:00:00");
    return session.status === 'completed' || isBefore(sessionDate, todayDateOnly);
  }) || [];

  if (sessionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading calendar data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            Calendar
          </h1>
          <p className="text-lg text-gray-700">
            Manage and view all basketball training sessions
          </p>
        </div>

        {/* Main Calendar Card */}
        <Card className="border-2 border-black bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-black bg-black">
            <CardTitle className="text-2xl font-bold text-white flex items-center">
              <CalendarIcon className="h-6 w-6 mr-3 text-[#fc7416]" />
              Monthly Overview
            </CardTitle>
            <CardDescription className="text-gray-400 text-base">
              View and manage training sessions for {format(currentMonth, 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            
            {/* Filters */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 text-[#fc7416] mr-2" />
                <h3 className="text-lg font-semibold text-black">Filter Sessions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Coach</label>
                  <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                    <SelectTrigger className="border-[#fc7416]/40 focus:border-[#fc7416] focus:ring-[#fc7416]/20">
                      <SelectValue placeholder="Select coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Coaches</SelectItem>
                      {coaches?.map(coach => (
                        <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Branch</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="border-[#fc7416]/40 focus:border-[#fc7416] focus:ring-[#fc7416]/20">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches?.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Package Type</label>
                  <Select
                    value={filterPackageType}
                    onValueChange={(value: "All" | "Camp Training" | "Personal Training") => setFilterPackageType(value)}
                  >
                    <SelectTrigger className="border-[#fc7416]/40 focus:border-[#fc7416] focus:ring-[#fc7416]/20">
                      <SelectValue placeholder="Select package type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Sessions</SelectItem>
                      <SelectItem value="Camp Training">Camp Training</SelectItem>
                      <SelectItem value="Personal Training">Personal Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Showing {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Calendar Grid */}
            <div className="border-2 border-black rounded-2xl p-6 bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
              
              {/* Calendar Navigation */}
              <div className="flex justify-between items-center mb-6">
                <Button
                  onClick={handlePrevMonth}
                  variant="outline"
                  size="sm"
                  className="border-[#fc7416]/40 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300"
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
                  className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="text-center py-3 bg-black text-white font-semibold rounded-lg text-sm">
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map(day => {
                  const daySessions = filteredSessions.filter(session => isSameDay(new Date(session.date), day)) || [];
                  const hasScheduled = daySessions.some(s => s.status === 'scheduled');
                  const hasCompleted = daySessions.some(s => s.status === 'completed');
                  const hasCancelled = daySessions.some(s => s.status === 'cancelled');
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative p-3 h-20 rounded-xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg
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
          </CardContent>
        </Card>

        {/* Selected Date Sessions */}
        {selectedDate && (
          <Card className="border-2 border-black bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-black bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
              <CardTitle className="text-xl font-bold text-black flex items-center">
                <Eye className="h-5 w-5 mr-3 text-[#fc7416]" />
                Sessions on {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selectedDateSessions.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateSessions.map(session => (
                    <Card key={session.id} className="border border-black bg-gradient-to-r from-[#faf0e8]/50 to-white hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-center">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-[#fc7416]" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Time</p>
                              <p className="font-semibold text-black">
                                {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-[#fc7416]" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Branch</p>
                              <p className="font-semibold text-black">{session.branches.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-[#fc7416]" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Coach</p>
                              <p className="font-semibold text-black">{session.coaches.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-[#fc7416]" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Players</p>
                              <p className="font-semibold text-black">{session.session_participants?.length || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-[#fc7416]" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Package</p>
                              <p className="font-semibold text-black">{session.package_type || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusBadgeColor(session.status)} font-medium px-3 py-1`}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex justify-end ">
                            <Button
                              onClick={() => navigate(`/dashboard/attendance/${session.id}`)}
                              className="bg-gradient-to-r from-[#fc7416] to-[#fe822d] hover:from-[#fe822d] hover:to-[#fc7416] text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                    {filterPackageType !== "All" ? `No ${filterPackageType} sessions scheduled` : "No sessions scheduled"}
                  </p>
                  <p className="text-gray-400">
                    {filterPackageType !== "All" ? "Try adjusting your package type filter or select a different date." : "Select a different date or schedule a new session."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Upcoming Sessions */}
          <Card className="border-2 border-black bg-gradient-to-br from-green-50 to-white shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-green-100/50 to-green-50">
              <CardTitle className="text-xl font-bold text-green-800 flex items-center">
                <Clock className="h-5 w-5 mr-3 text-green-600" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription className="text-green-600">
                Scheduled sessions for today or the future ({upcomingSessions.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingSessions.length > 0 ? (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-green-100 to-green-50 border-b border-black">
                        <TableHead className="font-semibold text-green-800">Date & Time</TableHead>
                        <TableHead className="font-semibold text-green-800">Branch</TableHead>
                        <TableHead className="font-semibold text-green-800">Coach</TableHead>
                        <TableHead className="font-semibold text-green-800">Package</TableHead>
                        <TableHead className="font-semibold text-green-800">Players</TableHead>
                        <TableHead className="font-semibold text-green-800">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingSessions.map((session, index) => (
                        <TableRow 
                          key={session.id} 
                          className={`
                            hover:bg-green-50 transition-colors border-b border-green-100
                            ${index % 2 === 0 ? 'bg-white' : 'bg-green-25'}
                          `}
                        >
                          <TableCell className="py-4">
                            <div className="font-semibold text-black">
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
                          <TableCell className="text-gray-700 font-medium">{session.branches.name}</TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.coaches.name}</TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.package_type || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{session.session_participants?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(session.status)}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Clock className="h-16 w-16 text-green-300 mx-auto mb-4" />
                  <p className="text-xl text-green-600 mb-2">
                    {filterPackageType !== "All" ? `No upcoming ${filterPackageType} sessions` : "No upcoming scheduled sessions"}
                  </p>
                  <p className="text-green-500">
                    {filterPackageType !== "All" ? "Try adjusting your package type filter or schedule new sessions." : "Schedule new training sessions to get started."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Sessions */}
          <Card className="border-2 border-black bg-gradient-to-br from-gray-50 to-white shadow-lg">
            <CardHeader className="border-b border-black bg-gradient-to-r from-gray-100/50 to-gray-50">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-3 text-gray-600" />
                Past Sessions
              </CardTitle>
              <CardDescription className="text-gray-600">
                Completed sessions or sessions before today ({pastSessions.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pastSessions.length > 0 ? (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-black">
                        <TableHead className="font-semibold text-gray-800">Date & Time</TableHead>
                        <TableHead className="font-semibold text-gray-800">Branch</TableHead>
                        <TableHead className="font-semibold text-gray-800">Coach</TableHead>
                        <TableHead className="font-semibold text-gray-800">Package</TableHead>
                        <TableHead className="font-semibold text-gray-800">Players</TableHead>
                        <TableHead className="font-semibold text-gray-800">Status</TableHead>
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
                            <div className="font-semibold text-black">
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
                          <TableCell className="text-gray-700 font-medium">{session.branches.name}</TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.coaches.name}</TableCell>
                          <TableCell className="text-gray-700 font-medium">{session.package_type || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{session.session_participants?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(session.status)}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">
                    {filterPackageType !== "All" ? `No past ${filterPackageType} sessions` : "No past or completed sessions"}
                  </p>
                  <p className="text-gray-400">
                    {filterPackageType !== "All" ? "Try adjusting your package type filter." : "Completed sessions or sessions before today will appear here."}
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
