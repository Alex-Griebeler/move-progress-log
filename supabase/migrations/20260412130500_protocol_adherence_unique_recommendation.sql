-- Prevent duplicate adherence rows for the same recommendation.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY recommendation_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.protocol_adherence
  WHERE recommendation_id IS NOT NULL
)
DELETE FROM public.protocol_adherence pa
USING ranked
WHERE pa.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_adherence_recommendation_unique
  ON public.protocol_adherence(recommendation_id)
  WHERE recommendation_id IS NOT NULL;
