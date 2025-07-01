
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFilteredStudents } from '@/hooks/useFilteredStudents';
import { Tables } from '@/integrations/supabase/types';

const sessionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  branch_id: z.string().min(1, 'Branch is required'),
  coach_id: z.string().min(1, 'Coach is required'),
  package_type: z.enum(['Personal Training', 'Camp Training']).optional(),
  notes: z.string().optional(),
  participant_ids: z.array(z.string()).optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  session?: Tables<'training_sessions'> & {
    session_participants?: { student_id: string }[];
  };
  onSubmit: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
}

export const SessionForm: React.FC<SessionFormProps> = ({ session, onSubmit, onCancel }) => {
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>(
    session?.coach_id || undefined
  );
  const [selectedPackageType, setSelectedPackageType] = useState<string | undefined>(
    session?.package_type || undefined
  );
  const [selectedCoach, setSelectedCoach] = useState<Tables<'coaches'> | undefined>();

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch coaches
  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coaches').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch filtered students based on coach and package type
  const { data: students = [] } = useFilteredStudents(selectedCoachId, selectedPackageType);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: session?.date || '',
      start_time: session?.start_time || '',
      end_time: session?.end_time || '',
      branch_id: session?.branch_id || '',
      coach_id: session?.coach_id || '',
      package_type: session?.package_type as 'Personal Training' | 'Camp Training' || undefined,
      notes: session?.notes || '',
      participant_ids: session?.session_participants?.map(p => p.student_id) || [],
    },
  });

  const watchedCoachId = watch('coach_id');
  const watchedPackageType = watch('package_type');
  const watchedParticipantIds = watch('participant_ids') || [];

  // Update selected coach when coach ID changes
  useEffect(() => {
    if (watchedCoachId !== selectedCoachId) {
      setSelectedCoachId(watchedCoachId);
      const coach = coaches.find(c => c.id === watchedCoachId);
      setSelectedCoach(coach);
      
      // Reset package type and participants when coach changes
      setValue('package_type', undefined);
      setValue('participant_ids', []);
      setSelectedPackageType(undefined);
    }
  }, [watchedCoachId, selectedCoachId, setValue, coaches]);

  useEffect(() => {
    if (watchedPackageType !== selectedPackageType) {
      setSelectedPackageType(watchedPackageType);
      // Reset participants when package type changes
      setValue('participant_ids', []);
    }
  }, [watchedPackageType, selectedPackageType, setValue]);

  const handleParticipantToggle = (studentId: string, checked: boolean) => {
    const currentIds = watchedParticipantIds;
    if (checked) {
      setValue('participant_ids', [...currentIds, studentId]);
    } else {
      setValue('participant_ids', currentIds.filter(id => id !== studentId));
    }
  };

  // Get available package types based on selected coach
  const getAvailablePackageTypes = () => {
    if (!selectedCoach?.package_type) return [];
    
    if (selectedCoach.package_type === 'Personal Training') {
      return ['Personal Training'];
    } else if (selectedCoach.package_type === 'Camp Training') {
      return ['Camp Training', 'Personal Training'];
    }
    
    return [];
  };

  const availablePackageTypes = getAvailablePackageTypes();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          {...register('date')}
        />
        {errors.date && (
          <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            {...register('start_time')}
          />
          {errors.start_time && (
            <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            {...register('end_time')}
          />
          {errors.end_time && (
            <p className="text-sm text-red-600 mt-1">{errors.end_time.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="branch_id">Branch</Label>
        <Select
          value={watch('branch_id') || ''}
          onValueChange={(value) => setValue('branch_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branch_id && (
          <p className="text-sm text-red-600 mt-1">{errors.branch_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="coach_id">Coach</Label>
        <Select
          value={selectedCoachId || ''}
          onValueChange={(value) => {
            setValue('coach_id', value);
            setSelectedCoachId(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select coach" />
          </SelectTrigger>
          <SelectContent>
            {coaches.map((coach) => (
              <SelectItem key={coach.id} value={coach.id}>
                {coach.name}
                {coach.package_type && ` (${coach.package_type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.coach_id && (
          <p className="text-sm text-red-600 mt-1">{errors.coach_id.message}</p>
        )}
      </div>

      {selectedCoach && (
        <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Coach Package Type:</span> {selectedCoach.package_type || 'Not specified'}
          </p>
        </div>
      )}

      {selectedCoach && availablePackageTypes.length > 0 && (
        <div>
          <Label htmlFor="package_type">Package Type</Label>
          <Select
            value={selectedPackageType || ''}
            onValueChange={(value) => {
              const packageType = value as 'Personal Training' | 'Camp Training';
              setValue('package_type', packageType);
              setSelectedPackageType(packageType);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select package type" />
            </SelectTrigger>
            <SelectContent>
              {availablePackageTypes.map((packageType) => (
                <SelectItem key={packageType} value={packageType}>
                  {packageType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCoachId && selectedPackageType && students.length > 0 && (
        <div>
          <Label>Participants</Label>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
            {students.map((student) => (
              <div key={student.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`student-${student.id}`}
                  checked={watchedParticipantIds.includes(student.id)}
                  onCheckedChange={(checked) => 
                    handleParticipantToggle(student.id, checked as boolean)
                  }
                />
                <Label htmlFor={`student-${student.id}`} className="text-sm font-normal">
                  {student.name}
                  <span className="text-gray-500 ml-1">
                    (Sessions: {student.remaining_sessions})
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCoachId && selectedPackageType && students.length === 0 && (
        <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
          No students found with the selected coach and package type combination.
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Enter session notes"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : session ? 'Update Session' : 'Create Session'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
