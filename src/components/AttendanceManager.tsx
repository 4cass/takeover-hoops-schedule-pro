import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, Users, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AttendanceStatus = "present" | "absent" | "pending";

type UpdateAttendanceVariables = {
  recordId: string;
  status: AttendanceStatus;
};

const attendanceStatuses = ["present", "absent", "pending"] as const;

type AttendanceStatusLiteral = typeof attendanceStatuses[number];

const formatTime12Hour = (timeString: string) => {
  const [hours, minutes] = timeString.split(":" ).map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function AttendanceManager() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, date, start_time, end_time, status, branches (name), coaches (name)")
        .eq("status", "scheduled")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: attendanceRecords } = useQuery<any[]>({
    queryKey: ["attendance", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_at, students (name)")
        .eq("session_id", selectedSession);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSession,
  });

  const updateAttendance = useMutation<void, unknown, UpdateAttendanceVariables>({
    mutationFn: async ({ recordId, status }) => {
      const { error } = await supabase
        .from("attendance_records")
        .update({ status, marked_at: status !== "pending" ? new Date().toISOString() : null })
        .eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance updated");
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedSession] });
    },
    onError: () => {
      toast.error("Failed to update attendance");
    },
  });

  const selectedSessionDetails = sessions?.find((s) => s.id === selectedSession);
  
  const filteredAttendanceRecords = attendanceRecords?.filter((record) =>
    record.students.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const presentCount = filteredAttendanceRecords.filter((r) => r.status === "present").length;
  const absentCount = filteredAttendanceRecords.filter((r) => r.status === "absent").length;
  const pendingCount = filteredAttendanceRecords.filter((r) => r.status === "pending").length;

  const handleAttendanceChange = (recordId: string, status: AttendanceStatusLiteral) => {
    updateAttendance.mutate({ recordId, status });
  };

  const getAttendanceIcon = (status: AttendanceStatusLiteral) => {
    switch (status) {
      case "present": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "absent": return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending": return <Clock className="w-4 h-4 text-amber-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAttendanceBadgeColor = (status: AttendanceStatusLiteral) => {
    switch (status) {
      case "present": return "bg-green-50 text-green-700 border-green-200";
      case "absent": return "bg-red-50 text-red-700 border-red-200";
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            Attendance Manager
          </h1>
          <p className="text-lg text-gray-700">
            Track and manage player attendance for training sessions
          </p>
        </div>

        {/* Session Selection Card */}
        <Card className="border-2 border-[#fc7416]/20 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-[#fc7416]/10 bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
            <CardTitle className="text-2xl font-bold text-black flex items-center">
              <Calendar className="h-6 w-6 mr-3 text-[#fc7416]" />
              Training Sessions
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Select a training session to manage player attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sessions?.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    selectedSession === session.id
                      ? "border-[#fc7416] bg-gradient-to-br from-[#fc7416]/10 to-[#fe822d]/10 shadow-lg scale-105"
                      : "border-[#fc7416]/20 bg-white hover:border-[#fc7416]/50"
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#fc7416]" />
                      <span className="font-semibold text-black text-sm">{formatDate(session.date)}</span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700 font-medium">
                          {formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">{session.branches.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">{session.coaches.name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Management Card */}
        {selectedSessionDetails && attendanceRecords && (
          <Card className="border-2 border-[#fc7416]/20 bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-[#fc7416]/10 bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center">
                    <Users className="h-6 w-6 mr-3 text-[#fc7416]" />
                    Attendance Management
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    {formatDate(selectedSessionDetails.date)} • {selectedSessionDetails.branches.name}
                  </CardDescription>
                </div>
                
                {/* Stats and Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-6 text-sm">
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
            </CardHeader>
            <CardContent className="p-8">
              
              {/* Search and Filter */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Filter className="h-5 w-5 text-[#fc7416] mr-2" />
                  <h3 className="text-lg font-semibold text-black">Filter Players</h3>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="pl-10 pr-4 py-3 w-full border-2 border-[#fc7416]/20 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border-2 border-[#fc7416]/20 rounded-2xl bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#fc7416] to-[#fe822d] text-white">
                      <tr>
                        <th className="py-4 px-6 text-left font-semibold">Player Name</th>
                        <th className="py-4 px-6 text-left font-semibold">Status</th>
                        <th className="py-4 px-6 text-left font-semibold">Marked At</th>
                        <th className="py-4 px-6 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceRecords.map((record, index) => (
                        <tr 
                          key={record.id} 
                          className={`transition-all duration-300 hover:bg-[#fc7416]/5 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#faf0e8]/20'
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fc7416] to-[#fe822d] flex items-center justify-center text-white font-semibold">
                                {record.students.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <span className="font-semibold text-black">{record.students.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              {getAttendanceIcon(record.status)}
                              <Badge className={`${getAttendanceBadgeColor(record.status)} border capitalize font-medium`}>
                                {record.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {record.marked_at ? (
                              <span className="font-medium">{formatDateTime(record.marked_at)}</span>
                            ) : (
                              <span className="italic text-gray-400">Not marked</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              {attendanceStatuses.map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={record.status === status ? "default" : "outline"}
                                  onClick={() => handleAttendanceChange(record.id, status)}
                                  className={`transition-all duration-300 hover:scale-105 ${
                                    record.status === status
                                      ? status === "present"
                                        ? "bg-green-200 hover:bg-green-700 text-green-700"
                                        : status === "absent"
                                        ? "bg-red-200 hover:bg-red-700 text-red-700"
                                        : "bg-amber-200 hover:bg-amber-700 text-amber-700"
                                      : "border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white"
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
                  <div className="py-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm ? 'No players found' : 'No attendance records'}
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm 
                        ? 'Try adjusting your search terms.' 
                        : 'No attendance records found for this session.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {!selectedSession && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fc7416] to-[#fe822d] flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-3">Select a Training Session</h3>
            <p className="text-lg text-gray-600">Choose a session from above to start managing attendance.</p>
          </div>
        )}
      </div>
    </div>
  );
}