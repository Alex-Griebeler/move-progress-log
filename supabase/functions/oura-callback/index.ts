const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response('Missing authorization code or state', { status: 400 });
    }

    console.log(`Oura callback - code received, state: ${state}`);

    // Parse state to get student_id and invite_token
    const [student_id, invite_token] = state.split(':');

    if (!student_id) {
      console.error('Invalid state format');
      return new Response('Invalid state parameter', { status: 400 });
    }

    // Exchange code for tokens
    const ouraClientId = Deno.env.get('OURA_CLIENT_ID');
    const ouraClientSecret = Deno.env.get('OURA_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://fabrik-performance.lovable.app';
    const redirectUri = `${supabaseUrl}/functions/v1/oura-callback`;

    console.log('Token exchange attempt:', {
      redirectUri,
      clientIdPresent: !!ouraClientId,
      clientSecretPresent: !!ouraClientSecret,
    });

    const tokenResponse = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: ouraClientId || '',
        client_secret: ouraClientSecret || '',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Oura token exchange failed:', errorText);
      
      return Response.redirect(
        `${frontendUrl}/onboarding/oura-error?student_id=${student_id}&reason=token_exchange`,
        302
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Oura tokens received successfully');

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Save tokens to database
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store tokens securely in Vault using database function
    const { error: insertError } = await supabaseClient.rpc('store_oura_tokens', {
      p_student_id: student_id,
      p_access_token: tokenData.access_token,
      p_refresh_token: tokenData.refresh_token,
      p_token_expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Failed to save Oura connection:', insertError);
      
      return Response.redirect(
        `${frontendUrl}/onboarding/oura-error?student_id=${student_id}&reason=database`,
        302
      );
    }

    console.log(`Oura connection saved for student ${student_id}`);

    // Sync initial data for the last 30 days (Oura keeps 30 days of data)
    console.log('🔄 Starting initial Oura sync for the last 30 days...');
    try {
      const syncPromises = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        syncPromises.push(
          fetch(`${supabaseUrl}/functions/v1/oura-sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ student_id, date: dateStr }),
          }).then(res => {
            if (!res.ok) {
              console.error(`Sync failed for ${dateStr}:`, res.status);
            }
            return res;
          })
        );
      }
      
      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`✅ Initial sync completed: ${successful} successful, ${failed} failed`);
    } catch (syncError) {
      console.error('❌ Failed to trigger initial sync:', syncError);
      // Don't fail the whole connection if sync fails
    }

    // Redirect based on origin
    if (invite_token) {
      // Came from student onboarding
      return Response.redirect(`${frontendUrl}/onboarding/success?student_id=${student_id}`, 302);
    } else {
      // Came from trainer interface
      return Response.redirect(`${frontendUrl}/alunos/${student_id}`, 302);
    }
  } catch (error) {
    console.error('Error in oura-callback:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
