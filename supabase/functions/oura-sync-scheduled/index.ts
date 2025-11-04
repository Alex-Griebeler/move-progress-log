import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function para sincronização automática do Oura Ring
 * Chamada via pg_cron 2x ao dia:
 * - 6h (horário de Brasília UTC-3) = 9h UTC
 * - 18h (horário de Brasília UTC-3) = 21h UTC
 * Isso garante que os dados sejam atualizados pela manhã e à noite
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const schedule = body.schedule || 'manual';
    
    console.log('🕐 === SCHEDULED OURA SYNC STARTED ===');
    console.log('Schedule:', schedule);
    console.log('Timestamp:', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Chama a função oura-sync-all que já tem toda a lógica
    console.log('📞 Calling oura-sync-all function...');
    const { data, error } = await supabase.functions.invoke('oura-sync-all', {
      body: {}
    });

    if (error) {
      console.error('❌ Scheduled sync failed:', error);
      throw error;
    }

    console.log('✅ Scheduled sync completed successfully');
    console.log('Results:', JSON.stringify(data, null, 2));
    console.log('🕐 === SCHEDULED OURA SYNC COMPLETED ===');

    return new Response(
      JSON.stringify({ 
        success: true,
        schedule,
        timestamp: new Date().toISOString(),
        ...data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in scheduled sync:', error);
    const err = error as Error;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
