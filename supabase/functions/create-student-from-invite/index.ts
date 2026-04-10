import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/std@0.193.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const inviteTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_TEXT_FIELD_LENGTH = 1000;
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;
const MIN_HEIGHT_CM = 80;
const MAX_HEIGHT_CM = 250;
const MIN_BIRTH_YEAR_OFFSET = 120;
const ALLOWED_FITNESS_LEVELS = new Set(['iniciante', 'intermediario', 'avancado']);
const AVATAR_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface SanitizedStudentData {
  name: string;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: string | null;
  objectives: string[] | null;
  limitations: string | null;
  injury_history: string | null;
  preferences: string | null;
  weekly_sessions_proposed: number;
  has_oura_ring: boolean;
  accepts_oura_sharing: boolean;
}

interface AvatarUploadPayload {
  bytes: Uint8Array;
  extension: string;
  contentType: string;
}

interface ClaimedInvite {
  id: string;
  trainer_id: string;
}

interface InviteRow {
  id: string;
  is_used: boolean;
  expires_at: string;
  trainer_id: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeInviteToken(rawValue: unknown) {
  if (typeof rawValue !== 'string') {
    throw new Error('Convite inválido');
  }

  const normalized = rawValue.trim();
  if (!inviteTokenPattern.test(normalized)) {
    throw new Error('Convite inválido');
  }

  return normalized;
}

function sanitizeRequiredText(rawValue: unknown, fieldName: string, maxLength: number) {
  if (typeof rawValue !== 'string') {
    throw new Error(`${fieldName} é obrigatório`);
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} é obrigatório`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} excede o limite de ${maxLength} caracteres`);
  }

  return trimmed;
}

function sanitizeOptionalText(rawValue: unknown, fieldName: string, maxLength: number) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new Error(`${fieldName} inválido`);
  }

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} excede o limite de ${maxLength} caracteres`);
  }

  return trimmed;
}

function sanitizeOptionalNumber(rawValue: unknown, fieldName: string, min: number, max: number) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    throw new Error(`${fieldName} inválido`);
  }

  if (rawValue < min || rawValue > max) {
    throw new Error(`${fieldName} deve ficar entre ${min} e ${max}`);
  }

  return rawValue;
}

function sanitizeBirthDate(rawValue: unknown) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new Error('Data de nascimento inválida');
  }

  const normalized = rawValue.trim();
  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Data de nascimento inválida');
  }

  const today = new Date();
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - MIN_BIRTH_YEAR_OFFSET);

  if (parsedDate > today || parsedDate < minDate) {
    throw new Error('Data de nascimento fora do intervalo permitido');
  }

  return normalized;
}

function sanitizeWeeklySessions(rawValue: unknown) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 2;
  }

  if (typeof rawValue !== 'number' || !Number.isInteger(rawValue)) {
    throw new Error('Sessões por semana inválidas');
  }

  if (rawValue < 1 || rawValue > 7) {
    throw new Error('Sessões por semana devem ficar entre 1 e 7');
  }

  return rawValue;
}

function sanitizeFitnessLevel(rawValue: unknown) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string' || !ALLOWED_FITNESS_LEVELS.has(rawValue)) {
    throw new Error('Nível de condicionamento inválido');
  }

  return rawValue;
}

function normalizeObjectives(rawValue: unknown) {
  const normalized = sanitizeOptionalText(rawValue, 'Objetivos', MAX_TEXT_FIELD_LENGTH);
  if (!normalized) return null;

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizeStudentData(rawValue: unknown): SanitizedStudentData {
  if (!isRecord(rawValue)) {
    throw new Error('Dados do aluno inválidos');
  }

  const hasOuraRing = Boolean(rawValue.has_oura_ring);

  return {
    name: sanitizeRequiredText(rawValue.name, 'Nome', MAX_NAME_LENGTH),
    birth_date: sanitizeBirthDate(rawValue.birth_date),
    weight_kg: sanitizeOptionalNumber(rawValue.weight_kg, 'Peso', MIN_WEIGHT_KG, MAX_WEIGHT_KG),
    height_cm: sanitizeOptionalNumber(rawValue.height_cm, 'Altura', MIN_HEIGHT_CM, MAX_HEIGHT_CM),
    fitness_level: sanitizeFitnessLevel(rawValue.fitness_level),
    objectives: normalizeObjectives(rawValue.objectives),
    limitations: sanitizeOptionalText(rawValue.limitations, 'Limitações', MAX_TEXT_FIELD_LENGTH),
    injury_history: sanitizeOptionalText(rawValue.injury_history, 'Histórico de lesões', MAX_TEXT_FIELD_LENGTH),
    preferences: sanitizeOptionalText(rawValue.preferences, 'Preferências', MAX_TEXT_FIELD_LENGTH),
    weekly_sessions_proposed: sanitizeWeeklySessions(rawValue.weekly_sessions_proposed),
    has_oura_ring: hasOuraRing,
    accepts_oura_sharing: hasOuraRing && Boolean(rawValue.accepts_oura_sharing),
  };
}

function sanitizeAvatarPayload(rawValue: unknown): AvatarUploadPayload | null {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new Error('Avatar inválido');
  }

  const matches = rawValue.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!matches) {
    throw new Error('Formato de avatar não suportado');
  }

  const [, mimeType, base64Data] = matches;
  const extension = AVATAR_MIME_TO_EXTENSION[mimeType.toLowerCase()];
  if (!extension) {
    throw new Error('Formato de avatar não suportado');
  }

  let bytes: Uint8Array;
  try {
    bytes = decode(base64Data);
  } catch (_error) {
    throw new Error('Avatar inválido');
  }

  if (bytes.byteLength > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Avatar deve ter no máximo 5 MB');
  }

  return {
    bytes,
    extension,
    contentType: mimeType.toLowerCase(),
  };
}

type SupabaseClient = ReturnType<typeof createClient>;

async function claimInvite(
  supabaseClient: SupabaseClient,
  inviteToken: string,
  claimTimestamp: string
): Promise<{ invite: ClaimedInvite | null; error: string | null }> {
  const { data: claimedInvite, error: claimError } = await supabaseClient
    .from('student_invites')
    .update({
      is_used: true,
      used_at: claimTimestamp,
    })
    .eq('invite_token', inviteToken)
    .eq('is_used', false)
    .gt('expires_at', claimTimestamp)
    .select('id, trainer_id')
    .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (claimedInvite) {
    return { invite: claimedInvite, error: null };
  }

  const { data: rawExisting, error: existingInviteError } = await supabaseClient
    .from('student_invites')
    .select('id, expires_at, is_used')
    .eq('invite_token', inviteToken)
    .maybeSingle();

  if (existingInviteError) {
    throw existingInviteError;
  }

  if (!rawExisting) {
    return { invite: null, error: 'Convite não encontrado' };
  }

  const existingInvite = rawExisting as unknown as InviteRow;

  if (existingInvite.is_used) {
    return { invite: null, error: 'Convite já foi utilizado' };
  }

  if (new Date(existingInvite.expires_at) <= new Date(claimTimestamp)) {
    return { invite: null, error: 'Convite expirado' };
  }

  return { invite: null, error: 'Convite indisponível' };
}

function calculateMaxHeartRate(birthDate: string | null) {
  if (!birthDate) return null;

  const parsedDate = new Date(birthDate);
  const age = Math.floor((Date.now() - parsedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return 220 - age;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    let inviteToken: string;
    let studentData: SanitizedStudentData;
    let avatarPayload: AvatarUploadPayload | null;

    try {
      if (!isRecord(body)) {
        throw new Error('Dados inválidos');
      }

      inviteToken = normalizeInviteToken(body.invite_token);
      studentData = sanitizeStudentData(body.student_data);
      avatarPayload = sanitizeAvatarPayload(body.avatar_base64);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Dados inválidos';
      return jsonResponse({ error: message }, 400);
    }

    console.log('Processing student invite: [redacted]');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const claimTimestamp = new Date().toISOString();
    const claimResult = await claimInvite(supabaseClient, inviteToken, claimTimestamp);

    if (!claimResult.invite) {
      return jsonResponse({ error: claimResult.error ?? 'Convite inválido' }, 400);
    }

    const invite = claimResult.invite;
    let avatarPath: string | null = null;
    let studentId: string | null = null;

    try {
      if (avatarPayload) {
        const fileName = `${crypto.randomUUID()}.${avatarPayload.extension}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('student-avatars')
          .upload(fileName, avatarPayload.bytes, {
            contentType: avatarPayload.contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
        } else {
          avatarPath = fileName;
          console.log('Avatar uploaded successfully');
        }
      }

      const maxHeartRate = calculateMaxHeartRate(studentData.birth_date);

      const { data: existingStudent } = await supabaseClient
        .from('students')
        .select('id, avatar_url')
        .eq('trainer_id', invite.trainer_id)
        .ilike('name', studentData.name)
        .maybeSingle();

      let orphanStudent = null;
      if (!existingStudent) {
        const { data: orphan } = await supabaseClient
          .from('students')
          .select('id, avatar_url')
          .is('trainer_id', null)
          .ilike('name', studentData.name)
          .maybeSingle();

        if (orphan) {
          console.log(`Found orphaned student to adopt: ${orphan.id}`);
          orphanStudent = orphan;
        }
      }

      const studentToUpdate = existingStudent || orphanStudent;

      let student;
      if (studentToUpdate) {
        const isOrphan = !existingStudent && Boolean(orphanStudent);
        console.log(isOrphan ? `Adopting orphaned student: ${studentToUpdate.id}` : `Updating existing student: ${studentToUpdate.id}`);

        const { data: updatedStudent, error: updateError } = await supabaseClient
          .from('students')
          .update({
            trainer_id: invite.trainer_id,
            birth_date: studentData.birth_date,
            weight_kg: studentData.weight_kg,
            height_cm: studentData.height_cm,
            fitness_level: studentData.fitness_level,
            objectives: studentData.objectives,
            limitations: studentData.limitations,
            injury_history: studentData.injury_history,
            preferences: studentData.preferences,
            weekly_sessions_proposed: studentData.weekly_sessions_proposed,
            avatar_url: avatarPath || studentToUpdate.avatar_url,
            max_heart_rate: maxHeartRate,
          })
          .eq('id', studentToUpdate.id)
          .select()
          .single();

        if (updateError) {
          console.error('Student update error:', updateError);
          throw new Error(updateError.message);
        }

        student = updatedStudent;
        console.log(isOrphan ? `Orphan adopted: ${student.id}` : `Student updated: ${student.id}`);
      } else {
        console.log('Creating new student');

        const { data: newStudent, error: studentError } = await supabaseClient
          .from('students')
          .insert({
            trainer_id: invite.trainer_id,
            name: studentData.name,
            birth_date: studentData.birth_date,
            weight_kg: studentData.weight_kg,
            height_cm: studentData.height_cm,
            fitness_level: studentData.fitness_level,
            objectives: studentData.objectives,
            limitations: studentData.limitations,
            injury_history: studentData.injury_history,
            preferences: studentData.preferences,
            weekly_sessions_proposed: studentData.weekly_sessions_proposed,
            avatar_url: avatarPath,
            max_heart_rate: maxHeartRate,
          })
          .select()
          .single();

        if (studentError) {
          console.error('Student creation error:', studentError);
          throw new Error(studentError.message);
        }

        student = newStudent;
        console.log(`Student created: ${student.id}`);
      }

      studentId = student.id;

      const { error: finalizeInviteError } = await supabaseClient
        .from('student_invites')
        .update({
          created_student_id: student.id,
        })
        .eq('id', invite.id);

      if (finalizeInviteError) {
        console.warn('Invite finalization warning:', finalizeInviteError);
      }

      if (studentData.has_oura_ring && studentData.accepts_oura_sharing) {
        const ouraClientId = Deno.env.get('OURA_CLIENT_ID');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!ouraClientId) {
          console.warn('OURA_CLIENT_ID not configured');
          return jsonResponse({
            success: true,
            student_id: student.id,
            redirect_to_oura: false,
          });
        }

        const redirectUri = `${supabaseUrl}/functions/v1/oura-callback`;
        const state = `${student.id}:${invite.id}`;
        const scope = 'email personal daily heartrate workout session spo2 tag sleep stress ring_configuration';

        const ouraAuthUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${ouraClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

        console.log('Returning Oura auth URL');

        return jsonResponse({
          success: true,
          student_id: student.id,
          redirect_to_oura: true,
          oura_auth_url: ouraAuthUrl,
        });
      }

      return jsonResponse({
        success: true,
        student_id: student.id,
        redirect_to_oura: false,
      });
    } catch (processingError: unknown) {
      if (!studentId) {
        const { error: rollbackError } = await supabaseClient
          .from('student_invites')
          .update({
            is_used: false,
            used_at: null,
          })
          .eq('id', invite.id)
          .is('created_student_id', null);

        if (rollbackError) {
          console.error('Invite rollback error:', rollbackError);
        }

        if (avatarPath) {
          const { error: cleanupError } = await supabaseClient.storage
            .from('student-avatars')
            .remove([avatarPath]);

          if (cleanupError) {
            console.error('Avatar cleanup error:', cleanupError);
          }
        }
      }

      const message = processingError instanceof Error ? processingError.message : 'Unknown error';
      console.error('Error in create-student-from-invite:', processingError);
      return jsonResponse({ error: message }, 500);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-student-from-invite:', error);
    return jsonResponse({ error: message }, 500);
  }
});
