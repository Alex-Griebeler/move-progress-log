CREATE OR REPLACE FUNCTION public.mcp_run_readonly_query(p_sql text, p_max_rows integer DEFAULT 5000, p_timeout_ms integer DEFAULT 15000)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sql text;
  v_lower text;
  v_max int;
  v_timeout int;
  v_line text;
BEGIN
  IF p_sql IS NULL OR btrim(p_sql) = '' THEN
    RAISE EXCEPTION 'Empty query';
  END IF;

  v_sql := regexp_replace(btrim(p_sql), ';+\s*$', '');

  IF position(';' in v_sql) > 0 THEN
    RAISE EXCEPTION 'Multiple statements are not allowed';
  END IF;

  v_lower := lower(v_sql);
  IF v_lower !~ '^(select|with|explain\s+select|explain\s+with|table|values)\M' THEN
    RAISE EXCEPTION 'Only SELECT / WITH / EXPLAIN SELECT / TABLE / VALUES queries are allowed';
  END IF;

  IF v_lower ~ '\m(insert|update|delete|merge|alter|drop|create|grant|revoke|truncate|copy|vacuum|reindex|cluster|call|do|listen|notify|lock|comment|security\s+definer|set\s+role|reset\s+role)\M' THEN
    RAISE EXCEPTION 'Forbidden keyword in query';
  END IF;

  v_max := LEAST(GREATEST(COALESCE(p_max_rows, 5000), 1), 10000);
  v_timeout := LEAST(GREATEST(COALESCE(p_timeout_ms, 15000), 500), 30000);

  PERFORM set_config('transaction_read_only', 'on', true);
  PERFORM set_config('statement_timeout', v_timeout::text, true);

  -- EXPLAIN is a utility statement and cannot be nested inside a subquery.
  -- Execute it directly and wrap each text output line as jsonb {"plan": "..."}.
  IF v_lower ~ '^explain\M' THEN
    FOR v_line IN EXECUTE v_sql LOOP
      RETURN NEXT jsonb_build_object('plan', v_line);
    END LOOP;
    RETURN;
  END IF;

  RETURN QUERY EXECUTE
    format('SELECT to_jsonb(t) FROM (%s) t LIMIT %s', v_sql, v_max);
END;
$function$;