import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Filter, Search, Users, Calendar, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Coach = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  package_type?: string;
  created_at: string;
};

type SessionRecord = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  branches: { name: string };
  session_participants: { students: { name: string } }[];
};

export function CoachesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecordsDialogOpen, setIsRecordsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    package_type: "",
  });

  const queryClient = useQueryClient();

  const { data: coaches, isLoading } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coach[];
    },
  });

  const { data: sessionRecords, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ["training_sessions", selectedCoach?.id],
    queryFn: async () => {
      if (!selectedCoach) return [];
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          branch_id,
          branches (name),
          session_participants (students (name))
        `)
        .eq("coach_id", selectedCoach.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as SessionRecord[];
    },
    enabled: !!selectedCoach,
  });

  const filteredCoaches = coaches?.filter((coach) =>
    coach.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const createMutation = useMutation({
    mutationFn: async (coach: typeof formData) => {
      const { data, error } = await supabase
        .from("coaches")
        .insert([{ name: coach.name, email: coach.email, phone: coach.phone || null, package_type: coach.package_type }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach created successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to create coach: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...coach }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from("coaches")
        .update({ name: coach.name, email: coach.email, phone: coach.phone || null, package_type: coach.package_type })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach updated successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to update coach: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coaches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete coach: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", package_type: "" });
    setEditingCoach(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoach) {
      updateMutation.mutate({ ...formData, id: editingCoach.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setFormData({
      name: coach.name,
      email: coach.email,
      phone: coach.phone || "",
      package_type: coach.package_type || "",
    });
    setIsDialogOpen(true);
  };

  const handleShowRecords = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsRecordsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-black mb-3">Loading coaches...</h3>
          <p className="text-lg text-gray-600">Please wait while we fetch the coach data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf0e8] to-[#fffefe] pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Coaches Manager</h1>
          <p className="text-lg text-gray-700">Manage coach information and session history</p>
        </div>

        {/* Coaches Card */}
        <Card className="border-2 border-[#fc7416]/20 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-[#fc7416]/10 bg-gradient-to-r from-[#fc7416]/5 to-[#fe822d]/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center">
                  <Users className="h-6 w-6 mr-3 text-[#fc7416]" />
                  Coach Management
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  View and manage coach profiles
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="bg-[#fc7416] hover:bg-[#fe822d] text-white transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Coach
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-[#fc7416]/20 bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-black">
                      {editingCoach ? "Edit Coach" : "Add New Coach"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 text-base">
                      {editingCoach ? "Update coach information" : "Add a new coach to the system"}
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
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-[#fc7416]/20 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
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
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-[#fc7416]/20 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-[#fc7416]/20 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="packageType" className="text-gray-700 font-medium">Package Type</Label>
                      <select
                        id="packageType"
                        value={formData.package_type}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, package_type: e.target.value }))
                        }
                        required
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20 w-full h-10 px-2"
                      >
                        <option value="">Select Package</option>
                        <option value="Camp Training">Camp Training</option>
                        <option value="Personal Training">Personal Training</option>
                      </select>
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
                        {editingCoach ? "Update" : "Create"}
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
                <h3 className="text-lg font-semibold text-black">Filter Coaches</h3>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coaches..."
                  className="pl-10 pr-4 py-3 w-full border-2 border-[#fc7416]/20 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Coaches Table */}
            <div className="border-2 border-[#fc7416]/20 rounded-2xl bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#fc7416] to-[#fe822d] text-white">
                    <tr>
                      <th className="py-4 px-6 text-left font-semibold">Coach Name</th>
                      <th className="py-4 px-6 text-left font-semibold">Email</th>
                      <th className="py-4 px-6 text-left font-semibold">Phone</th>
                      <th className="py-4 px-6 text-left font-semibold">Package Type</th>
                      <th className="py-4 px-6 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoaches.map((coach, index) => (
                      <tr
                        key={coach.id}
                        onClick={() => handleShowRecords(coach)}
                        className={`transition-all duration-300 hover:bg-[#fc7416]/5 cursor-pointer ${
                          index % 2 === 0 ? "bg-white" : "bg-[#faf0e8]/20"
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fc7416] to-[#fe822d] flex items-center justify-center text-white font-semibold">
                              {coach.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </div>
                            <span className="font-semibold text-black">{coach.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-700 font-medium">{coach.email}</td>
                        <td className="py-4 px-6 text-gray-700 font-medium">{coach.phone || "N/A"}</td>
                        <td className="py-4 px-6 text-gray-700 font-medium">{coach.package_type || "N/A"}</td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(coach)}
                              className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300 hover:scale-105"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(coach.id)}
                              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 hover:scale-105"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCoaches.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No coaches found" : "No coaches"}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm ? "Try adjusting your search terms." : "Add a new coach to get started."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Records Modal */}
        <Dialog open={isRecordsDialogOpen} onOpenChange={setIsRecordsDialogOpen}>
          <DialogContent className="max-w-4xl border-2 border-[#fc7416]/20 bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-black">
                Session History for {selectedCoach?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                View session details for this coach
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Coach Details */}
              <div className="border-b border-[#fc7416]/20 pb-4">
                <h3 className="text-lg font-semibold text-black mb-3">Coach Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {selectedCoach?.name}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {selectedCoach?.email}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Phone:</span> {selectedCoach?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700"><span className="font-medium">Package Type:</span> {selectedCoach?.package_type || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Session Records */}
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Session Records</h3>
                {recordsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#fc7416' }}></div>
                    <p className="text-gray-600 mt-2">Loading session records...</p>
                  </div>
                ) : recordsError ? (
                  <p className="text-red-600 text-sm">Error loading records: {(recordsError as Error).message}</p>
                ) : sessionRecords?.length === 0 ? (
                  <p className="text-gray-600 text-sm">No session records found for this coach.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-2 border-[#fc7416]/20 rounded-xl">
                      <thead className="bg-gradient-to-r from-[#fc7416] to-[#fe822d] text-white">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold"><Calendar className="w-4 h-4 inline mr-2" />Date</th>
                          <th className="py-3 px-4 text-left font-semibold"><Clock className="w-4 h-4 inline mr-2" />Time</th>
                          <th className="py-3 px-4 text-left font-semibold"><MapPin className="w-4 h-4 inline mr-2" />Branch</th>
                          <th className="py-3 px-4 text-left font-semibold"><User className="w-4 h-4 inline mr-2" />Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionRecords?.map((record, index) => (
                          <tr
                            key={record.id}
                            className={`transition-all duration-300 ${index % 2 === 0 ? "bg-white" : "bg-[#faf0e8]/20"}`}
                          >
                            <td className="py-3 px-4 text-gray-700">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {format(new Date(`1970-01-01T${record.start_time}`), 'hh:mm a')} - 
                              {format(new Date(`1970-01-01T${record.end_time}`), 'hh:mm a')}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{record.branches.name}</td>
                            <td className="py-3 px-4 text-gray-700">
                              {record.session_participants.map(participant => participant.students.name).join(", ") || "No students"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsRecordsDialogOpen(false)}
                  className="border-[#fc7416]/30 text-[#fc7416] hover:bg-[#fc7416] hover:text-white transition-all duration-300 hover:scale-105"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}