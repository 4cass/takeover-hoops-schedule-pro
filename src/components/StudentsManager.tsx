
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
import { Plus, Trash2, User, Mail, Phone, BookOpen, Users } from "lucide-react";

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  remaining_sessions: number;
  coach_id: string | null;
  package_type: string | null;
  sessions: number | null;
  coaches?: { name: string };
};

type Coach = {
  id: string;
  name: string;
  package_type: string | null;
};

export function StudentsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    remaining_sessions: 0,
    sessions: 0,
    coach_id: "",
    package_type: "",
  });

  const queryClient = useQueryClient();
  
  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          coaches (name)
        `)
        .order('name');
      
      if (error) {
        console.error('Error fetching students:', error);
        throw new Error(`Failed to fetch students: ${error.message}`);
      }
      return data as Student[];
    }
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name, package_type')
        .order('name');
      
      if (error) throw error;
      return data as Coach[];
    }
  });

  // Filter coaches based on selected package type
  const filteredCoaches = coaches?.filter(coach => 
    formData.package_type === '' || coach.package_type === formData.package_type
  ) || [];

  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...student,
          coach_id: student.coach_id || null,
          package_type: student.package_type || null,
          phone: student.phone || null,
        }])
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
        .update({
          ...student,
          coach_id: student.coach_id || null,
          package_type: student.package_type || null,
          phone: student.phone || null,
        })
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
    setFormData({
      name: "",
      email: "",
      phone: "",
      remaining_sessions: 0,
      sessions: 0,
      coach_id: "",
      package_type: "",
    });
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
      remaining_sessions: student.remaining_sessions,
      sessions: student.sessions || 0,
      coach_id: student.coach_id || "",
      package_type: student.package_type || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ backgroundColor: '#faf0e8' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#fc7416' }}></div>
        <span className="ml-3 text-gray-600">Loading students...</span>
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
              <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Students Management</h1>
              <p className="text-gray-600">Manage student profiles, packages, and session tracking</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => resetForm()}
                  className="px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: '#fc7416', color: 'white' }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#fffefe' }}>
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    {editingStudent ? 'Edit Student Profile' : 'Add New Student'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    {editingStudent ? 'Update student information and training details' : 'Create a new student profile with training package details'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
                          <User className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="border-2 focus:border-orange-500 rounded-lg"
                          placeholder="Enter student's full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
                          <Mail className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="border-2 focus:border-orange-500 rounded-lg"
                          placeholder="student@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center text-sm font-medium text-gray-700">
                        <Phone className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Phone Number (Optional)
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="border-2 focus:border-orange-500 rounded-lg"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  {/* Training Package */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Training Package</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="package_type" className="flex items-center text-sm font-medium text-gray-700">
                        <BookOpen className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Package Type
                      </Label>
                      <Select
                        value={formData.package_type}
                        onValueChange={(value: string) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            package_type: value,
                            coach_id: "" // Reset coach selection when package type changes
                          }));
                        }}
                      >
                        <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                          <SelectValue placeholder="Select training package" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Camp Training">Camp Training</SelectItem>
                          <SelectItem value="Personal Training">Personal Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coach" className="flex items-center text-sm font-medium text-gray-700">
                        <Users className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                        Assigned Coach
                      </Label>
                      <Select 
                        value={formData.coach_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, coach_id: value }))}
                        disabled={!formData.package_type}
                      >
                        <SelectTrigger className="border-2 focus:border-orange-500 rounded-lg">
                          <SelectValue placeholder={
                            !formData.package_type 
                              ? "Select package type first" 
                              : filteredCoaches.length === 0 
                                ? `No coaches available for ${formData.package_type}`
                                : "Select a coach"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCoaches.map(coach => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.package_type && filteredCoaches.length === 0 && (
                        <p className="text-sm text-red-600">
                          No coaches are assigned to {formData.package_type} package type.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sessions" className="text-sm font-medium text-gray-700">
                          Total Sessions
                        </Label>
                        <Input
                          id="sessions"
                          type="number"
                          min="0"
                          value={formData.sessions}
                          onChange={(e) => setFormData(prev => ({ ...prev, sessions: parseInt(e.target.value) || 0 }))}
                          className="border-2 focus:border-orange-500 rounded-lg"
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="remaining_sessions" className="text-sm font-medium text-gray-700">
                          Remaining Sessions
                        </Label>
                        <Input
                          id="remaining_sessions"
                          type="number"
                          min="0"
                          value={formData.remaining_sessions}
                          onChange={(e) => setFormData(prev => ({ ...prev, remaining_sessions: parseInt(e.target.value) || 0 }))}
                          className="border-2 focus:border-orange-500 rounded-lg"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                    {editingStudent && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => {
                          if (editingStudent) {
                            deleteMutation.mutate(editingStudent.id);
                            resetForm();
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Student
                      </Button>
                    )}
                    <div className="flex space-x-3 w-full sm:w-auto">
                      <Button type="button" variant="outline" onClick={resetForm} className="flex-1 sm:flex-none">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="flex-1 sm:flex-none font-semibold"
                        style={{ backgroundColor: '#fc7416', color: 'white' }}
                      >
                        {editingStudent ? 'Update Student' : 'Add Student'}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Students Grid */}
        <Card className="shadow-xl border-2 border-[#fc7416]/20" style={{ backgroundColor: '#fffefe' }}>
          <CardContent className="p-6">
            {students?.length === 0 ? (
              <div className="text-center py-16">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Registered</h3>
                <p className="text-gray-600 mb-6">Start building your training roster by adding your first student</p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="font-semibold"
                  style={{ backgroundColor: '#fc7416', color: 'white' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Student
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {students.map((student) => (
                  <Card 
                    key={student.id} 
                    onClick={() => handleEdit(student)} 
                    className="cursor-pointer border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-xl border-[#fc7416]/20 hover:border-[#fc7416]/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#fc7416' }}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 leading-tight">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {student.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{student.phone}</span>
                        </div>
                      )}
                      
                      {student.package_type && (
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{student.package_type}</span>
                        </div>
                      )}
                      
                      {student.coaches?.name && (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Coach: {student.coaches.name}</span>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Sessions Remaining</span>
                          <span className="text-lg font-bold" style={{ color: '#fc7416' }}>
                            {student.remaining_sessions}
                          </span>
                        </div>
                        {student.sessions && (
                          <div className="text-xs text-gray-500 mt-1">
                            Total: {student.sessions} sessions
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
