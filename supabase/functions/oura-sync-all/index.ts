import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  student_id: string;
  student_name: string;
  status: 'success' | 'failed';
  attempt: number;
  error?: string;
  metrics_synced?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting Oura sync for all students...');

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
      console.log('No active Oura connections found');
      return new Response(
        JSON.stringify({ 
          message: 'No active Oura connections found',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`Found ${connections.length} students with active Oura connections`);

    // Calculate Brazil date (UTC-3)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcDate = now.getUTCDate();
    const utcMonth = now.getUTCMonth();
    const utcYear = now.getUTCFullYear();

    let brazilDate: Date;
    if (utcHours < 3) {
      brazilDate = new Date(utcYear, utcMonth, utcDate - 1);
    } else {
      brazilDate = new Date(utcYear, utcMonth, utcDate);
    }

    const dateStr = brazilDate.toISOString().split('T')[0];
    console.log(`📅 Syncing data for date: ${dateStr}`);

    const results: SyncResult[] = [];

    // Sync each student with retry logic
    for (const connection of connections) {
      const studentId = connection.student_id;
      const studentName = (connection.students as any)?.name || 'Unknown';
      
      console.log(`\n📊 Syncing student: ${studentName} (${studentId})`);

      let lastError = '';
      let success = false;
      let metrics_synced = null;

      // Try up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`  Attempt ${attempt}/3...`);

          // Log retry attempt
          if (attempt > 1) {
            await supabase.from('oura_sync_logs').insert({
              student_id: studentId,
              sync_date: dateStr,
              status: 'retrying',
              attempt_number: attempt,
              error_message: lastError
            });
          }

          // Call the oura-sync function
          const { data: syncData, error: syncError } = await supabase.functions.invoke('oura-sync', {
            body: { student_id: studentId, date: dateStr }
          });

          if (syncError) {
            throw syncError;
          }

          console.log(`  ✅ Success on attempt ${attempt}`);
          success = true;
          metrics_synced = syncData;

          // Log success
          await supabase.from('oura_sync_logs').insert({
            student_id: studentId,
            sync_date: dateStr,
            status: 'success',
            attempt_number: attempt,
            metrics_synced: syncData
          });

          results.push({
            student_id: studentId,
            student_name: studentName,
            status: 'success',
            attempt,
            metrics_synced: syncData
          });

          break; // Success, no need to retry
        } catch (error) {
          const err = error as Error;
          lastError = err.message || String(error);
          console.error(`  ❌ Attempt ${attempt} failed:`, lastError);

          if (attempt === 3) {
            // Final attempt failed
            console.error(`  ⚠️ All 3 attempts failed for ${studentName}`);
            
            await supabase.from('oura_sync_logs').insert({
              student_id: studentId,
              sync_date: dateStr,
              status: 'failed',
              attempt_number: attempt,
              error_message: lastError
            });

            results.push({
              student_id: studentId,
              student_name: studentName,
              status: 'failed',
              attempt: 3,
              error: lastError
            });
          } else {
            // Wait before retrying (exponential backoff)
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`  ⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`\n✨ Sync completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sync completed: ${successCount} success, ${failedCount} failed`,
        total: results.length,
        success: successCount,
        failed: failedCount,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in oura-sync-all:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Unknown error occurred',
        details: String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
