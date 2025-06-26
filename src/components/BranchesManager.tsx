
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    contact_info: ""
  });

  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Branch[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (branch: typeof formData) => {
      const { data, error } = await supabase
        .from('branches')
        .insert([{
          ...branch,
          contact_info: branch.contact_info || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Branch created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create branch: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...branch }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from('branches')
        .update({
          ...branch,
          contact_info: branch.contact_info || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update branch: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Branch deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete branch: ' + error.message);
    }
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
      contact_info: branch.contact_info || ""
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading branches...</div>;
  }

  return (
    <Card style={{ backgroundColor: '#e8e8e8' }}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Branches Management</CardTitle>
            <CardDescription>Manage training locations and branch information</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch ? 'Update branch information' : 'Add a new training location'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_info">Contact Information</Label>
                  <Textarea
                    id="contact_info"
                    value={formData.contact_info}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                    placeholder="Phone, email, or other contact details"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingBranch ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {branches?.map((branch) => (
      <Card key={branch.id} className="shadow-md border-none bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-left gap-x-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Name:</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{branch.name}</span>
          </div>
          <div className="flex justify-left gap-x-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Address:</span>
            <span className="text-gray-900 dark:text-gray-100">{branch.address}</span>
          </div>
          <div className="flex justify-left gap-x-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">City:</span>
            <span className="text-gray-900 dark:text-gray-100">{branch.city}</span>
          </div>
          <div className="flex justify-left gap-x-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Contact Info:</span>
            <span className="text-gray-900 dark:text-gray-100">{branch.contact_info || 'N/A'}</span>
          </div>
          <div className="flex space-x-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => handleEdit(branch)} className="flex-1 hover:scale-105">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(branch.id)} className="flex-1 hover:scale-105">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
  {(!branches || branches.length === 0) && (
    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No branches found.</p>
  )}
</CardContent>

    </Card>
  );
}
