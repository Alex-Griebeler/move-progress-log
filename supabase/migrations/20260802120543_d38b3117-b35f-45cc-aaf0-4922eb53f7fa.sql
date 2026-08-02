-- Espelho idempotente de supabase/migrations/20260802130000_library_sigla_rename.sql
-- Os 303 renames do mapa explicito ja foram aplicados em producao (ok=303, fail=0,
-- reconciliacao 0 divergencias) e sao guardados pelo nome antigo -> no-op.
-- Reaplicamos aqui apenas as 3 regras de dicionario, idempotentes por construcao.

-- LMF: prefixo "Liberação miofascial" -> "LMF"
UPDATE public.exercises_library
SET name = 'LMF' || substr(name, length('Liberação miofascial')+1)
WHERE name LIKE 'Liberação miofascial%';

-- ISO: isometrico/isometrica -> ISO
UPDATE public.exercises_library
SET name = regexp_replace(regexp_replace(name, '\misométrico\M', 'ISO', 'gi'), '\misométrica\M', 'ISO', 'gi')
WHERE name ~* '\misométric[oa]\M';

-- MB: mini band / miniband -> MB
UPDATE public.exercises_library
SET name = regexp_replace(regexp_replace(name, '\mmini band\M', 'MB', 'gi'), '\mminiband\M', 'MB', 'gi')
WHERE name ~* '\m(mini band|miniband)\M';