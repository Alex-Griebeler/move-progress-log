-- Add hierarchical structure to prescription_folders
ALTER TABLE prescription_folders
ADD COLUMN parent_id UUID REFERENCES prescription_folders(id) ON DELETE CASCADE,
ADD COLUMN depth_level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN full_path TEXT;

-- Add constraint to limit depth to 3 levels (0, 1, 2, 3)
ALTER TABLE prescription_folders
ADD CONSTRAINT check_max_depth CHECK (depth_level <= 3);

-- Create index for parent_id lookups
CREATE INDEX idx_prescription_folders_parent_id ON prescription_folders(parent_id);

-- Create index for full_path searches
CREATE INDEX idx_prescription_folders_full_path ON prescription_folders USING gin(to_tsvector('portuguese', full_path));

-- Function to calculate and update full_path
CREATE OR REPLACE FUNCTION update_folder_full_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
BEGIN
  -- If no parent, path is just the name
  IF NEW.parent_id IS NULL THEN
    NEW.full_path := NEW.name;
    NEW.depth_level := 0;
  ELSE
    -- Get parent's full path and depth
    SELECT full_path, depth_level INTO parent_path, NEW.depth_level
    FROM prescription_folders
    WHERE id = NEW.parent_id;
    
    -- Check depth limit
    IF NEW.depth_level >= 3 THEN
      RAISE EXCEPTION 'Maximum folder depth (3 levels) exceeded';
    END IF;
    
    -- Build full path
    NEW.full_path := parent_path || ' > ' || NEW.name;
    NEW.depth_level := NEW.depth_level + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update full_path
CREATE TRIGGER trigger_update_folder_full_path
BEFORE INSERT OR UPDATE OF name, parent_id ON prescription_folders
FOR EACH ROW
EXECUTE FUNCTION update_folder_full_path();

-- Update existing folders to have proper full_path
UPDATE prescription_folders
SET full_path = name
WHERE full_path IS NULL;