-- Desabilitar trigger que cria automaticamente trainer_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover a função do trigger
DROP FUNCTION IF EXISTS public.handle_new_trainer();