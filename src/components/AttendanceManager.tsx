import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, Users, BarChart3 } from "lucide-react";
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
  const presentCount = attendanceRecords?.filter((r) => r.status === "present").length || 0;
  const absentCount = attendanceRecords?.filter((r) => r.status === "absent").length || 0;
  const pendingCount = attendanceRecords?.filter((r) => r.status === "pending").length || 0;

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
    <div className="min-h-screen" style={{ backgroundColor: "#faf0e8" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fc7416" }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Takeover Basketball</h1>
                <p className="text-sm text-gray-500">Attendance Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

          {/* Session Selection */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b border-gray-100" style={{ backgroundColor: "#fffefe" }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fc7416" }}>
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Training Sessions</CardTitle>
                  <CardDescription className="text-gray-600">Select a session to manage player attendance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions?.map((session) => (
                <Card key={session.id} className={`cursor-pointer border-2 transition-all duration-300 hover:shadow-md ${selectedSession === session.id ? "border-orange-400 shadow-lg scale-105" : "border-gray-200 hover:border-orange-300"}`} onClick={() => setSelectedSession(session.id)}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" style={{ color: "#fc7416" }} />
                      <span className="font-semibold text-gray-900 text-sm">{formatDate(session.date)}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2"><Clock className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}</span></div>
                      <div className="flex items-center space-x-2"><MapPin className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{session.branches.name}</span></div>
                      <div className="flex items-center space-x-2"><User className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{session.coaches.name}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Attendance Management */}
          {selectedSessionDetails && attendanceRecords && (
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="border-b border-gray-100" style={{ backgroundColor: "#fffefe" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fe822d" }}>
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">Attendance Management</CardTitle>
                      <CardDescription className="text-gray-600">Track player attendance for this session</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-gray-600">Present: {presentCount}</span></div>
                    <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-gray-600">Absent: {absentCount}</span></div>
                    <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-gray-600">Pending: {pendingCount}</span></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
              <div  style={{ backgroundColor: "#faf0e8" }}>
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="py-4 px-6 text-left text-gray-900">Player Name</th>
                          <th className="py-4 px-6 text-left text-gray-900">Status</th>
                          <th className="py-4 px-6 text-left text-gray-900">Marked At</th>
                          <th className="py-4 px-6 text-left text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords?.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="py-4 px-6">{record.students.name}</td>
                            <td className="py-4 px-6 flex items-center space-x-2">
                              {getAttendanceIcon(record.status)}
                              <Badge className={`${getAttendanceBadgeColor(record.status)} border capitalize`}>
                                {record.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-gray-600">
                              {record.marked_at ? formatDateTime(record.marked_at) : <span className="italic text-gray-400">Not marked</span>}
                            </td>
                            <td className="py-4 px-6 space-x-2">
                              {attendanceStatuses.map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={record.status === status ? "default" : "outline"}
                                  onClick={() => handleAttendanceChange(record.id, status)}
                                  className="transition-all hover:scale-105"
                                >
                                  {getAttendanceIcon(status)}
                                </Button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
