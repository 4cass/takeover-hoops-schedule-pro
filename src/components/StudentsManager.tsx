import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Filter, Search, Users } from "lucide-react";
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

export function StudentsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    sessions: 0,
    remaining_sessions: 0,
  });

  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
  });

  const filteredStudents = students?.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      const { data, error } = await supabase
        .from("students")
        .insert([student])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Student created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create student: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...student }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update(student)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update student: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Student deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete student: " + error.message);
    },
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
      remaining_sessions: student.remaining_sessions,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <h3 className="text-2xl font-bold text-black mb-3">Loading players...</h3>
          <p className="text-lg text-gray-600">Please wait while we fetch the player data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Players Manager</h1>
          <p className="text-lg text-gray-700">Manage player information and session quotas</p>
        </div>

        {/* Students Card */}
        <Card className="border-2 border-[#fc7416]/20 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-[#fc7416]/10 bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center">
                  <Users className="h-6 w-6 mr-3 text-[#fc7416]" />
                  Player profiles
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  View and manage player profiles
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="bg-[#fc7416] hover:bg-[#fe822d] text-white transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-[#fc7416]/20 bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-black">
                      {editingStudent ? "Edit Player" : "Add New Player"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 text-base">
                      {editingStudent ? "Update Player information" : "Add a new player to the system"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-gray-700 font-medium">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="totalSessions" className="text-gray-700 font-medium">Total Sessions</Label>
                      <Input
                        id="totalSessions"
                        type="number"
                        min="0"
                        value={formData.sessions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sessions: parseInt(e.target.value) || 0 }))}
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sessions" className="text-gray-700 font-medium">Remaining Sessions</Label>
                      <Input
                        id="sessions"
                        type="number"
                        min="0"
                        value={formData.remaining_sessions}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, remaining_sessions: parseInt(e.target.value) || 0 }))
                        }
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300 hover:scale-105"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-[#fc7416] hover:bg-[#fe822d] text-white transition-all duration-300 hover:scale-105"
                      >
                        {editingStudent ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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

            {/* Students Table */}
            <div className="border-2 border-[#fc7416]/20 rounded-2xl bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#fc7416] to-[#fe822d] text-white">
                    <tr>
                      <th className="py-4 px-6 text-left font-semibold">Player Name</th>
                      <th className="py-4 px-6 text-left font-semibold">Email</th>
                      <th className="py-4 px-6 text-left font-semibold">Phone</th>
                      <th className="py-4 px-6 text-left font-semibold">Session Progress</th>
                      <th className="py-4 px-6 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const attended = student.sessions - student.remaining_sessions;
                      const total = student.sessions;
                      const progressPercentage = total > 0 ? (attended / total) * 100 : 0;
                      return (
                        <tr
                          key={student.id}
                          className={`transition-all duration-300 hover:bg-[#fc7416]/5 ${
                            index % 2 === 0 ? "bg-white" : "bg-[#faf0e8]/20"
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fc7416] to-[#fe822d] flex items-center justify-center text-white font-semibold">
                                {student.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                              </div>
                              <span className="font-semibold text-black">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-700 font-medium">{student.email}</td>
                          <td className="py-4 px-6 text-gray-700 font-medium">{student.phone || "N/A"}</td>
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <p className="text-gray-700 font-medium">{attended} of {total} sessions attended</p>
                              <Progress value={progressPercentage} className="h-2 mt-1" />
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(student)}
                                className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300 hover:scale-105"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(student.id)}
                                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 hover:scale-105"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No players found" : "No players"}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm ? "Try adjusting your search terms." : "Add a new player to get started."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}