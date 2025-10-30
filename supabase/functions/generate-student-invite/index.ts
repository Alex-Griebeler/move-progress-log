import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { email, expires_in_days = 7 } = await req.json();

    console.log(`Generating invite for trainer ${user.id}, expires in ${expires_in_days} days`);

    // Generate unique token
    const invite_token = crypto.randomUUID();

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // Insert invite
    const { data: invite, error: insertError } = await supabaseClient
      .from('student_invites')
      .insert({
        trainer_id: user.id,
        invite_token,
        email,
        expires_at: expires_at.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build invite URL using request origin
    const origin = req.headers.get('origin') || req.headers.get('referer');
    console.log('Request headers - Origin:', origin);
    console.log('Request headers - Referer:', req.headers.get('referer'));
    
    const baseUrl = origin ? new URL(origin).origin : 'http://localhost:5173';
    console.log('Base URL determined:', baseUrl);
    
    const invite_url = `${baseUrl}/onboarding/${invite_token}`;

    console.log(`Invite generated successfully: ${invite_url}`);

    return new Response(
      JSON.stringify({
        invite_url,
        expires_at: invite.expires_at,
        token: invite_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-student-invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
