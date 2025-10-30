-- Create student_invites table for managing invite links
CREATE TABLE student_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_student_id UUID REFERENCES students(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_student_invites_token ON student_invites(invite_token);

-- Enable RLS
ALTER TABLE student_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers manage their own invites
CREATE POLICY "Trainers manage own invites"
ON student_invites FOR ALL
USING (auth.uid() = trainer_id);

-- Create oura_connections table for storing Oura Ring tokens and sync data
CREATE TABLE oura_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE oura_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers access their own students' connections
CREATE POLICY "Trainers access own student connections"
ON oura_connections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = oura_connections.student_id
    AND (students.trainer_id = auth.uid() OR students.trainer_id IS NULL)
  )
);