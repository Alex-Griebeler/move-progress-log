import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/std@0.193.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_token, student_data, avatar_base64 } = await req.json();

    if (!invite_token || !student_data) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating student from invite: ${invite_token}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate invite
    const { data: invite, error: inviteError } = await supabaseClient
      .from('student_invites')
      .select('*')
      .eq('invite_token', invite_token)
      .single();

    if (inviteError || !invite) {
      console.error('Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Convite expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if already used
    if (invite.is_used) {
      return new Response(
        JSON.stringify({ error: 'Convite já foi utilizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let avatar_url = null;

    // Upload avatar if provided
    if (avatar_base64) {
      try {
        const matches = avatar_base64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const [, ext, base64Data] = matches;
          const imageData = decode(base64Data);
          const fileName = `${crypto.randomUUID()}.${ext}`;

          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('student-avatars')
            .upload(fileName, imageData, {
              contentType: `image/${ext}`,
              upsert: false,
            });

          if (uploadError) {
            console.error('Avatar upload error:', uploadError);
          } else {
            const { data: urlData } = supabaseClient.storage
              .from('student-avatars')
              .getPublicUrl(fileName);
            avatar_url = urlData.publicUrl;
            console.log('Avatar uploaded:', avatar_url);
          }
        }
      } catch (avatarError) {
        console.error('Avatar processing error:', avatarError);
      }
    }

    // Calculate max heart rate if birth_date provided
    let max_heart_rate = null;
    if (student_data.birth_date) {
      const birthDate = new Date(student_data.birth_date);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      max_heart_rate = 220 - age;
    }

    // Check if student already exists for this trainer
    const { data: existingStudent } = await supabaseClient
      .from('students')
      .select('id, avatar_url')
      .eq('trainer_id', invite.trainer_id)
      .ilike('name', student_data.name.trim())
      .maybeSingle();

    // If not found, check for orphaned students (should not happen after migration, but kept as safety net)
    let orphanStudent = null;
    if (!existingStudent) {
      const { data: orphan } = await supabaseClient
        .from('students')
        .select('id, avatar_url')
        .is('trainer_id', null)
        .ilike('name', student_data.name.trim())
        .maybeSingle();
      
      if (orphan) {
        console.log(`Found orphaned student to adopt: ${orphan.id}`);
        orphanStudent = orphan;
      }
    }

    const studentToUpdate = existingStudent || orphanStudent;

    // Helper to convert objectives string to array if needed
    const normalizeObjectives = (objectives: any): string[] | null => {
      if (!objectives) return null;
      if (Array.isArray(objectives)) return objectives;
      if (typeof objectives === 'string') {
        return objectives.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      }
      return null;
    };

    let student;
    if (studentToUpdate) {
      // Update existing student OR adopt orphan
      const isOrphan = !existingStudent && orphanStudent;
      console.log(isOrphan ? `Adopting orphaned student: ${studentToUpdate.id}` : `Updating existing student: ${studentToUpdate.id}`);
      
      const { data: updatedStudent, error: updateError } = await supabaseClient
        .from('students')
        .update({
          trainer_id: invite.trainer_id, // Important: assigns trainer to orphan
          birth_date: student_data.birth_date || null,
          weight_kg: student_data.weight_kg || null,
          height_cm: student_data.height_cm || null,
          fitness_level: student_data.fitness_level || null,
          objectives: normalizeObjectives(student_data.objectives),
          limitations: student_data.limitations || null,
          injury_history: student_data.injury_history || null,
          preferences: student_data.preferences || null,
          weekly_sessions_proposed: student_data.weekly_sessions_proposed || 2,
          avatar_url: avatar_url || studentToUpdate.avatar_url,
          max_heart_rate,
        })
        .eq('id', studentToUpdate.id)
        .select()
        .single();

      if (updateError) {
        console.error('Student update error:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      student = updatedStudent;
      console.log(isOrphan ? `Orphan adopted: ${student.id}` : `Student updated: ${student.id}`);
    } else {
      // Create new student
      console.log(`Creating new student`);
      const { data: newStudent, error: studentError } = await supabaseClient
        .from('students')
        .insert({
          trainer_id: invite.trainer_id,
          name: student_data.name,
          birth_date: student_data.birth_date || null,
          weight_kg: student_data.weight_kg || null,
          height_cm: student_data.height_cm || null,
          fitness_level: student_data.fitness_level || null,
          objectives: normalizeObjectives(student_data.objectives),
          limitations: student_data.limitations || null,
          injury_history: student_data.injury_history || null,
          preferences: student_data.preferences || null,
          weekly_sessions_proposed: student_data.weekly_sessions_proposed || 2,
          avatar_url,
          max_heart_rate,
        })
        .select()
        .single();

      if (studentError) {
        console.error('Student creation error:', studentError);
        return new Response(
          JSON.stringify({ error: studentError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      student = newStudent;
      console.log(`Student created: ${student.id}`);
    }

    // Mark invite as used
    await supabaseClient
      .from('student_invites')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        created_student_id: student.id,
      })
      .eq('id', invite.id);

    // Check if needs Oura OAuth
    if (student_data.has_oura_ring && student_data.accepts_oura_sharing) {
      const ouraClientId = Deno.env.get('OURA_CLIENT_ID');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');

      if (!ouraClientId) {
        console.warn('OURA_CLIENT_ID not configured');
        return new Response(
          JSON.stringify({
            success: true,
            student_id: student.id,
            redirect_to_oura: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/oura-callback`;
      const state = `${student.id}:${invite_token}`;
      const scope = 'email personal daily heartrate workout session spo2 tag sleep stress ring_configuration';

      const ouraAuthUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${ouraClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

      console.log('Returning Oura auth URL');

      return new Response(
        JSON.stringify({
          success: true,
          student_id: student.id,
          redirect_to_oura: true,
          oura_auth_url: ouraAuthUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        student_id: student.id,
        redirect_to_oura: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-student-from-invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
