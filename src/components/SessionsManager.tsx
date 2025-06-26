import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SessionStatus = Database['public']['Enums']['session_status'];

type TrainingSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  coach_id: string;
  notes: string | null;
  status: SessionStatus;
  branches: { name: string };
  coaches: { name: string };
  session_participants: Array<{ students: { name: string } }>;
};

export function SessionsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    branch_id: "",
    coach_id: "",
    notes: "",
    status: "scheduled" as SessionStatus
  });

  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['training-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          branches (name),
          coaches (name),
          session_participants (
            students (name)
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as TrainingSession[];
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

  const { data: students } = useQuery({
    queryKey: ['students-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, remaining_sessions')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (session: typeof formData) => {
      // Check for conflicts first
      const { data: conflicts } = await supabase
        .rpc('check_scheduling_conflicts', {
          p_date: session.date,
          p_start_time: session.start_time,
          p_end_time: session.end_time,
          p_coach_id: session.coach_id,
          p_student_ids: selectedStudents
        });

      if (conflicts && conflicts.length > 0) {
        throw new Error(conflicts[0].conflict_details);
      }

      const { data, error } = await supabase
        .from('training_sessions')
        .insert([session])
        .select()
        .single();
      
      if (error) throw error;

      // Add participants
      if (selectedStudents.length > 0) {
        const { error: participantsError } = await supabase
          .from('session_participants')
          .insert(
            selectedStudents.map(studentId => ({
              session_id: data.id,
              student_id: studentId
            }))
          );
        
        if (participantsError) throw participantsError;

        // Create attendance records
        const { error: attendanceError } = await supabase
          .from('attendance_records')
          .insert(
            selectedStudents.map(studentId => ({
              session_id: data.id,
              student_id: studentId,
              status: 'pending' as const
            }))
          );
        
        if (attendanceError) throw attendanceError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Training session created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create session: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...session }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .update(session)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      toast.success('Training session updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update session: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Training session deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete session: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      date: "",
      start_time: "",
      end_time: "",
      branch_id: "",
      coach_id: "",
      notes: "",
      status: "scheduled"
    });
    setSelectedStudents([]);
    setEditingSession(null);
    setIsDialogOpen(false);
    setIsParticipantsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSession) {
      updateMutation.mutate({ ...formData, id: editingSession.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setFormData({
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      branch_id: session.branch_id,
      coach_id: session.coach_id,
      notes: session.notes || "",
      status: session.status
    });
    setIsDialogOpen(true);
  };

  const handleManageParticipants = (session: TrainingSession) => {
    setSelectedSession(session);
    setSelectedStudents(
      session.session_participants?.map(p => 
        // We need to get the student ID, but the current query structure doesn't include it
        // For now, we'll set this to empty and implement proper participant management
        ""
      ).filter(Boolean) || []
    );
    setIsParticipantsDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Training Sessions</CardTitle>
            <CardDescription>Schedule and manage training sessions</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSession ? 'Edit Training Session' : 'Schedule New Training Session'}
                </DialogTitle>
                <DialogDescription>
                  {editingSession ? 'Update session details' : 'Create a new training session'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: SessionStatus) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={formData.branch_id} onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches?.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="coach">Coach</Label>
                    <Select value={formData.coach_id} onValueChange={(value) => setFormData(prev => ({ ...prev, coach_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coach" />
                      </SelectTrigger>
                      <SelectContent>
                        {coaches?.map(coach => (
                          <SelectItem key={coach.id} value={coach.id}>
                            {coach.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!editingSession && (
                  <div>
                    <Label>Students</Label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {students?.map(student => (
                        <div key={student.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={student.id}
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents(prev => [...prev, student.id]);
                              } else {
                                setSelectedStudents(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <Label htmlFor={student.id} className="flex-1">
                            {student.name} ({student.remaining_sessions} sessions left)
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional session notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSession ? 'Update' : 'Schedule'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="font-medium">
                    {format(new Date(session.date), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {session.start_time} - {session.end_time}
                  </div>
                </TableCell>
                <TableCell>{session.branches.name}</TableCell>
                <TableCell>{session.coaches.name}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{session.session_participants?.length || 0}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManageParticipants(session)}
                    >
                      Manage
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(session.status)}>
                    {session.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(session)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(session.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Participants Management Dialog */}
      <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Session Participants</DialogTitle>
            <DialogDescription>
              Add or remove students from this training session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Current participants: {selectedSession?.session_participants?.length || 0}
              </p>
              <div className="space-y-2">
                {selectedSession?.session_participants?.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{participant.students.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsParticipantsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
