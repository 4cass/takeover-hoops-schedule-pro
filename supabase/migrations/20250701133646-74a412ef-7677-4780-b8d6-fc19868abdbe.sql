
-- First, let's check what's causing the constraint violation and fix it
-- The error suggests there's a constraint on training_sessions.package_type that's failing

-- Let's see what constraint exists and fix the data
-- Update any invalid package_type values in training_sessions to NULL first
UPDATE public.training_sessions 
SET package_type = NULL 
WHERE package_type NOT IN ('Personal Training', 'Camp Training') 
   OR package_type = '';

-- Drop the existing constraint if it exists
ALTER TABLE public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_package_type_check;

-- Add the correct constraint for training_sessions
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_package_type_check 
  CHECK (package_type IN ('Personal Training', 'Camp Training') OR package_type IS NULL);
