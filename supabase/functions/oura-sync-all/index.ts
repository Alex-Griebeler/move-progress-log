import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncResult {
  student_id: string;
  student_name: string;
  status: 'success' | 'failed';
  attempt: number;
  error?: string;
  metrics_synced?: any;
}

/** Decode JWT payload without verification (verification done by getClaims) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const isServiceRole = jwtPayload.role === 'service_role';

    if (!isServiceRole) {
      // Validate user JWT via getClaims
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        console.error('Auth failed:', claimsError?.message);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claimsData.claims.sub as string;

      // Create service role client for privileged operations
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      // Check admin role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Error checking role:', roleError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to verify permissions' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!roleData) {
        console.warn(`Unauthorized sync attempt by user: ${userId}`);
        return new Response(
          JSON.stringify({ error: 'Admin privileges required for this operation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      console.log(`Admin ${userId} initiated Oura sync for all students`);
    } else {
      console.log('Service role initiated Oura sync for all students');
    }

    // --- Sync Logic ---
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all students with active Oura connections
    const { data: connections, error: connectionsError } = await supabase
      .from('oura_connections')
      .select(`
        id,
        student_id,
        students (
          id,
          name
        )
      `)
      .eq('is_active', true);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active Oura connections found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${connections.length} students with active Oura connections`);

    // OA-04: Use Intl.DateTimeFormat for consistent Brazil date calculation
    const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

    const results: SyncResult[] = [];

    // OA-02: Process in parallel with concurrency limit of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (connection) => {
          const studentId = connection.student_id;
          const studentName = ((connection as Record<string, unknown>).students as Record<string, unknown>)?.name as string || 'Unknown';
          let lastError = '';

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (attempt > 1) {
                await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'retrying',
                  attempt_number: attempt, error_message: lastError
                });
              }

              // OA-01: Pass service role key as Authorization header
              const { data: syncData, error: syncError } = await supabase.functions.invoke('oura-sync', {
                body: { student_id: studentId, date: dateStr },
                headers: { Authorization: `Bearer ${supabaseKey}` }
              });

              if (syncError) throw syncError;

              await supabase.from('oura_sync_logs').insert({
                student_id: studentId, sync_date: dateStr, status: 'success',
                attempt_number: attempt, metrics_synced: syncData
              });

              return { student_id: studentId, student_name: studentName, status: 'success' as const, attempt, metrics_synced: syncData };
            } catch (error) {
              lastError = (error as Error).message || String(error);
              if (attempt === 3) {
                await supabase.from('oura_sync_logs').insert({
                  student_id: studentId, sync_date: dateStr, status: 'failed',
                  attempt_number: attempt, error_message: lastError
                });
                return { student_id: studentId, student_name: studentName, status: 'failed' as const, attempt: 3, error: lastError };
              }
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
          return { student_id: studentId, student_name: studentName, status: 'failed' as const, attempt: 3, error: lastError };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value as SyncResult);
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return new Response(
      JSON.stringify({
        message: `Sync completed: ${successCount} success, ${failedCount} failed`,
        total: results.length,
        success: successCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in oura-sync-all:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
