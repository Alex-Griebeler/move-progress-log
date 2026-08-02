-- SIGLAS — APLICACAO COMPLETA DO DICIONARIO (2026-08-02, 2a leva).
-- Dono: "aplica e tira as que achar incoerentes" -> excluidas ROT (rotacao) e
-- ABD (abdominal): nesses nomes a palavra E a essencia do exercicio.
-- 256 renames JA APLICADOS via REST (256/256 ok, reconciliacao 0 divergencias,
-- 0 colisoes). Registro idempotente por REGRAS (mesma ordem do aplicador JS:
-- frases antes de palavras; pos-aplicacao os padroes nao casam mais = no-op).
-- Tooltip <ExerciseName> + legenda TV ja cobrem todas estas siglas (fonte unica
-- em src/constants/exerciseSiglas.ts).


UPDATE public.exercises_library SET name = regexp_replace(name, '\mcom[[:space:]]+rolo\M', 'c/ FR', 'gi')
WHERE name ~* '\mcom[[:space:]]+rolo\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mfoam[[:space:]]+roller\M', 'FR', 'gi')
WHERE name ~* '\mfoam[[:space:]]+roller\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\msemi-ajoelhada\M', 'SAJ', 'gi')
WHERE name ~* '\msemi-ajoelhada\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\msemi-ajoelhado\M', 'SAJ', 'gi')
WHERE name ~* '\msemi-ajoelhado\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mdecúbito[[:space:]]+dorsal\M', 'DD', 'gi')
WHERE name ~* '\mdecúbito[[:space:]]+dorsal\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mdecúbito[[:space:]]+ventral\M', 'DV', 'gi')
WHERE name ~* '\mdecúbito[[:space:]]+ventral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mdecúbito[[:space:]]+lateral\M', 'DL', 'gi')
WHERE name ~* '\mdecúbito[[:space:]]+lateral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpé[[:space:]]+da[[:space:]]+frente[[:space:]]+elevado\M', 'PFE', 'gi')
WHERE name ~* '\mpé[[:space:]]+da[[:space:]]+frente[[:space:]]+elevado\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpé[[:space:]]+de[[:space:]]+trás[[:space:]]+elevado\M', 'PTE', 'gi')
WHERE name ~* '\mpé[[:space:]]+de[[:space:]]+trás[[:space:]]+elevado\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpé[[:space:]]+de[[:space:]]+trás[[:space:]]+na[[:space:]]+parede\M', 'PTP', 'gi')
WHERE name ~* '\mpé[[:space:]]+de[[:space:]]+trás[[:space:]]+na[[:space:]]+parede\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpés[[:space:]]+elevados\M', 'PE', 'gi')
WHERE name ~* '\mpés[[:space:]]+elevados\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpeso[[:space:]]+corporal\M', 'PC', 'gi')
WHERE name ~* '\mpeso[[:space:]]+corporal\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\majoelhada\M', 'AJ', 'gi')
WHERE name ~* '\majoelhada\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\majoelhado\M', 'AJ', 'gi')
WHERE name ~* '\majoelhado\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\munilateral\M', 'UNL', 'gi')
WHERE name ~* '\munilateral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mbilateral\M', 'BI', 'gi')
WHERE name ~* '\mbilateral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\malternado\M', 'ALT', 'gi')
WHERE name ~* '\malternado\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\malternada\M', 'ALT', 'gi')
WHERE name ~* '\malternada\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mcontralateral\M', 'CNTL', 'gi')
WHERE name ~* '\mcontralateral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mipsilateral\M', 'IPSL', 'gi')
WHERE name ~* '\mipsilateral\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\margolas\M', 'ARG', 'gi')
WHERE name ~* '\margolas\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\margola\M', 'ARG', 'gi')
WHERE name ~* '\margola\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mbanco\M', 'BCO', 'gi')
WHERE name ~* '\mbanco\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mpolia\M', 'PL', 'gi')
WHERE name ~* '\mpolia\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\misometria\M', 'ISO', 'gi')
WHERE name ~* '\misometria\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mexcêntrico\M', 'EXC', 'gi')
WHERE name ~* '\mexcêntrico\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mexcêntrica\M', 'EXC', 'gi')
WHERE name ~* '\mexcêntrica\M';
