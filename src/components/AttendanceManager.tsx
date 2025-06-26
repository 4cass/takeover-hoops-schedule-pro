
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
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
          branches (name),
          coaches (name)
        `)
        .eq('status', 'scheduled')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Attendance Management</CardTitle>
            <CardDescription>Track student attendance for training sessions</CardDescription>
          </div>
          <div className="w-80">
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger>
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions?.map(session => (
                  <SelectItem key={session.id} value={session.id}>
                    {format(new Date(session.date), 'MMM dd, yyyy')} - {session.start_time} 
                    ({session.branches.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedSessionDetails && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Session Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Date:</span>
                <p>{format(new Date(selectedSessionDetails.date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Time:</span>
                <p>{selectedSessionDetails.start_time} - {selectedSessionDetails.end_time}</p>
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
        )}

        {selectedSession && !isLoading && attendanceRecords && (
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
                        ? format(new Date(record.marked_at), 'MMM dd, HH:mm')
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

        {selectedSession && isLoading && (
          <div className="text-center py-8">
            <p>Loading attendance records...</p>
          </div>
        )}

        {!selectedSession && (
          <div className="text-center py-8 text-gray-500">
            <p>Please select a training session to view attendance records.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
