-- Create prescription_folders table
CREATE TABLE prescription_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trainer_id UUID NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT prescription_folders_name_check CHECK (char_length(name) > 0 AND char_length(name) <= 100)
);

-- Add folder_id and order_index to workout_prescriptions
ALTER TABLE workout_prescriptions 
ADD COLUMN folder_id UUID REFERENCES prescription_folders(id) ON DELETE SET NULL,
ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;

-- Create index for performance
CREATE INDEX idx_prescription_folders_trainer_id ON prescription_folders(trainer_id);
CREATE INDEX idx_workout_prescriptions_folder_id ON workout_prescriptions(folder_id);
CREATE INDEX idx_workout_prescriptions_trainer_order ON workout_prescriptions(trainer_id, folder_id, order_index);

-- Enable RLS
ALTER TABLE prescription_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescription_folders
CREATE POLICY "Trainers manage own folders"
  ON prescription_folders
  FOR ALL
  USING (auth.uid() = trainer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_prescription_folders_updated_at
  BEFORE UPDATE ON prescription_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE prescription_folders IS 'Folders to organize workout prescriptions';
COMMENT ON COLUMN prescription_folders.order_index IS 'Display order of folders (lower = first)';
COMMENT ON COLUMN workout_prescriptions.folder_id IS 'Folder this prescription belongs to (null = no folder)';
COMMENT ON COLUMN workout_prescriptions.order_index IS 'Display order within folder (lower = first)';