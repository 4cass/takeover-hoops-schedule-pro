
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, Users, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { format, parseISO, addDays, subDays } from "date-fns";

type AttendanceStatus = "present" | "absent" | "pending";

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
    console.log("Formatting date:", dateString);
    // Handle the date string properly - parse as local date
    const date = new Date(dateString + 'T00:00:00');
    const formattedDate = format(date, 'EEEE, MMMM dd, yyyy');
    console.log("Formatted date result:", formattedDate);
    return formattedDate;
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateString);
    return dateString;
  }
};

const formatDateTime = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM dd, h:mm a');
  } catch (error) {
    console.error("Error formatting datetime:", error, "Input:", dateString);
    return new Date(dateString).toLocaleDateString();
  }
};

export function CoachAttendanceManager() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSessionModal, setSelectedSessionModal] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: coachId } = useQuery({
    queryKey: ["coach-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log("Fetching coach ID for user:", user.email);
      const { data: coach, error } = await supabase
        .from("coaches")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching coach ID:", error);
        return null;
      }
      console.log("Found coach ID:", coach?.id);
      return coach?.id;
    },
    enabled: !!user?.id,
  });

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["coach-sessions", coachId],
    queryFn: async () => {
      if (!coachId) return [];
      console.log("Fetching sessions for coach:", coachId);
      
      // Get sessions from a wider date range to ensure we don't miss any
      const today = new Date();
      const pastDate = subDays(today, 30);
      const futureDate = addDays(today, 30);
      
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, date, start_time, end_time, status, package_type, branches (name), coaches (name)")
        .eq("coach_id", coachId)
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
    enabled: !!coachId,
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

  const updateAttendance = useMutation({
    mutationFn: async ({ recordId, status }: { recordId: string; status: AttendanceStatus }) => {
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
      session.branches.name.toLowerCase().includes(sessionSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by date (newest first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
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

  const handleSessionCardClick = (session: any) => {
    setSelectedSessionModal(session);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            Your Attendance Management
          </h1>
          <p className="text-lg text-gray-700">
            Track and manage player attendance for your training sessions
          </p>
        </div>

        {/* Session Selection Card */}
        <Card className="border-2 border-black bg-white shadow-xl">
          <CardHeader className="border-b border-black bg-black">
            <CardTitle className="text-2xl font-bold text-white flex items-center">
              <Calendar className="h-6 w-6 mr-3 text-accent" />
              Your Training Sessions
            </CardTitle>
            <CardDescription className="text-gray-400 text-base">
              Select a training session to manage player attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 text-accent mr-2" />
                <h3 className="text-lg font-semibold text-black">Filter Sessions</h3>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by branch..."
                  className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-white"
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Showing {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    selectedSession === session.id
                      ? "border-accent bg-accent/10 shadow-lg scale-105"
                      : "border-accent/20 bg-white hover:border-accent/50"
                  }`}
                  onClick={() => handleSessionCardClick(session)}
                >
                  <CardContent className="p-5 space-y-4">
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
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">{session.package_type || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSessions.length === 0 && (
              <div className="py-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {sessionSearchTerm ? "No sessions found" : "No sessions"}
                </h3>
                <p className="text-gray-600">
                  {sessionSearchTerm ? "Try adjusting your search terms." : "No scheduled sessions available."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Details Modal */}
        <Dialog open={!!selectedSessionModal} onOpenChange={() => setSelectedSessionModal(null)}>
          <DialogContent className="max-w-2xl border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-black flex items-center">
                <Calendar className="h-6 w-6 mr-3 text-accent" />
                Session Details
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                {selectedSessionModal ? formatDate(selectedSessionModal.date) : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedSessionModal && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Time</p>
                      <p className="font-semibold text-black">
                        {formatTime12Hour(selectedSessionModal.start_time)} - {formatTime12Hour(selectedSessionModal.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Branch</p>
                      <p className="font-semibold text-black">{selectedSessionModal.branches.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Package Type</p>
                      <p className="font-semibold text-black">{selectedSessionModal.package_type || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-accent/10 text-accent border-accent/20 font-medium px-3 py-1">
                      {selectedSessionModal.status.charAt(0).toUpperCase() + selectedSessionModal.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSessionModal(null)}
                    className="border-accent/30 text-accent hover:bg-accent hover:text-white transition-all duration-300"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedSession(selectedSessionModal.id);
                      setSelectedSessionModal(null);
                    }}
                    className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/80 hover:to-accent text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Manage Attendance
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Attendance Management Card */}
        {selectedSessionDetails && attendanceRecords && (
          <Card className="border-2 border-black bg-white shadow-xl">
            <CardHeader className="border-b border-accent/10 bg-accent/5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center">
                    <Users className="h-6 w-6 mr-3 text-accent" />
                    Attendance Management
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    {formatDate(selectedSessionDetails.date)} • {selectedSessionDetails.branches.name}
                  </CardDescription>
                </div>
                
                {/* Stats */}
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
              
              {/* Search for Attendance Records */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Filter className="h-5 w-5 text-accent mr-2" />
                  <h3 className="text-lg font-semibold text-black">Filter Players</h3>
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
                          className={`transition-all duration-300 hover:bg-accent/5 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
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
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
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
