-- Fix security issue: Set search_path for folder full_path function
DROP FUNCTION IF EXISTS update_folder_full_path() CASCADE;

CREATE OR REPLACE FUNCTION update_folder_full_path()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_path TEXT;
  parent_depth INTEGER;
BEGIN
  -- If no parent, path is just the name
  IF NEW.parent_id IS NULL THEN
    NEW.full_path := NEW.name;
    NEW.depth_level := 0;
  ELSE
    -- Get parent's full path and depth
    SELECT full_path, depth_level INTO parent_path, parent_depth
    FROM prescription_folders
    WHERE id = NEW.parent_id;
    
    -- Check depth limit
    IF parent_depth >= 3 THEN
      RAISE EXCEPTION 'Maximum folder depth (3 levels) exceeded';
    END IF;
    
    -- Build full path
    NEW.full_path := parent_path || ' > ' || NEW.name;
    NEW.depth_level := parent_depth + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_folder_full_path ON prescription_folders;

CREATE TRIGGER trigger_update_folder_full_path
BEFORE INSERT OR UPDATE OF name, parent_id ON prescription_folders
FOR EACH ROW
EXECUTE FUNCTION update_folder_full_path();