
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Calendar, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'pending';
  marked_at: string | null;
  students: { name: string };
  training_sessions: {
    date: string;
    start_time: string;
    end_time: string;
    branches: { name: string };
    coaches: { name: string };
  };
};

type Session = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  branches: { name: string };
  coaches: { name: string };
};

const formatTime12Hour = (timeString: string) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function AttendanceManager() {
  const [selectedSession, setSelectedSession] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          branches (name),
          coaches (name)
        `)
        .eq('status', 'scheduled')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as Session[];
    }
  });

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['attendance-records', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students (name),
          training_sessions (
            date,
            start_time,
            end_time,
            branches (name),
            coaches (name)
          )
        `)
        .eq('session_id', selectedSession)
        .order('students(name)');
      
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!selectedSession
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ recordId, status }: { recordId: string, status: 'present' | 'absent' | 'pending' }) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          status,
          marked_at: status !== 'pending' ? new Date().toISOString() : null
        })
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', selectedSession] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Attendance updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update attendance: ' + error.message);
    }
  });

  const handleAttendanceChange = (recordId: string, status: 'present' | 'absent' | 'pending') => {
    updateAttendanceMutation.mutate({ recordId, status });
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAttendanceBadgeColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedSessionDetails = sessions?.find(s => s.id === selectedSession);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Training Sessions</CardTitle>
          <CardDescription>Select a session to manage attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions?.map(session => (
              <Card 
                key={session.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedSession === session.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedSession(session.id)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{format(new Date(session.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span>{formatTime12Hour(session.start_time)} - {formatTime12Hour(session.end_time)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span>{session.branches.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-purple-600" />
                      <span>{session.coaches.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSessionDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Management</CardTitle>
            <CardDescription>Manage student attendance for the selected session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Session Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Date:</span>
                  <p>{format(new Date(selectedSessionDetails.date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Time:</span>
                  <p>{formatTime12Hour(selectedSessionDetails.start_time)} - {formatTime12Hour(selectedSessionDetails.end_time)}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Branch:</span>
                  <p>{selectedSessionDetails.branches.name}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Coach:</span>
                  <p>{selectedSessionDetails.coaches.name}</p>
                </div>
              </div>
            </div>

            {!isLoading && attendanceRecords && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Student Attendance</h3>
                  <div className="flex space-x-4 text-sm">
                    <span className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Present: {attendanceRecords.filter(r => r.status === 'present').length}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Absent: {attendanceRecords.filter(r => r.status === 'absent').length}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span>Pending: {attendanceRecords.filter(r => r.status === 'pending').length}</span>
                    </span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.students.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getAttendanceIcon(record.status)}
                            <Badge className={getAttendanceBadgeColor(record.status)}>
                              {record.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.marked_at 
                            ? format(new Date(record.marked_at), 'MMM dd, h:mm a')
                            : 'Not marked'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant={record.status === 'present' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(record.id, 'present')}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={record.status === 'absent' ? 'destructive' : 'outline'}
                              onClick={() => handleAttendanceChange(record.id, 'absent')}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={record.status === 'pending' ? 'secondary' : 'outline'}
                              onClick={() => handleAttendanceChange(record.id, 'pending')}
                              disabled={updateAttendanceMutation.isPending}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <p>Loading attendance records...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedSession && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            <p>Please select a training session above to view and manage attendance.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
