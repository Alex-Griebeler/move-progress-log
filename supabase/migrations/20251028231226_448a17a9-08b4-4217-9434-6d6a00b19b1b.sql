-- Tornar o bucket de avatars público para permitir visualização das fotos
UPDATE storage.buckets 
SET public = true 
WHERE name = 'student-avatars';