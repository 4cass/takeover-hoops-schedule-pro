
-- First, let's see what the current check constraint allows
-- and update it to allow the correct package types that the application uses

-- Drop the existing check constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS package_type_check;

-- Add a new check constraint that allows the package types used in the application
ALTER TABLE public.students ADD CONSTRAINT package_type_check 
  CHECK (package_type IN ('Personal Training', 'Camp Training') OR package_type IS NULL);

-- Also update the coaches table to ensure consistency
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS package_type_check;
ALTER TABLE public.coaches ADD CONSTRAINT coaches_package_type_check 
  CHECK (package_type IN ('Personal Training', 'Camp Training') OR package_type IS NULL);

-- Update any existing data that might have different casing or format
UPDATE public.students SET package_type = 'Personal Training' WHERE package_type ILIKE '%personal%';
UPDATE public.students SET package_type = 'Camp Training' WHERE package_type ILIKE '%camp%';

UPDATE public.coaches SET package_type = 'Personal Training' WHERE package_type ILIKE '%personal%';
UPDATE public.coaches SET package_type = 'Camp Training' WHERE package_type ILIKE '%camp%';
