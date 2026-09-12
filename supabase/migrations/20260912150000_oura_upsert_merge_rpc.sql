-- Oura: merge ATÔMICO no banco para oura_metrics e oura_acute_metrics.
--
-- Antes, o oura-sync lia a linha existente, fazia o merge em memória
-- (valor novo null → mantém o antigo) e dava upsert. Entre a leitura e a
-- escrita, outra execução (cron × botão manual, ou dois crons na mesma
-- aluna/data) podia gravar e ser sobrescrita — merge não atômico, residual
-- documentado na PR #322.
--
-- Agora: uma única instrução `INSERT … ON CONFLICT (student_id, date) DO
-- UPDATE SET col = COALESCE(EXCLUDED.col, tabela.col)` — o Postgres resolve o
-- conflito por linha, sob lock, e um null novo NUNCA rebaixa um valor gravado.
--
-- Só as chaves PRESENTES no JSON entram no INSERT e no SET: coluna omitida
-- fica intocada na atualização e recebe o DEFAULT na inserção (é o que os
-- grupos agudos podados precisam: `samples_count_* INTEGER NOT NULL DEFAULT 0`
-- nunca recebe null nem zero indevido). Null EXPLÍCITO numa coluna NOT NULL
-- vale como chave ausente (preserva o gravado / DEFAULT na inserção). Chave
-- que não é coluna da tabela → erro (typo não é descartado em silêncio).
--
-- Chamada só pelo service_role (edge functions): EXECUTE revogado de
-- PUBLIC/anon/authenticated. SECURITY INVOKER: o service_role já ignora RLS;
-- um usuário comum não consegue nem executar.

CREATE OR REPLACE FUNCTION public.upsert_oura_row_merge(p_table text, p_row jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_keys        text[];
  v_cols        text[];
  v_set         text[];
  v_key         text;
  v_col_exists  boolean;
  v_nullable    text;
  v_has_updated boolean;
  v_sql         text;
BEGIN
  IF p_table IS NULL OR p_table NOT IN ('oura_metrics', 'oura_acute_metrics') THEN
    RAISE EXCEPTION 'upsert_oura_row_merge: tabela não permitida: %', coalesce(p_table, '<null>')
      USING ERRCODE = '22023';
  END IF;
  IF p_row IS NULL OR jsonb_typeof(p_row) <> 'object' THEN
    RAISE EXCEPTION 'upsert_oura_row_merge: p_row deve ser um objeto JSON' USING ERRCODE = '22023';
  END IF;
  IF NOT (p_row ? 'student_id') OR NOT (p_row ? 'date')
     OR p_row->>'student_id' IS NULL OR p_row->>'date' IS NULL THEN
    RAISE EXCEPTION 'upsert_oura_row_merge: student_id e date são obrigatórios' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(k ORDER BY k) INTO v_keys FROM jsonb_object_keys(p_row) AS k;

  -- Cada chave tem de ser coluna real da tabela; id/created_at nunca vêm do
  -- chamador (PK e carimbo são do banco).
  FOREACH v_key IN ARRAY v_keys LOOP
    IF v_key IN ('id', 'created_at', 'updated_at') THEN
      RAISE EXCEPTION 'upsert_oura_row_merge: coluna % não pode ser enviada', v_key USING ERRCODE = '22023';
    END IF;
    SELECT true, is_nullable INTO v_col_exists, v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = v_key;
    IF v_col_exists IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'upsert_oura_row_merge: coluna desconhecida em %: %', p_table, v_key USING ERRCODE = '42703';
    END IF;
    v_col_exists := NULL;
    -- Null explícito numa coluna NOT NULL (ex.: samples_count_* das agudas)
    -- vale como "não veio": sai do INSERT/SET — o INSERT não pode carregar
    -- null nela (violaria o NOT NULL antes do ON CONFLICT), e no conflito
    -- o valor gravado é preservado, exatamente como o COALESCE faria.
    IF v_nullable = 'NO' AND v_key NOT IN ('student_id', 'date')
       AND jsonb_typeof(p_row -> v_key) = 'null' THEN
      CONTINUE;
    END IF;
    v_cols := array_append(v_cols, format('%I', v_key));
    IF v_key NOT IN ('student_id', 'date') THEN
      -- null novo nunca rebaixa valor existente
      v_set := array_append(v_set, format('%1$I = COALESCE(EXCLUDED.%1$I, t.%1$I)', v_key));
    END IF;
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'updated_at'
  ) INTO v_has_updated;
  IF v_has_updated THEN
    v_set := array_append(v_set, 'updated_at = now()');
  END IF;

  -- jsonb_populate_record faz o cast de cada valor para o tipo da coluna
  -- (date, numeric, jsonb, text…); só as colunas presentes são lidas dele.
  v_sql := format(
    'INSERT INTO public.%1$I AS t (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1) ON CONFLICT (student_id, date) DO UPDATE SET %3$s',
    p_table,
    array_to_string(v_cols, ', '),
    CASE WHEN v_set IS NULL OR cardinality(v_set) = 0 THEN 'student_id = EXCLUDED.student_id' ELSE array_to_string(v_set, ', ') END
  );
  EXECUTE v_sql USING p_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_oura_row_merge(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_oura_row_merge(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_oura_row_merge(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_oura_row_merge(text, jsonb) TO service_role;

COMMENT ON FUNCTION public.upsert_oura_row_merge(text, jsonb) IS
  'Upsert atômico com merge (null novo preserva o valor gravado) para oura_metrics / oura_acute_metrics. Só service_role.';
