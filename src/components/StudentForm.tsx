
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilteredCoaches } from '@/hooks/useFilteredCoaches';
import { Tables } from '@/integrations/supabase/types';

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  package_type: z.enum(['Personal Training', 'Camp Training']).optional(),
  coach_id: z.string().optional(),
  sessions: z.number().min(0).optional(),
  remaining_sessions: z.number().min(0),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Tables<'students'>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmit, onCancel }) => {
  const [selectedPackageType, setSelectedPackageType] = useState<string | undefined>(
    student?.package_type || undefined
  );

  const { data: coaches = [] } = useFilteredCoaches(selectedPackageType);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: student?.name || '',
      email: student?.email || '',
      phone: student?.phone || '',
      package_type: student?.package_type as 'Personal Training' | 'Camp Training' || undefined,
      coach_id: student?.coach_id || undefined,
      sessions: student?.sessions || 0,
      remaining_sessions: student?.remaining_sessions || 0,
    },
  });

  const watchedPackageType = watch('package_type');

  useEffect(() => {
    if (watchedPackageType !== selectedPackageType) {
      setSelectedPackageType(watchedPackageType);
      // Reset coach selection when package type changes
      setValue('coach_id', undefined);
    }
  }, [watchedPackageType, selectedPackageType, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter student name"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="Enter phone number"
        />
      </div>

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
            <SelectItem value="Personal Training">Personal Training</SelectItem>
            <SelectItem value="Camp Training">Camp Training</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="coach_id">Coach</Label>
        <Select
          value={watch('coach_id') || ''}
          onValueChange={(value) => setValue('coach_id', value)}
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
      </div>

      <div>
        <Label htmlFor="sessions">Total Sessions</Label>
        <Input
          id="sessions"
          type="number"
          {...register('sessions', { valueAsNumber: true })}
          placeholder="Enter total sessions"
        />
      </div>

      <div>
        <Label htmlFor="remaining_sessions">Remaining Sessions</Label>
        <Input
          id="remaining_sessions"
          type="number"
          {...register('remaining_sessions', { valueAsNumber: true })}
          placeholder="Enter remaining sessions"
        />
        {errors.remaining_sessions && (
          <p className="text-sm text-red-600 mt-1">{errors.remaining_sessions.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : student ? 'Update Student' : 'Create Student'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
