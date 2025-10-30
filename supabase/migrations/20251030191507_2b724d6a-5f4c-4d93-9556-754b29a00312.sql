-- Step 1: Make trainer_id NOT NULL on critical tables
ALTER TABLE students 
ALTER COLUMN trainer_id SET NOT NULL;

ALTER TABLE workout_prescriptions
ALTER COLUMN trainer_id SET NOT NULL;

-- Step 2: Remove "OR (trainer_id IS NULL)" from RLS policies

-- Students table
DROP POLICY IF EXISTS "Trainers manage own students" ON students;
CREATE POLICY "Trainers manage own students" ON students
FOR ALL 
USING (auth.uid() = trainer_id);

-- Workout Prescriptions - need to update multiple policies
DROP POLICY IF EXISTS "Trainers manage own prescriptions" ON workout_prescriptions;
CREATE POLICY "Trainers manage own prescriptions" ON workout_prescriptions
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainers delete own prescriptions" ON workout_prescriptions;
CREATE POLICY "Trainers delete own prescriptions" ON workout_prescriptions
FOR DELETE
TO authenticated
USING (auth.uid() = trainer_id OR has_role(auth.uid(), 'admin'));

-- Workout Sessions (via students)
DROP POLICY IF EXISTS "Access via student ownership" ON workout_sessions;
CREATE POLICY "Access via student ownership" ON workout_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = workout_sessions.student_id 
    AND students.trainer_id = auth.uid()
  )
);

-- Exercises (via sessions and students)
DROP POLICY IF EXISTS "Access via session ownership" ON exercises;
CREATE POLICY "Access via session ownership" ON exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM workout_sessions ws
    JOIN students s ON s.id = ws.student_id
    WHERE ws.id = exercises.session_id 
    AND s.trainer_id = auth.uid()
  )
);

-- Prescription Exercises
DROP POLICY IF EXISTS "Access via prescription ownership" ON prescription_exercises;
CREATE POLICY "Access via prescription ownership" ON prescription_exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_prescriptions wp
    WHERE wp.id = prescription_exercises.prescription_id 
    AND wp.trainer_id = auth.uid()
  )
);

-- Exercise Adaptations
DROP POLICY IF EXISTS "Access via prescription exercise ownership" ON exercise_adaptations;
CREATE POLICY "Access via prescription exercise ownership" ON exercise_adaptations
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM prescription_exercises pe
    JOIN workout_prescriptions wp ON wp.id = pe.prescription_id
    WHERE pe.id = exercise_adaptations.prescription_exercise_id 
    AND wp.trainer_id = auth.uid()
  )
);

-- Prescription Assignments
DROP POLICY IF EXISTS "Access via prescription ownership" ON prescription_assignments;
CREATE POLICY "Access via prescription ownership" ON prescription_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_prescriptions wp
    WHERE wp.id = prescription_assignments.prescription_id 
    AND wp.trainer_id = auth.uid()
  )
);

-- Student Observations
DROP POLICY IF EXISTS "Trainers access own student observations" ON student_observations;
CREATE POLICY "Trainers access own student observations" ON student_observations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_observations.student_id 
    AND students.trainer_id = auth.uid()
  )
);

-- Oura Connections
DROP POLICY IF EXISTS "Trainers access own student connections" ON oura_connections;
CREATE POLICY "Trainers access own student connections" ON oura_connections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = oura_connections.student_id 
    AND students.trainer_id = auth.uid()
  )
);

-- Oura Metrics
DROP POLICY IF EXISTS "Trainers access own student metrics" ON oura_metrics;
CREATE POLICY "Trainers access own student metrics" ON oura_metrics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = oura_metrics.student_id 
    AND students.trainer_id = auth.uid()
  )
);

-- Protocol Recommendations
DROP POLICY IF EXISTS "Trainers manage own student recommendations" ON protocol_recommendations;
CREATE POLICY "Trainers manage own student recommendations" ON protocol_recommendations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = protocol_recommendations.student_id 
    AND students.trainer_id = auth.uid()
  )
);