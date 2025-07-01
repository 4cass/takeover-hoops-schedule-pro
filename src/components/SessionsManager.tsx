import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { Badge, Calendar, Clock, FileText, MapPin, Plus, Trash2, User, Users } from "lucide-react";

type SessionStatus = Database['public']['Enums']['session_status'];

type Student = {
  id: string;
  name: string;
  remaining_sessions: number;
  package_type: "Camp Training" | "Personal Training" | null;
  coach_id: string | null;
};

type TrainingSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  coach_id: string;
  notes: string | null;
  status: SessionStatus;
  package_type: "Camp Training" | "Personal Training" | null;
  branches: { name: string };
  coaches: { name: string };
  session_participants: Array<{
    id: string;
    student_id: string;
    students: { name: string; package_type: "Camp Training" | "Personal Training" | null };
  }>;
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
    status: "scheduled" as SessionStatus,
    package_type: "" as "Camp Training" | "Personal Training" | "",
  });
  const [filterPackageType, setFilterPackageType] = useState<"All" | "Personal Training" | "Camp Training">("All");
  const [sortOrder, setSortOrder] = useState<"closest" | "furthest">("furthest");

  const queryClient = useQueryClient();

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['training-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          branches (name),
          coaches (name),
          session_participants (
            id,
            student_id,
            students (name, package_type)
          )
        `)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching training sessions:', error);
        throw new Error(`Failed to fetch training sessions: ${error.message}`);
      }
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
      console.log('Fetched branches:', data); // Debug: Log branches
      return data;
    }
  });

  const { data: coaches, isLoading: coachesLoading, error: coachesError } = useQuery({
    queryKey: ['coaches-select', formData.package_type],
    queryFn: async () => {
      const query = supabase
        .from('coaches')
        .select('id, name, package_type')
        .order('name');

      let data, error;
      if (formData.package_type === 'Camp Training') {
        ({ data, error } = await query.or('package_type.eq.Camp Training,package_type.is.null'));
      } else if (formData.package_type === 'Personal Training') {
        ({ data, error } = await query.eq('package_type', 'Personal Training'));
      } else {
        return []; // Return empty array if no package_type is selected
      }

      if (error) {
        console.error('coaches query error:', error);
        throw error;
      }
      console.log(`Fetched coaches for ${formData.package_type}:`, data); // Debug: Log coaches
      return data as { id: string; name: string; }[];
    },
    enabled: !!formData.package_type, // Only fetch when package_type is selected
  });

  const { data: students, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students-select', formData.package_type, formData.coach_id],
    queryFn: async () => {
      if (!formData.package_type || !formData.coach_id) return []; // Return empty array if package_type or coach_id is not selected
      const { data, error } = await supabase
        .from('students')
        .select('id, name, remaining_sessions, package_type, coach_id')
        .eq('package_type', formData.package_type)
        .eq('coach_id', formData.coach_id)
        .order('name');
      
      if (error) {
        console.error('students query error:', error);
        throw error;
      }
      console.log(`Fetched students for package_type=${formData.package_type} and coach_id=${formData.coach_id}:`, data); // Debug: Log students
      return data as Student[];
    },
    enabled: !!formData.package_type && !!formData.coach_id, // Only fetch when both package_type and coach_id are selected
  });

  const createMutation = useMutation({
    mutationFn: async (session: typeof formData) => {
      if (!session.package_type) {
        throw new Error('Package type is required');
      }

      const invalidStudents = selectedStudents.filter(studentId => {
        const student = students?.find(s => s.id === studentId);
        return student && (student.package_type !== session.package_type || student.coach_id !== session.coach_id);
      });

      if (invalidStudents.length > 0) {
        throw new Error('Selected students must match the session package_type and coach');
      }

      // Check for conflicts
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
        .insert([{ ...session, package_type: session.package_type || null }])
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
      if (!session.package_type) {
        throw new Error('Package type is required');
      }

      const invalidStudents = selectedStudents.filter(studentId => {
        const student = students?.find(s => s.id === studentId);
        return student && (student.package_type !== session.package_type || student.coach_id !== session.coach_id);
      });

      if (invalidStudents.length > 0) {
        throw new Error('Selected students must match the session package_type and coach');
      }

      const { data, error } = await supabase
        .from('training_sessions')
        .update({ ...session, package_type: session.package_type || null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Update participants
      await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', id);

      if (selectedStudents.length > 0) {
        await supabase
          .from('session_participants')
          .insert(
            selectedStudents.map(studentId => ({
              session_id: id,
              student_id: studentId
            }))
          );

        // Update attendance records
        await supabase
          .from('attendance_records')
          .delete()
          .eq('session_id', id);

        await supabase
          .from('attendance_records')
          .insert(
            selectedStudents.map(studentId => ({
              session_id: id,
              student_id: studentId,
              status: 'pending' as const
            }))
          );
      }

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
      status: "scheduled" as SessionStatus,
      package_type: "",
    });
    setSelectedStudents([]);
    setEditingSession(null);
    setIsDialogOpen(false);
    setIsParticipantsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.package_type) {
      toast.error('Please select a package type');
      return;
    }

    if (!formData.coach_id) {
      toast.error('Please select a coach');
      return;
    }

    // Conflict Check
    const hasConflict = sessions?.some(session =>
      session.coach_id === formData.coach_id &&
      session.date === formData.date &&
      (
        (formData.start_time < session.end_time) &&
        (formData.end_time > session.start_time)
      ) &&
      (!editingSession || editingSession.id !== session.id)
    );

    if (hasConflict) {
      toast.error('This coach is already scheduled for a session on this date/time.');
      return;
    }

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
      status: session.status,
      package_type: session.package_type || "",
    });
    setSelectedStudents(session.session_participants.map(p => p.student_id));
    setIsDialogOpen(true);
  };

  const handleManageParticipants = (session: TrainingSession) => {
    setSelectedSession(session);
    setSelectedStudents(
      session.session_participants?.map(p => p.student_id) || []
    );
    setIsParticipantsDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'completed': return 'bg-green-50 text-green-700 border border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  // Filter and sort sessions
  const filteredSessions = sessions
    ?.filter(session => 
      filterPackageType === "All" || session.package_type === filterPackageType
    )
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "closest" ? dateA - dateB : dateB - dateA;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ backgroundColor: '#faf0e8' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#fc7416' }}></div>
        <span className="ml-3 text-gray-600">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-6">
      <div className="max-w-7xl mx-auto -mt-5">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Training Sessions</h1>
              <p className="text-gray-600">Schedule and manage basketball training sessions</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => resetForm()}
                  className="px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: '#fc7416', color: 'white' }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#fffefe' }}>
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    {editingSession ? 'Edit Training Session' : 'Schedule New Training Session'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    {editingSession ? 'Update session details and participants' : 'Create a new training session for your players'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Package Type Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="package_type" className="flex items-center text-sm font-medium text-gray-700">
                      <Users className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                      Package Type
                    </Label>
                    <Select
                      value={formData.package_type}
                      onValueChange={(value: "Camp Training" | "Personal Training") => {
                        setFormData(prev => ({ ...prev, package_type: value, coach_id: "", notes: prev.notes }));
                        setSelectedStudents([]); // Reset students when package_type changes
                      }}
                      required
                    >
                      <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Camp Training">Camp Training</SelectItem>
                        <SelectItem value="Personal Training">Personal Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch and Coach Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="branch" className="flex items-center text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Branch Location
                      </Label>
                      <Select 
                        value={formData.branch_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value }))}
                        disabled={!formData.package_type}
                      >
                        <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                          <SelectValue placeholder={formData.package_type ? "Select branch" : "Select package type first"} />
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
                    <div className="space-y-2">
                      <Label htmlFor="coach" className="flex items-center text-sm font-medium text-gray-700">
                        <User className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Assigned Coach
                      </Label>
                      <Select 
                        value={formData.coach_id} 
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, coach_id: value }));
                          setSelectedStudents([]); // Reset students when coach changes
                        }}
                        disabled={!formData.package_type || coachesLoading}
                      >
                        <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                          <SelectValue placeholder={
                            coachesLoading ? "Loading coaches..." : 
                            coachesError ? "Error loading coaches" : 
                            coaches?.length === 0 ? `No coaches for ${formData.package_type}` : 
                            formData.package_type ? "Select coach" : "Select package type first"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {coaches?.map(coach => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {coachesError && (
                        <p className="text-sm text-red-600 mt-1">Error loading coaches: {(coachesError as Error).message}</p>
                      )}
                      {!coachesLoading && coaches?.length === 0 && formData.package_type && (
                        <p className="text-sm text-gray-600 mt-1">No coaches available for {formData.package_type}.</p>
                      )}
                    </div>
                  </div>

                  {/* Date and Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center text-sm font-medium text-gray-700">
                        <Calendar className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Session Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        required
                        className="border-2 focus:border-orange-500 rounded-lg"
                        disabled={!formData.package_type}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-sm font-medium text-gray-700">Session Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: SessionStatus) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={!formData.package_type}
                      >
                        <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
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

                  {/* Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="start_time" className="flex items-center text-sm font-medium text-gray-700">
                        <Clock className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Start Time
                      </Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        required
                        className="border-2 focus:border-orange-500 rounded-lg"
                        disabled={!formData.package_type}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time" className="flex items-center text-sm font-medium text-gray-700">
                        <Clock className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        End Time
                      </Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                        required
                        className="border-2 focus:border-orange-500 rounded-lg"
                        disabled={!formData.package_type}
                      />
                    </div>
                  </div>

                  {/* Players Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Users className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                      Select Players ({selectedStudents.length} selected)
                    </Label>
                    <div className="border-2 rounded-lg p-4 max-h-48 overflow-y-auto" style={{ backgroundColor: '#faf0e8', borderColor: '#fc7416' }}>
                      {formData.package_type && formData.coach_id ? (
                        studentsLoading ? (
                          <p className="text-sm text-gray-600">Loading students...</p>
                        ) : studentsError ? (
                          <p className="text-sm text-red-600">Error loading students: {(studentsError as Error).message}</p>
                        ) : students?.length === 0 ? (
                          <p className="text-sm text-gray-600">No students available for this coach and {formData.package_type}.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {students?.map(student => (
                              <div key={student.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white transition-colors">
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
                                  className="w-4 h-4 rounded border-2 border-orange-400 text-orange-500 focus:ring-orange-500"
                                />
                                <Label htmlFor={student.id} className="flex-1 text-sm cursor-pointer">
                                  <span className="font-medium">{student.name}</span>
                                  <span className="text-gray-500 ml-2">({student.remaining_sessions} sessions left)</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-gray-600">Select a package type and coach to view available students.</p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                      Session Notes (Optional)
                    </Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any special notes or instructions for this session..."
                      className="border-2 focus:border-orange-500 rounded-lg"
                      disabled={!formData.package_type}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                    {editingSession && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => {
                          if (editingSession) {
                            deleteMutation.mutate(editingSession.id);
                            resetForm();
                          }
                        }}
                        disabled={deleteMutation.isPending || !formData.package_type}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Session
                      </Button>
                    )}
                    <div className="flex space-x-3 w-full sm:w-auto">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm} 
                        className="flex-1 sm:flex-none"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending || !formData.package_type || !formData.coach_id}
                        className="flex-1 sm:flex-none font-semibold"
                        style={{ backgroundColor: '#fc7416', color: 'white' }}
                      >
                        {editingSession ? 'Update Session' : 'Schedule Session'}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filter and Sort Controls */}
          <div className="mt-6 p-4 bg-white rounded-lg shadow-md border border-[#fc7416]/20">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="filter-package" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                  Filter by Package Type
                </Label>
                <Select
                  value={filterPackageType}
                  onValueChange={(value: "All" | "Personal Training" | "Camp Training") => setFilterPackageType(value)}
                >
                  <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                    <SelectValue placeholder="Select package type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Sessions</SelectItem>
                    <SelectItem value="Personal Training">Personal Training</SelectItem>
                    <SelectItem value="Camp Training">Camp Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="sort-order" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                  Sort by Date
                </Label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: "closest" | "furthest") => setSortOrder(value)}
                >
                  <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                    <SelectValue placeholder="Select sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closest">Closest Date</SelectItem>
                    <SelectItem value="furthest">Furthest Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Showing {filteredSessions?.length || 0} session{filteredSessions?.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Sessions Grid */}
        <Card className="shadow-xl border-2 border-[#fc7416]/20" style={{ backgroundColor: '#fffefe' }}>
          <CardContent className="p-6 border-b border-[#fc7416]/10">
            {filteredSessions?.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Training Sessions</h3>
                <p className="text-gray-600 mb-6">
                  {filterPackageType === "All" 
                    ? "Get started by scheduling your first training session" 
                    : `No ${filterPackageType} sessions found. Try adjusting the filter or schedule a new session.`}
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="font-semibold"
                  style={{ backgroundColor: '#fc7416', color: 'white' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule {filterPackageType === "All" ? "First" : filterPackageType} Session
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSessions.map((session) => (
                  <Card 
                    key={session.id} 
                    onClick={() => handleEdit(session)} 
                    className="cursor-pointer border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-xl border-[#fc7416]/20 hover:border-[#fc7416]/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5" style={{ color: '#fc7416' }} />
                          <h3 className="font-bold text-lg text-gray-900">
                            {format(new Date(session.date), 'MMM dd, yyyy')}
                          </h3>
                        </div>
                        <Badge className={`font-medium ${getStatusBadgeColor(session.status)}`}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {session.start_time && session.end_time ? (
                            `${format(new Date(`1970-01-01T${session.start_time}`), 'hh:mm a')} - ${format(new Date(`1970-01-01T${session.end_time}`), 'hh:mm a')}`
                          ) : 'Invalid Time'}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm"><span className="font-medium">Coach:</span> {session.coaches.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm"><span className="font-medium">Branch:</span> {session.branches.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm"><span className="font-medium">Package:</span> {session.package_type || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">{session.session_participants?.length || 0} Players</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageParticipants(session);
                          }}
                          className="text-xs border-[#fc7416] text-[#fc7416] hover:bg-orange-500 hover:text-white"
                        >
                          Manage
                        </Button>
                      </div>
                      
                      {session.notes && (
                        <div className="mt-3 p-2 bg-white rounded-md border border-[#ffd3b4]">
                          <p className="text-xs text-gray-600 italic">"{session.notes}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Management Dialog */}
        <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
          <DialogContent className="max-w-lg" style={{ backgroundColor: '#fffefe' }}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">Manage Session Participants</DialogTitle>
              <DialogDescription className="text-gray-600">
                Add or remove players from this training session
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#faf0e8' }}>
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Session Date:</span>{' '}
                  {selectedSession?.date ? format(new Date(selectedSession.date), 'MMMM dd, yyyy') : 'Invalid Date'}
                </p>
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Package Type:</span> {selectedSession?.package_type || 'N/A'}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Coach:</span> {selectedSession?.coaches.name || 'N/A'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Currently selected: {selectedStudents.length} players
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Available Players</Label>
                <div className="border-2 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2" style={{ borderColor: '#fc7416', backgroundColor: '#faf0e8' }}>
                  {studentsLoading ? (
                    <p className="text-sm text-gray-600">Loading students...</p>
                  ) : studentsError ? (
                    <p className="text-sm text-red-600">Error loading students: {(studentsError as Error).message}</p>
                  ) : students?.length === 0 ? (
                    <p className="text-sm text-gray-600">No students available for this coach and {selectedSession?.package_type}.</p>
                  ) : (
                    students?.map(student => (
                      <div key={student.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          id={`participant-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-2 border-orange-400 text-orange-500 focus:ring-orange-500"
                        />
                        <Label htmlFor={`participant-${student.id}`} className="flex-1 text-sm cursor-pointer">
                          <span className="font-medium">{student.name}</span>
                          <span className="text-gray-500 ml-2">({student.remaining_sessions} sessions left)</span>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsParticipantsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedSession) return;
                    
                    // Validate students
                    const invalidStudents = selectedStudents.filter(studentId => {
                      const student = students?.find(s => s.id === studentId);
                      return student && (student.package_type !== selectedSession.package_type || student.coach_id !== selectedSession.coach_id);
                    });

                    if (invalidStudents.length > 0) {
                      toast.error('Selected students must match the session package type and coach');
                      return;
                    }

                    // Remove all participants
                    await supabase
                      .from('session_participants')
                      .delete()
                      .eq('session_id', selectedSession.id);
                    
                    // Re-insert selected participants
                    if (selectedStudents.length > 0) {
                      await supabase
                        .from('session_participants')
                        .insert(
                          selectedStudents.map(studentId => ({
                            session_id: selectedSession.id,
                            student_id: studentId
                          }))
                        );

                      // Re-create attendance records
                      await supabase
                        .from('attendance_records')
                        .delete()
                        .eq('session_id', selectedSession.id);

                      await supabase
                        .from('attendance_records')
                        .insert(
                          selectedStudents.map(studentId => ({
                            session_id: selectedSession.id,
                            student_id: studentId,
                            status: 'pending' as const
                          }))
                        );
                    }

                    queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
                    toast.success('Participants updated successfully');
                    setIsParticipantsDialogOpen(false);
                  }}
                  className="font-semibold"
                  style={{ backgroundColor: '#fc7416', color: 'white' }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}