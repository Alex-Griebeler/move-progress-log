import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { student_id } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify trainer owns this student
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('id, name')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Aluno não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if already connected
    const { data: existingConnection } = await supabaseClient
      .from('oura_connections')
      .select('id, is_active')
      .eq('student_id', student_id)
      .maybeSingle();

    if (existingConnection?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Aluno já possui Oura Ring conectado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate token and create invite entry (reusing student_invites with oura_connect marker)
    const invite_token = crypto.randomUUID();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const { data: invite, error: insertError } = await supabaseClient
      .from('student_invites')
      .insert({
        trainer_id: user.id,
        invite_token,
        email: '__oura_connect__',
        expires_at: expires_at.toISOString(),
        created_student_id: student_id,
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

    // Build invite URL
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const baseUrl = origin ? new URL(origin).origin : 'http://localhost:5173';
    const invite_url = `${baseUrl}/oura-connect/${invite_token}`;

    console.log('Oura connect link generated for student');

    return new Response(
      JSON.stringify({
        invite_url,
        expires_at: invite.expires_at,
        student_name: student.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-oura-connect-link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
