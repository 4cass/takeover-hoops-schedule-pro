import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Coach = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export function CoachesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const queryClient = useQueryClient();

  const { data: coaches, isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coach[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (coach: typeof formData) => {
      const { data, error } = await supabase
        .from('coaches')
        .insert([{ name: coach.name, email: coach.email, phone: coach.phone || null }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      toast.success('Coach created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create coach: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...coach }: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from('coaches')
        .update({ name: coach.name, email: coach.email, phone: coach.phone || null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      toast.success('Coach updated successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update coach: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      toast.success('Coach deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete coach: ' + error.message);
    }
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
      phone: coach.phone || ""
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading coaches...</div>;
  }

  return (
    <Card className="shadow-lg border-none" style={{ backgroundColor: '#e8e8e8' }}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Coaches Management</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Manage coach information</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="bg-primary hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add Coach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCoach ? 'Edit Coach' : 'Add New Coach'}</DialogTitle>
                <DialogDescription>
                  {editingCoach ? 'Update coach information' : 'Add a new coach to the system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCoach ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coaches?.map((coach) => (
            <Card key={coach.id} className="shadow-md border-none bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-left gap-x-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Name: </span>
                  <span className="text-gray-900 dark:text-gray-100 font-semibold"> {coach.name}</span>
                </div>
                <div className="flex justify-left gap-x-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Email: </span>
                  <span className="text-gray-900 dark:text-gray-100"> {coach.email}</span>
                </div>
                <div className="flex justify-left gap-x-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Phone: </span>
                  <span className="text-gray-900 dark:text-gray-100"> {coach.phone || 'N/A'}</span>
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(coach)} className="flex-1 hover:scale-105">
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(coach.id)} className="flex-1 hover:scale-105">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {(!coaches || coaches.length === 0) && (
          <p className="text-center py-4 text-gray-500 dark:text-gray-400">No coaches found.</p>
        )}
      </CardContent>
    </Card>
  );
}
