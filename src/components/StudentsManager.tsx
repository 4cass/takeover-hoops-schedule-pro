import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sessions: number;
  remaining_sessions: number;
  created_at: string;
};

type StudentProgress = {
  student_id: string;
  attended_sessions: number;
};

export function StudentsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    sessions: 0,
    remaining_sessions: 0
  });

  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Student[];
    }
  });

  const { data: studentProgress } = useQuery({
    queryKey: ['student-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('status', 'present');

      if (error) throw error;

      const progressMap = new Map<string, number>();

      data.forEach((record: { student_id: string }) => {
        progressMap.set(record.student_id, (progressMap.get(record.student_id) || 0) + 1);
      });

      return Array.from(progressMap.entries()).map(([student_id, attended_sessions]) => ({
        student_id,
        attended_sessions
      })) as StudentProgress[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      const { data, error } = await supabase
        .from('students')
        .insert([student])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Student created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create student: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...student }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(student)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update student: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete student: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", sessions: 0, remaining_sessions: 0 });
    setEditingStudent(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ ...formData, id: editingStudent.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone || "",
      sessions: student.sessions,
      remaining_sessions: student.remaining_sessions
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading students...</div>;
  }

  return (
    <Card className="shadow-lg border-none" style={{ backgroundColor: '#e8e8e8' }}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Students Management</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Manage student information and session quotas</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => resetForm()}
                className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </DialogTitle>
                <DialogDescription className="text-gray-500 dark:text-gray-400">
                  {editingStudent ? 'Update student information' : 'Add a new student to the system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="totalSessions" className="text-gray-700 dark:text-gray-300">Total Sessions</Label>
                  <Input
                    id="totalSessions"
                    type="number"
                    min="0"
                    value={formData.sessions}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessions: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sessions" className="text-gray-700 dark:text-gray-300">Remaining Sessions</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="0"
                    value={formData.remaining_sessions}
                    onChange={(e) => setFormData(prev => ({ ...prev, remaining_sessions: parseInt(e.target.value) || 0 }))} 
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingStudent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students?.map((student) => {
            const progress = studentProgress?.find(p => p.student_id === student.id);
            const attended = progress?.attended_sessions || 0;
            const total = student.sessions;
            const progressPercentage = total > 0 ? (attended / total) * 100 : 0;
            return (
              <Card key={student.id} className="shadow-md border-none bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-5 space-y-3">
                  <div className="flex space-x-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Name:</span>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{student.name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Email:</span>
                    <p className="text-gray-900 dark:text-gray-100">{student.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Phone:</span>
                    <p className="text-gray-900 dark:text-gray-100">{student.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Session Progress:</span>
                    <p className="text-gray-900 dark:text-gray-100">{attended} of {total} sessions attended</p>
                    <Progress value={progressPercentage} className="h-2 mt-1" />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(student)} className="flex-1 hover:scale-105">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(student.id)} className="flex-1 hover:scale-105">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {(!students || students.length === 0) && (
          <p className="text-center py-4 text-gray-500 dark:text-gray-400">No students found.</p>
        )}
      </CardContent>
    </Card>
  );
}
