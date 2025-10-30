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
      return new Response('Failed to exchange authorization code', { status: 400 });
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

    const { error: insertError } = await supabaseClient.from('oura_connections').insert({
      student_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    if (insertError) {
      console.error('Failed to save Oura connection:', insertError);
      return new Response('Failed to save connection', { status: 500 });
    }

    console.log(`Oura connection saved for student ${student_id}`);

    // Sync initial data for the last 7 days
    try {
      const syncDate = new Date();
      syncDate.setDate(syncDate.getDate() - 7);
      const startDate = syncDate.toISOString().split('T')[0];
      
      // Sync multiple days to increase chances of getting data
      const syncPromises = [];
      for (let i = 0; i < 7; i++) {
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
          })
        );
      }
      
      await Promise.all(syncPromises);
      console.log('Initial Oura sync triggered for last 7 days');
    } catch (syncError) {
      console.warn('Failed to trigger initial sync:', syncError);
    }

    // Redirect based on origin
    const baseUrl = supabaseUrl?.includes('supabase.co')
      ? 'https://fabrik-performance.lovable.app'
      : 'http://localhost:5173';

    if (invite_token) {
      // Came from student onboarding
      return Response.redirect(`${baseUrl}/onboarding/success?student_id=${student_id}`, 302);
    } else {
      // Came from trainer interface
      return Response.redirect(`${baseUrl}/alunos/${student_id}`, 302);
    }
  } catch (error) {
    console.error('Error in oura-callback:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
