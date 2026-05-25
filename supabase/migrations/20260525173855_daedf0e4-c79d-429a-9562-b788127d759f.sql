BEGIN;

-- 1) Hinge / extensao de quadril / ponte / hip thrust -> dobradica_quadril
UPDATE public.exercises_library
SET movement_pattern = 'dobradica_quadril'
WHERE movement_pattern = 'cadeia_posterior'
  AND (
       lower(name) LIKE '%deadlift%'
    OR lower(name) LIKE '%levantamento terra%'
    OR lower(name) LIKE '%rdl%'
    OR lower(name) LIKE '%stiff%'
    OR lower(name) LIKE '%good morning%'
    OR lower(name) LIKE '%hip hinge%'
    OR lower(name) LIKE '%hinge%'
    OR lower(name) LIKE '%hip thrust%'
    OR lower(name) LIKE '%ponte%'
    OR lower(name) LIKE '%glute bridge%'
    OR lower(name) LIKE '%extensão de quadril%'
    OR lower(name) LIKE '%extensao de quadril%'
  );

-- 2) Nordica / leg curl / mesa flexora / cadeira flexora / sliding curl
--    / hamstring curl / flexao de joelho -> flexao_joelho
UPDATE public.exercises_library
SET movement_pattern = 'flexao_joelho'
WHERE movement_pattern = 'cadeia_posterior'
  AND (
       lower(name) LIKE '%nórdica%'
    OR lower(name) LIKE '%nordica%'
    OR lower(name) LIKE '%nordic%'
    OR lower(name) LIKE '%leg curl%'
    OR lower(name) LIKE '%mesa flexora%'
    OR lower(name) LIKE '%cadeira flexora%'
    OR lower(name) LIKE '%flexão de joelho%'
    OR lower(name) LIKE '%flexao de joelho%'
    OR lower(name) LIKE '%sliding curl%'
    OR lower(name) LIKE '%hamstring curl%'
  );

COMMIT;