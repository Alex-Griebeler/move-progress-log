-- Recalcula estatísticas noturnas de HRV e FC do Oura só com amostras reais (> 0).
-- A API manda null nos intervalos sem leitura; o oura-sync antigo convertia em 0.
WITH hrv AS (
  SELECT a.id,
         count(x.v)::int AS n,
         min(x.v) AS mn,
         max(x.v) AS mx,
         stddev_pop(x.v) AS sd,
         (array_agg(x.v ORDER BY e.ord DESC) FILTER (WHERE x.v IS NOT NULL))[1] AS last
  FROM public.oura_acute_metrics a
  CROSS JOIN LATERAL jsonb_array_elements(a.sleep_hrv_series->'values') WITH ORDINALITY AS e(val, ord)
  CROSS JOIN LATERAL (SELECT CASE WHEN jsonb_typeof(e.val) = 'number' AND (e.val)::text::numeric > 0 THEN (e.val)::text::numeric END AS v) x
  WHERE a.sleep_hrv_series IS NOT NULL
    AND (a.hrv_night_min = 0 OR a.hrv_night_last = 0 OR a.hrv_night_max = 0)
  GROUP BY a.id
)
UPDATE public.oura_acute_metrics m
SET hrv_night_min = hrv.mn,
    hrv_night_max = hrv.mx,
    hrv_night_last = hrv.last,
    hrv_night_stddev = CASE WHEN hrv.n > 0 THEN hrv.sd END,
    samples_count_hrv = hrv.n
FROM hrv
WHERE m.id = hrv.id;

WITH hr AS (
  SELECT a.id,
         min(x.v) AS mn,
         max(x.v) AS mx,
         (array_agg(x.v ORDER BY e.ord DESC) FILTER (WHERE x.v IS NOT NULL))[1] AS last
  FROM public.oura_acute_metrics a
  CROSS JOIN LATERAL jsonb_array_elements(a.sleep_hr_series->'values') WITH ORDINALITY AS e(val, ord)
  CROSS JOIN LATERAL (SELECT CASE WHEN jsonb_typeof(e.val) = 'number' AND (e.val)::text::numeric > 0 THEN (e.val)::text::numeric END AS v) x
  WHERE a.sleep_hr_series IS NOT NULL
    AND (a.hr_night_min = 0 OR a.hr_night_last = 0 OR a.hr_night_max = 0)
  GROUP BY a.id
)
UPDATE public.oura_acute_metrics m
SET hr_night_min = round(hr.mn),
    hr_night_max = round(hr.mx),
    hr_night_last = round(hr.last)
FROM hr
WHERE m.id = hr.id;