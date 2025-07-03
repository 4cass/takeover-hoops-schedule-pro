import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Filter, Search, Users, Calendar, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Coach = Database["public"]["Tables"]["coaches"]["Row"];
type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"] & {
  training_sessions: Database["public"]["Tables"]["training_sessions"]["Row"] & {
    branches: { name: string };
    coaches: { name: string };
  };
};

export function StudentsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecordsDialogOpen, setIsRecordsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPackageType, setFilterPackageType] = useState<"All" | "Personal Training" | "Camp Training">("All");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    sessions: 0,
    remaining_sessions: 0,
    package_type: null as "Camp Training" | "Personal Training" | null,
    coach_id: null as string | null,
  });

  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, email, phone, sessions, remaining_sessions, package_type, coach_id, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("students query error:", error);
        throw error;
      }
      console.log("Fetched students:", data); // Debug: Log students data
      return data as Student[];
    },
  });

  const fetchCoaches = async (packageType: "Camp Training" | "Personal Training" | null): Promise<Coach[]> => {
    console.log("fetchCoaches called with packageType:", packageType); // Debug: Log packageType
    const query = supabase
      .from("coaches")
      .select("id, name, package_type")
      .order("name");

    let data, error;

    if (packageType === "Camp Training") {
      ({ data, error } = await query.or("package_type.eq.Camp Training, package_type.eq.Personal Training, package_type.is.null"));
    } else if (packageType === "Personal Training") {
      ({ data, error } = await query.eq("package_type", "Personal Training"));
    } else {
      ({ data, error } = await query);
    }

    if (error) {
      console.error("coaches query error:", error);
      throw error;
    }

    console.log(`Fetched coaches for ${packageType || "all"}:`, data); // Debug: Log fetched coaches
    return data as Coach[];
  };

  const { data: coaches, isLoading: coachesLoading, error: coachesError } = useQuery({
    queryKey: ["coaches", formData.package_type],
    queryFn: () => fetchCoaches(formData.package_type),
    enabled: !!formData.package_type, // Only fetch when package_type is selected
  });

  const { data: attendanceRecords, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ["attendance_records", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          session_id,
          student_id,
          status,
          training_sessions (
            date,
            start_time,
            end_time,
            branch_id,
            coach_id,
            branches (name),
            coaches (name)
          )
        `)
        .eq("student_id", selectedStudent.id)
        .order("date", { ascending: false, referencedTable: "training_sessions" });
      if (error) {
        console.error("attendance_records query error:", error);
        throw error;
      }
      return data as AttendanceRecord[];
    },
    enabled: !!selectedStudent,
  });

  const filteredStudents = students?.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterPackageType === "All" || student.package_type === filterPackageType)
  ) || [];

  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      const { data, error } = await supabase
        .from("students")
        .insert([{
          name: student.name,
          email: student.email,
          phone: student.phone || null,
          sessions: student.sessions,
          remaining_sessions: student.remaining_sessions,
          package_type: student.package_type,
          coach_id: student.coach_id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Player created successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to create player: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...student }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update({
          name: student.name,
          email: student.email,
          phone: student.phone || null,
          sessions: student.sessions,
          remaining_sessions: student.remaining_sessions,
          package_type: student.package_type,
          coach_id: student.coach_id,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Player updated successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to update player: " + error.message);
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
      toast.success("Player deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete player: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      sessions: 0,
      remaining_sessions: 0,
      package_type: null,
      coach_id: null,
    });
    setEditingStudent(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.package_type) {
      toast.error("Please select a package type");
      return;
    }
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
      sessions: student.sessions || 0,
      remaining_sessions: student.remaining_sessions,
      package_type: student.package_type as "Camp Training" | "Personal Training" | null,
      coach_id: student.coach_id || null,
    });
    setIsDialogOpen(true);
  };

  const handleShowRecords = (student: Student) => {
    setSelectedStudent(student);
    setIsRecordsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <h3 className="text-2xl font-bold text-black mb-3">Loading players...</h3>
          <p className="text-lg text-gray-600">Please wait while we fetch the player data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">Players Manager</h1>
          <p className="text-lg text-gray-700">Manage player information and session quotas</p>
        </div>
        <Card className="border-2 border-black bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-black bg-black">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center">
                  <Users className="h-6 w-6 mr-3 text-[#fc7416]" />
                  Player profiles
                </CardTitle>
                <CardDescription className="text-gray-400 text-base">
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
                      {editingStudent ? "Update player information" : "Add a new player to the system"}
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
                      <Label htmlFor="package_type" className="text-gray-700 font-medium">Package Type</Label>
                      <Select
                        value={formData.package_type ?? undefined}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            package_type: value as "Camp Training" | "Personal Training",
                            coach_id: null, // Reset coach_id when package_type changes
                          }))
                        }
                      >
                        <SelectTrigger className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20">
                          <SelectValue placeholder="Select Package" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Camp Training">Camp Training</SelectItem>
                          <SelectItem value="Personal Training">Personal Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="coach_id" className="text-gray-700 font-medium">Assigned Coach</Label>
                      <Select
                        value={formData.coach_id ?? undefined}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, coach_id: value }))}
                        disabled={!formData.package_type || coachesLoading}
                      >
                        <SelectTrigger className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20">
                          <SelectValue placeholder={coachesLoading ? "Loading coaches..." : coachesError ? "Error loading coaches" : coaches?.length === 0 ? "No coaches available" : "Select Coach"} />
                        </SelectTrigger>
                        <SelectContent>
                          {coaches?.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.name} 
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {coachesError && (
                        <p className="text-red-600 text-sm mt-1">Error loading coaches: {(coachesError as Error).message}</p>
                      )}
                      {!coachesLoading && coaches?.length === 0 && (
                        <p className="text-gray-600 text-sm mt-1">
                          No coaches available for {formData.package_type}.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="sessions" className="text-gray-700 font-medium">Total Sessions</Label>
                      <Input
                        id="sessions"
                        type="number"
                        min="0"
                        value={formData.sessions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sessions: parseInt(e.target.value) || 0 }))}
                        className="mt-1 border-2 border-[#fc7416]/20 rounded-xl focus:border-[#fc7416] focus:ring-[#fc7416]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="remaining_sessions" className="text-gray-700 font-medium">Remaining Sessions</Label>
                      <Input
                        id="remaining_sessions"
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
                        disabled={createMutation.isPending || updateMutation.isPending || !formData.package_type}
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
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 text-[#fc7416] mr-2" />
                <h3 className="text-lg font-semibold text-black">Filter Players</h3>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl text-sm focus:border-[#fc7416] focus:ring-[#fc7416]/20 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-package" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 mr-2" style={{ color: '#fc7416' }} />
                    Filter by Package Type
                  </Label>
                  <Select
                    value={filterPackageType}
                    onValueChange={(value: "All" | "Personal Training" | "Camp Training") => setFilterPackageType(value)}
                  >
                    <SelectTrigger className="border-2 focus:border-[#fc7416] rounded-xl">
                      <SelectValue placeholder="Select package type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Players</SelectItem>
                      <SelectItem value="Personal Training">Personal Training</SelectItem>
                      <SelectItem value="Camp Training">Camp Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Showing {filteredStudents.length} player{filteredStudents.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="border-2 border-black rounded-2xl bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="py-4 px-6 text-left font-semibold">Player Name</th>
                      <th className="py-4 px-6 text-left font-semibold">Email</th>
                      <th className="py-4 px-6 text-left font-semibold">Phone</th>
                      <th className="py-4 px-6 text-left font-semibold">Package</th>
                      <th className="py-4 px-6 text-left font-semibold">Session Progress</th>
                      <th className="py-4 px-6 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const attended = (student.sessions || 0) - student.remaining_sessions;
                      const total = student.sessions || 0;
                      const progressPercentage = total > 0 ? (attended / total) * 100 : 0;
                      return (
                        <tr
                          key={student.id}
                          onClick={() => handleShowRecords(student)}
                          className={`transition-all duration-300 hover:bg-[#fc7416]/5 cursor-pointer ${
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
                          <td className="py-4 px-6 text-gray-700 font-medium">
                            {student.package_type || "N/A"}
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <p className="text-gray-700 font-medium">{attended} of {total} sessions attended</p>
                              <Progress value={progressPercentage} className="h-2 mt-1" />
                            </div>
                          </td>
                          <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
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
                    {searchTerm || filterPackageType !== "All" ? `No ${filterPackageType === "All" ? "" : filterPackageType} players found` : "No players"}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filterPackageType !== "All" ? "Try adjusting your search or filter." : "Add a new player to get started."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Dialog open={isRecordsDialogOpen} onOpenChange={setIsRecordsDialogOpen}>
          <DialogContent className="max-w-4xl border-2 border-black bg-gradient-to-br from-[#faf0e8]/30 to-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-black">
                History Records for {selectedStudent?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                View session attendance and details for this player
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="border-b border-black pb-4">
                <h3 className="text-lg font-semibold text-black mb-3">Player Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {selectedStudent?.name}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {selectedStudent?.email}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Phone:</span> {selectedStudent?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700"><span className="font-medium">Package Type:</span> {selectedStudent?.package_type || "N/A"}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Total Sessions:</span> {selectedStudent?.sessions || 0}</p>
                    <p className="text-sm text-gray-700"><span className="font-medium">Remaining Sessions:</span> {selectedStudent?.remaining_sessions}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Session Records</h3>
                {recordsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: "#fc7416" }}></div>
                    <p className="text-gray-600 mt-2">Loading attendance records...</p>
                  </div>
                ) : recordsError ? (
                  <p className="text-red-600 text-sm">Error loading records: {(recordsError as Error).message}</p>
                ) : attendanceRecords?.length === 0 ? (
                  <p className="text-gray-600 text-sm">No attendance records found for this player.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-2 border-black rounded-xl">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold"><Calendar className="w-4 h-4 inline mr-2" />Date</th>
                          <th className="py-3 px-4 text-left font-semibold"><Clock className="w-4 h-4 inline mr-2" />Time</th>
                          <th className="py-3 px-4 text-left font-semibold"><MapPin className="w-4 h-4 inline mr-2" />Branch</th>
                          <th className="py-3 px-4 text-left font-semibold"><User className="w-4 h-4 inline mr-2" />Coach</th>
                          <th className="py-3 px-4 text-left font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords?.map((record, index) => (
                          <tr
                            key={record.session_id}
                            className={`transition-all duration-300 ${index % 2 === 0 ? "bg-white" : "bg-[#faf0e8]/20"}`}
                          >
                            <td className="py-3 px-4 text-gray-700">
                              {format(new Date(record.training_sessions.date), "MMM dd, yyyy")}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {format(new Date(`1970-01-01T${record.training_sessions.start_time}`), "hh:mm a")} - 
                              {format(new Date(`1970-01-01T${record.training_sessions.end_time}`), "hh:mm a")}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{record.training_sessions.branches.name}</td>
                            <td className="py-3 px-4 text-gray-700">{record.training_sessions.coaches.name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.status === "present"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "absent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {record.status}
                              </span>
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