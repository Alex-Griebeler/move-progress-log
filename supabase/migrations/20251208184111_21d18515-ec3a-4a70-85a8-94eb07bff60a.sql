-- Add foreign key constraints to assessments table
ALTER TABLE public.assessments
ADD CONSTRAINT assessments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.assessments
ADD CONSTRAINT assessments_professional_id_fkey 
FOREIGN KEY (professional_id) REFERENCES auth.users(id) ON DELETE CASCADE;