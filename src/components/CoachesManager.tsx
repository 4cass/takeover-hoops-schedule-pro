
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Coach = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

type CoachAvailability = {
  id: string;
  coach_id: string;
  day_of_week: Database['public']['Enums']['day_of_week'];
};

type DayOfWeek = Database['public']['Enums']['day_of_week'];

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export function CoachesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    availability: [] as DayOfWeek[]
  });

  const queryClient = useQueryClient();

  const { data: coaches, isLoading } = useQuery({
    queryKey: ['coaches-with-availability'],
    queryFn: async () => {
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (coachesError) throw coachesError;

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('coach_availability')
        .select('*');
      
      if (availabilityError) throw availabilityError;

      return coachesData.map(coach => ({
        ...coach,
        availability: availabilityData
          .filter(a => a.coach_id === coach.id)
          .map(a => a.day_of_week)
      }));
    }
  });

  const createMutation = useMutation({
    mutationFn: async (coach: typeof formData) => {
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .insert([{
          name: coach.name,
          email: coach.email,
          phone: coach.phone || null
        }])
        .select()
        .single();
      
      if (coachError) throw coachError;

      if (coach.availability.length > 0) {
        const { error: availabilityError } = await supabase
          .from('coach_availability')
          .insert(
            coach.availability.map(day => ({
              coach_id: coachData.id,
              day_of_week: day as DayOfWeek
            }))
          );
        
        if (availabilityError) throw availabilityError;
      }

      return coachData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches-with-availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Coach created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create coach: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...coach }: typeof formData & { id: string }) => {
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .update({
          name: coach.name,
          email: coach.email,
          phone: coach.phone || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (coachError) throw coachError;

      // Delete existing availability and insert new ones
      await supabase
        .from('coach_availability')
        .delete()
        .eq('coach_id', id);

      if (coach.availability.length > 0) {
        const { error: availabilityError } = await supabase
          .from('coach_availability')
          .insert(
            coach.availability.map(day => ({
              coach_id: id,
              day_of_week: day as DayOfWeek
            }))
          );
        
        if (availabilityError) throw availabilityError;
      }

      return coachData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches-with-availability'] });
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
      queryClient.invalidateQueries({ queryKey: ['coaches-with-availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Coach deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete coach: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", availability: [] });
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

  const handleEdit = (coach: any) => {
    setEditingCoach(coach);
    setFormData({
      name: coach.name,
      email: coach.email,
      phone: coach.phone || "",
      availability: coach.availability || []
    });
    setIsDialogOpen(true);
  };

  const handleAvailabilityChange = (day: DayOfWeek, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: checked 
        ? [...prev.availability, day]
        : prev.availability.filter(d => d !== day)
    }));
  };

  if (isLoading) {
    return <div>Loading coaches...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Coaches Management</CardTitle>
            <CardDescription>Manage coach information and availability</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Coach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCoach ? 'Edit Coach' : 'Add New Coach'}
                </DialogTitle>
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
                <div>
                  <Label>Availability</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={formData.availability.includes(day)}
                          onCheckedChange={(checked) => handleAvailabilityChange(day, checked as boolean)}
                        />
                        <Label htmlFor={day} className="capitalize">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches?.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell>{coach.name}</TableCell>
                <TableCell>{coach.email}</TableCell>
                <TableCell>{coach.phone || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {coach.availability?.map((day: DayOfWeek) => (
                      <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(coach)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(coach.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
