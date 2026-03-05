import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export const clearTestSessions = async () => {
  try {
    // Deletar todos os exercícios primeiro (devido à foreign key)
    const { error: exercisesError } = await supabase
      .from('exercises')
      .delete()
      .gte('created_at', '2025-01-01'); // Deletar apenas de 2025 em diante

    if (exercisesError) {
      logger.error('Erro ao deletar exercícios:', exercisesError);
      throw exercisesError;
    }

    // Depois deletar as sessões
    const { error: sessionsError } = await supabase
      .from('workout_sessions')
      .delete()
      .gte('created_at', '2025-01-01');

    if (sessionsError) {
      logger.error('Erro ao deletar sessões:', sessionsError);
      throw sessionsError;
    }

    return {
      success: true,
      message: 'Todos os dados de teste foram removidos com sucesso!',
    };
  } catch (error) {
    logger.error('Erro ao limpar dados de teste:', error);
    throw error;
  }
};
