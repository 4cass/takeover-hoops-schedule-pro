import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Filter, Search, Users, Calendar, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Coach = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

type SessionRecord = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  branch_id: string;
  branches: { name: string };
  package_type: string | null;
  session_participants: { students: { name: string } }[];
};

export function CoachesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecordsDialogOpen, setIsRecordsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSessionPackageType, setFilterSessionPackageType] = useState<"All" | "Personal Training" | "Camp Training">("All");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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
          package_type,
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

  const filteredSessionRecords = sessionRecords?.filter((record) =>
    filterSessionPackageType === "All" || record.package_type === filterSessionPackageType
  ) || [];

  const createMutation = useMutation({
    mutationFn: async (coach: typeof formData) => {
      // Call the edge function to create coach account
      const { data, error } = await supabase.functions.invoke('create-coach-account', {
        body: {
          name: coach.name,
          email: coach.email,
          phone: coach.phone || null
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.coach;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      toast.success("Coach account created successfully! Default password: TOcoachAccount!1");
      resetForm();
    },
    onError: (error: any) => {
      console.error("Create coach error:", error);
      toast.error("Failed to create coach account: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...coach }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from("coaches")
        .update({ name: coach.name, email: coach.email, phone: coach.phone || null })
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
    setFormData({ name: "", email: "", phone: "" });
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
    });
    setIsDialogOpen(true);
  };

  const handleShowRecords = (coach: Coach) => {
    setSelectedCoach(coach);
    setFilterSessionPackageType("All"); // Reset filter when opening modal
    setIsRecordsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background responsive-padding">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Users className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="responsive-subheading font-bold text-foreground mb-3">Loading coaches...</h3>
          <p className="responsive-body text-muted-foreground">Please wait while we fetch the coach data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 responsive-padding">
      <div className="max-w-7xl mx-auto responsive-spacing -mt-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="responsive-heading font-bold text-foreground mb-2 tracking-tight">Coaches Manager</h1>
          <p className="responsive-body text-muted-foreground">Manage coach information and session history</p>
        </div>

        {/* Coaches Card */}
        <Card className="border-2 border-primary bg-card backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-primary bg-primary">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="responsive-subheading font-bold text-primary-foreground flex items-center">
                  <Users className="h-6 w-6 mr-3 text-accent" />
                  Coach Management
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 responsive-body">
                  View and manage coach profiles
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="bg-accent hover:bg-secondary text-accent-foreground transition-all duration-300 hover:scale-105 responsive-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Coach
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-card shadow-lg max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="responsive-subheading font-bold text-foreground">
                      {editingCoach ? "Edit Coach" : "Create Coach Account"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground responsive-body">
                      {editingCoach ? "Update coach information" : "Create a new coach account with login credentials"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="responsive-spacing">
                    <div>
                      <Label htmlFor="name" className="text-foreground font-medium responsive-small">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        className="mt-1 responsive-button border-2 border-accent/20 rounded-xl focus:border-accent focus:ring-accent/20 bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-foreground font-medium responsive-small">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="mt-1 responsive-button border-2 border-accent/20 rounded-xl focus:border-accent focus:ring-accent/20 bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-foreground font-medium responsive-small">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1 responsive-button border-2 border-accent/20 rounded-xl focus:border-accent focus:ring-accent/20 bg-background"
                      />
                    </div>
                    {!editingCoach && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> A login account will be created with default password: <code className="bg-blue-100 px-1 rounded">TOcoachAccount!1</code>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">The coach can change this password after their first login.</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105 responsive-button mobile-full-width"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-accent hover:bg-secondary text-accent-foreground transition-all duration-300 hover:scale-105 responsive-button mobile-full-width"
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Processing..." : editingCoach ? "Update" : "Create Account"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="responsive-padding">
            {/* Search and Filter */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 text-accent mr-2" />
                <h3 className="responsive-body font-semibold text-foreground">Filter Coaches</h3>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search coaches..."
                  className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl responsive-small focus:border-accent focus:ring-accent/20 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Coaches Table */}
            <div className="border-2 border-primary rounded-2xl bg-gradient-to-br from-accent/5 to-card shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full responsive-table">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="py-4 px-6 text-left font-semibold">Coach Name</th>
                      <th className="py-4 px-6 text-left font-semibold">Email</th>
                      <th className="py-4 px-6 text-left font-semibold">Phone</th>
                      <th className="py-4 px-6 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoaches.map((coach, index) => (
                      <tr
                        key={coach.id}
                        onClick={() => handleShowRecords(coach)}
                        className={`transition-all duration-300 hover:bg-accent/5 cursor-pointer ${
                          index % 2 === 0 ? "bg-background" : "bg-accent/5"
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-accent-foreground font-semibold">
                              {coach.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground">{coach.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">{coach.email}</td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">{coach.phone || "N/A"}</td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(coach)}
                              className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(coach.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all duration-300 hover:scale-105"
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
                  <Users className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="responsive-body font-semibold text-foreground mb-2">
                    {searchTerm ? "No coaches found" : "No coaches"}
                  </h3>
                  <p className="text-muted-foreground responsive-small">
                    {searchTerm ? "Try adjusting your search terms." : "Add a new coach to get started."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Records Modal */}
        <Dialog open={isRecordsDialogOpen} onOpenChange={setIsRecordsDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-card shadow-lg">
            <DialogHeader>
              <DialogTitle className="responsive-subheading font-bold text-foreground">
                Session History for {selectedCoach?.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground responsive-body">
                View session details for this coach
              </DialogDescription>
            </DialogHeader>
            <div className="responsive-spacing">
              {/* Coach Details */}
              <div className="border-b border-primary pb-4">
                <h3 className="responsive-body font-semibold text-foreground mb-3">Coach Details</h3>
                <div className="responsive-grid-2">
                  <div>
                    <p className="responsive-small text-muted-foreground"><span className="font-medium">Name:</span> {selectedCoach?.name}</p>
                    <p className="responsive-small text-muted-foreground"><span className="font-medium">Email:</span> {selectedCoach?.email}</p>
                    <p className="responsive-small text-muted-foreground"><span className="font-medium">Phone:</span> {selectedCoach?.phone || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Session Records */}
              <div>
                <div className="flex items-center mb-4">
                  <Filter className="h-5 w-5 text-accent mr-2" />
                  <h3 className="responsive-body font-semibold text-foreground">Session Records</h3>
                </div>
                <div className="mb-4 max-w-md">
                  <Label htmlFor="filter-session-package" className="flex items-center responsive-small font-medium text-foreground mb-2">
                    <Users className="w-4 h-4 mr-2 text-accent" />
                    Filter by Package Type
                  </Label>
                  <Select
                    value={filterSessionPackageType}
                    onValueChange={(value: "All" | "Personal Training" | "Camp Training") => setFilterSessionPackageType(value)}
                  >
                    <SelectTrigger className="border-2 focus:border-accent rounded-xl">
                      <SelectValue placeholder="Select package type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Sessions</SelectItem>
                      <SelectItem value="Personal Training">Personal Training</SelectItem>
                      <SelectItem value="Camp Training">Camp Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="responsive-small text-muted-foreground mt-2">
                    Showing {filteredSessionRecords.length} session{filteredSessionRecords.length === 1 ? '' : 's'}
                  </p>
                </div>
                {recordsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="text-muted-foreground mt-2 responsive-small">Loading session records...</p>
                  </div>
                ) : recordsError ? (
                  <p className="text-destructive responsive-small">Error loading records: {(recordsError as Error).message}</p>
                ) : filteredSessionRecords.length === 0 ? (
                  <p className="text-muted-foreground responsive-small">
                    {filterSessionPackageType !== "All" ? 
                      `No ${filterSessionPackageType} sessions found for this coach.` : 
                      "No session records found for this coach."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-2 border-primary rounded-xl responsive-table">
                      <thead className="bg-primary text-primary-foreground">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold"><Calendar className="w-4 h-4 inline mr-2" />Date</th>
                          <th className="py-3 px-4 text-left font-semibold"><Clock className="w-4 h-4 inline mr-2" />Time</th>
                          <th className="py-3 px-4 text-left font-semibold"><MapPin className="w-4 h-4 inline mr-2" />Branch</th>
                          <th className="py-3 px-4 text-left font-semibold"><Users className="w-4 h-4 inline mr-2" />Package Type</th>
                          <th className="py-3 px-4 text-left font-semibold"><User className="w-4 h-4 inline mr-2" />Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessionRecords.map((record, index) => (
                          <tr
                            key={record.id}
                            className={`transition-all duration-300 ${index % 2 === 0 ? "bg-background" : "bg-accent/5"}`}
                          >
                            <td className="py-3 px-4 text-muted-foreground">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {format(new Date(`1970-01-01T${record.start_time}`), 'hh:mm a')} - 
                              {format(new Date(`1970-01-01T${record.end_time}`), 'hh:mm a')}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{record.branches.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{record.package_type || "N/A"}</td>
                            <td className="py-3 px-4 text-muted-foreground">
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
                  className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105 responsive-button"
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
