import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, addMonths, subMonths, isAfter } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SessionStatus = Database['public']['Enums']['session_status'];

type TrainingSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  coach_id: string;
  status: SessionStatus;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['training-sessions', selectedCoach, selectedBranch, currentMonth],
    queryFn: async () => {
      let query = supabase
        .from('training_sessions')
        .select(`
          *,
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
      if (error) throw error;
      return data as TrainingSession[];
    }
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const selectedDateSessions = selectedDate
    ? sessions?.filter(session => isSameDay(new Date(session.date), selectedDate)) || []
    : [];

  const today = new Date();
  const todayDateOnly = new Date(format(today, "yyyy-MM-dd") + "T00:00:00");

  const upcomingSessions = sessions?.filter(session => {
   const sessionDate = new Date(session.date + "T00:00:00");
   return isAfter(sessionDate, todayDateOnly) || isSameDay(sessionDate, todayDateOnly);
  }) || [];

  const pastSessions = sessions?.filter(session => {
    const sessionDate = new Date(session.date + "T00:00:00");
    return isBefore(sessionDate, todayDateOnly);
}) || [];

  const handleSessionSelect = (sessionId: string) => {
    navigate(`/attendance/${sessionId}`);
  };

  return (
    <div className="space-y-6 p-4">
      <Card className="shadow-lg border-none bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Training Calendar</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">View and filter training sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                  <SelectTrigger className="w-full">
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
              <div className="flex-1">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full">
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
            </div>

            {/* Calendar */}
            <div className="border rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
                {daysInMonth.map(day => {
                  const hasSessions = sessions?.some(session => isSameDay(new Date(session.date), day));
                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2 rounded-lg transition-all duration-200 text-sm
                        ${selectedDate && isSameDay(day, selectedDate)
                          ? 'bg-primary text-white'
                          : hasSessions
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Sessions */}
            {selectedDate && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Sessions on {format(selectedDate, 'MMM dd, yyyy')}
                </h3>
                {selectedDateSessions.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateSessions.map(session => (
                      <Card key={session.id} className="shadow-md border-none bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <CardContent className="p-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">Time:</span>
                              <p className="text-gray-900 dark:text-gray-100">
                                {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                              </p>
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">Branch:</span>
                              <p className="text-gray-900 dark:text-gray-100">{session.branches.name}</p>
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">Coach:</span>
                              <p className="text-gray-900 dark:text-gray-100">{session.coaches.name}</p>
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">Participants:</span>
                              <p className="text-gray-900 dark:text-gray-100">{session.session_participants?.length || 0}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={() => navigate(`/dashboard/attendance/${session.id}`)}
                              className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                            >
                              Manage Attendance
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No sessions scheduled for this date.
                  </p>
                )}
              </div>
            )}

            {/* Sessions Lists */}
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upcoming Sessions</h3>
                {upcomingSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-gray-900 dark:text-white">Date & Time</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Branch</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Coach</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Participants</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingSessions.map((session) => (
                        <TableRow key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <TableCell>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(session.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{session.branches.name}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{session.coaches.name}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>{session.session_participants?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(session.status)} transition-colors`}>
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No upcoming sessions.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Past Sessions</h3>
                {pastSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="text-gray-900 dark:text-white">Date & Time</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Branch</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Coach</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Participants</TableHead>
                        <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastSessions.map((session) => (
                        <TableRow key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <TableCell>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(session.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{session.branches.name}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{session.coaches.name}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>{session.session_participants?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(session.status)} transition-colors`}>
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No past sessions.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
    default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};