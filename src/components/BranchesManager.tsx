import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Filter, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  contact_info: string | null;
  created_at: string;
};

export function BranchesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    contact_info: "",
  });

  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Branch[];
    },
  });

  const filteredBranches = branches?.filter((branch) =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pagination logic for branches
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const createMutation = useMutation({
    mutationFn: async (branch: typeof formData) => {
      const { data, error } = await supabase
        .from("branches")
        .insert([{
          ...branch,
          contact_info: branch.contact_info || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Branch created successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to create branch: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...branch }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from("branches")
        .update({
          ...branch,
          contact_info: branch.contact_info || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch updated successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to update branch: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Branch deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete branch: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", address: "", city: "", contact_info: "" });
    setEditingBranch(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateMutation.mutate({ ...formData, id: editingBranch.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      contact_info: branch.contact_info || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-foreground mb-3">Loading branches...</h3>
          <p className="text-lg text-muted-foreground">Please wait while we fetch the branch data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 p-6">
      <div className="max-w-7xl mx-auto space-y-8 -mt-5">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Branches Manager</h1>
          <p className="text-lg text-muted-foreground">Manage training locations and branch information</p>
        </div>

        <Card className="border-2 border-[#181818] bg-white shadow-xl">
          <CardHeader className="border-b border-[#181818] bg-[#181818]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <CardTitle className="text-2xl font-bold text-primary-foreground flex items-center">
                  <Users className="h-6 w-6 mr-3 text-accent" style={{ color: '#BEA877' }} />
                  Branch Management
                </CardTitle>
                <CardDescription className="text-muted text-base">
                  View and manage branch profiles
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-105"
                    style={{ backgroundColor: '#BEA877', color: 'white' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-accent/20 bg-white shadow-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                      {editingBranch ? "Edit Branch" : "Add New Branch"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-base">
                      {editingBranch ? "Update branch information" : "Add a new training location"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-muted-foreground font-medium">Branch Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-accent/20 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-background"
                        style={{ borderColor: '#BEA877' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-muted-foreground font-medium">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                        required
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-accent/20 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-background"
                        style={{ borderColor: '#BEA877' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-muted-foreground font-medium">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        required
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-accent/20 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-background"
                        style={{ borderColor: '#BEA877' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_info" className="text-muted-foreground font-medium">Contact Information</Label>
                      <Textarea
                        id="contact_info"
                        value={formData.contact_info}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contact_info: e.target.value }))}
                        placeholder="Phone, email, or other contact details"
                        className="mt-1 pl-4 pr-4 py-3 border-2 border-accent/20 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-background"
                        style={{ borderColor: '#BEA877' }}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105"
                        style={{ borderColor: '#BEA877', color: '#BEA877' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-105"
                        style={{ backgroundColor: '#BEA877', color: 'white' }}
                      >
                        {editingBranch ? "Update" : "Create"}
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
                <Filter className="h-5 w-5 text-accent mr-2" style={{ color: '#BEA877' }} />
                <h3 className="text-lg font-semibold text-foreground">Filter Branches</h3>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  className="pl-10 pr-4 py-3 w-full border-2 border-accent/40 rounded-xl text-sm focus:border-accent focus:ring-accent/20 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ borderColor: '#BEA877' }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Showing {filteredBranches.length} branch{filteredBranches.length === 1 ? '' : 'es'}
              </p>
            </div>

            <div className=" rounded-2xl bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#181818] text-primary-foreground">
                    <tr>
                      <th className="py-4 px-6 text-left font-semibold">Branch Name</th>
                      <th className="py-4 px-6 text-left font-semibold">Address</th>
                      <th className="py-4 px-6 text-left font-semibold">City</th>
                      <th className="py-4 px-6 text-left font-semibold">Contact Info</th>
                      <th className="py-4 px-6 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBranches.map((branch, index) => (
                      <tr
                        key={branch.id}
                        className={`transition-all duration-300 hover:bg-accent/5 ${
                          index % 2 === 0 ? "bg-white" : "bg-muted/20"
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold" style={{ backgroundColor: '#BEA877' }}>
                              {branch.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground">{branch.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">{branch.address}</td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">{branch.city}</td>
                        <td className="py-4 px-6 text-muted-foreground font-medium">{branch.contact_info || "N/A"}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(branch)}
                              className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105"
                              style={{ borderColor: '#BEA877', color: '#BEA877' }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(branch.id)}
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
              {filteredBranches.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchTerm ? "No branches found" : "No branches"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms." : "Add a new branch to get started."}
                  </p>
                </div>
              ) : totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-2 border-accent text-accent hover:bg-accent hover:text-white"
                    style={{ borderColor: '#BEA877', color: '#BEA877' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => handlePageChange(page)}
                      className={`border-2 ${
                        currentPage === page
                          ? 'bg-accent text-white'
                          : 'border-accent text-accent hover:bg-accent hover:text-white'
                      }`}
                      style={{ 
                        backgroundColor: currentPage === page ? '#BEA877' : 'transparent',
                        borderColor: '#BEA877',
                        color: currentPage === page ? 'white' : '#BEA877'
                      }}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-2 border-accent text-accent hover:bg-accent hover:text-white"
                    style={{ borderColor: '#BEA877', color: '#BEA877' }}
                  >
                    <ChevronRight className="w-4 h-4 " />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}