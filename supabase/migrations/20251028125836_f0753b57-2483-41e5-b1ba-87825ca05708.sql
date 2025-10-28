-- Add load_breakdown column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN load_breakdown TEXT;

COMMENT ON COLUMN public.exercises.load_breakdown IS 'Detailed breakdown of load composition (e.g., "20kg bar + 10kg each side + 2kg plate")';