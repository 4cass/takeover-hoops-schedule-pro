
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, Users, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { CoachAttendanceManager } from "./CoachAttendanceManager";
import { format, addDays, subDays } from "date-fns";

type AttendanceStatus = "present" | "absent" | "pending";

type UpdateAttendanceVariables = {
  recordId: string;
  status: AttendanceStatus;
};

const attendanceStatuses = ["present", "absent", "pending"] as const;

type AttendanceStatusLiteral = typeof attendanceStatuses[number];

const formatTime12Hour = (timeString: string) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatDate = (dateString: string) => {
  try {
    // Handle the date string properly - parse as local date
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
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

export function AttendanceManager() {
  const { role } = useAuth();

  // If user is a coach, show coach-specific attendance manager
  if (role === 'coach') {
    return <CoachAttendanceManager />;
  }

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [filterPackageType, setFilterPackageType] = useState<"All" | "Camp Training" | "Personal Training">("All");
  const [sortOrder, setSortOrder] = useState<"Newest to Oldest" | "Oldest to Newest">("Newest to Oldest");
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      console.log("Fetching all sessions for admin");
      
      // Get sessions from a wider date range
      const today = new Date();
      const pastDate = subDays(today, 30);
      const futureDate = addDays(today, 30);
      
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, date, start_time, end_time, status, package_type, branches (name), coaches (name)")
        .eq("status", "scheduled")
        .gte("date", format(pastDate, 'yyyy-MM-dd'))
        .lte("date", format(futureDate, 'yyyy-MM-dd'))
        .order("date", { ascending: false });
      
      if (error) {
        console.error("Error fetching sessions:", error);
        throw error;
      }
      
      console.log("Fetched sessions:", data);
      return data || [];
    },
  });

  const { data: attendanceRecords } = useQuery<any[]>({
    queryKey: ["attendance", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      console.log("Fetching attendance for session:", selectedSession);
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_at, students (name)")
        .eq("session_id", selectedSession)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching attendance:", error);
        throw error;
      }
      
      console.log("Fetched attendance records:", data);
      return data || [];
    },
    enabled: !!selectedSession,
  });

  const updateAttendance = useMutation<void, unknown, UpdateAttendanceVariables>({
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
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedSession] });
    },
    onError: (error) => {
      console.error("Attendance update failed:", error);
      toast.error("Failed to update attendance");
    },
  });

  const selectedSessionDetails = sessions?.find((s) => s.id === selectedSession);

  const filteredSessions = sessions
    ?.filter((session) =>
      (session.coaches.name.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
       session.branches.name.toLowerCase().includes(sessionSearchTerm.toLowerCase())) &&
      (filterPackageType === "All" || session.package_type === filterPackageType)
    )
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "Newest to Oldest" ? dateB - dateA : dateA - dateB;
    }) || [];

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
    <div className="min-h-screen bg-white pt-4 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 -mt-5">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2 tracking-tight">
            Attendance Manager
          </h1>
          <p className="text-base sm:text-lg text-gray-700">
            Track and manage player attendance for training sessions
          </p>
        </div>

        {/* Session Selection Card */}
        <Card className="border-2 border-black bg-white shadow-xl">
          <CardHeader className="border-b border-black bg-black p-4 sm:p-6 lg:p-8">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-accent" />
              Training Sessions
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              Select a training session to manage player attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-accent mr-2" />
                <h3 className="text-base sm:text-lg font-semibold text-black">Filter Sessions</h3>
              </div>
              <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:gap-4 lg:space-y-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by coach or branch..."
                    className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-white"
                    value={sessionSearchTerm}
                    onChange={(e) => setSessionSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-package" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 mr-2 text-accent" />
                    Filter by Package Type
                  </Label>
                  <Select
                    value={filterPackageType}
                    onValueChange={(value: "All" | "Camp Training" | "Personal Training") => setFilterPackageType(value)}
                  >
                    <SelectTrigger className="border-2 focus:border-accent rounded-xl">
                      <SelectValue placeholder="Select package type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Sessions</SelectItem>
                      <SelectItem value="Camp Training">Camp Training</SelectItem>
                      <SelectItem value="Personal Training">Personal Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="sort-order" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-accent" />
                    Sort Order
                  </Label>
                  <Select
                    value={sortOrder}
                    onValueChange={(value: "Newest to Oldest" | "Oldest to Newest") => setSortOrder(value)}
                  >
                    <SelectTrigger className="border-2 focus:border-accent rounded-xl">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Newest to Oldest">Newest to Oldest</SelectItem>
                      <SelectItem value="Oldest to Newest">Oldest to Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Showing {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    selectedSession === session.id
                      ? "border-accent bg-accent/10 shadow-lg scale-105"
                      : "border-accent/20 bg-white hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span className="font-semibold text-black text-sm">
                        {format(new Date(session.date + 'T00:00:00'), 'MMM dd, yyyy')}
                      </span>
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
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">{session.package_type || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSessions.length === 0 && (
              <div className="py-8 sm:py-12 text-center">
                <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  {sessionSearchTerm || filterPackageType !== "All" ? `No ${filterPackageType === "All" ? "" : filterPackageType} sessions found` : "No sessions"}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  {sessionSearchTerm || filterPackageType !== "All" ? "Try adjusting your search or filter." : "No scheduled sessions available."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Management Card */}
        {selectedSessionDetails && attendanceRecords && (
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-accent/10 bg-accent/5 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-black flex items-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-accent" />
                    Attendance Management
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm sm:text-base">
                    {formatDate(selectedSessionDetails.date)} • {selectedSessionDetails.branches.name}
                  </CardDescription>
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
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              
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
            </CardContent>
          </Card>
        )}
        
        {!selectedSession && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">Select a Training Session</h3>
            <p className="text-base sm:text-lg text-gray-600">Choose a session from above to start managing attendance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
