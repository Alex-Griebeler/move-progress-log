import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export const useOuraTestSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student_id: string) => {
      console.log('🧪 Calling test sync for student:', student_id);
      
      const { data, error } = await supabase.functions.invoke('oura-sync-test', {
        body: { student_id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, student_id) => {
      console.log('✅ Test sync completed:', data);
      
      // Invalidate all Oura-related queries
      queryClient.invalidateQueries({ queryKey: ['oura-metrics', student_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-oura-metrics', student_id] });
      queryClient.invalidateQueries({ queryKey: ['oura-workouts', student_id] });
      
      notify.success(i18n.modules.oura.testCompleted, {
        description: `Dados mock do Oura salvos com sucesso. Sleep score: ${data.mock_data_used?.sleep_score}, Duração total: ${Math.floor((data.mock_data_used?.total_sleep_duration || 0) / 3600)}h`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      console.error('❌ Test sync error:', error);
      notify.error(i18n.modules.oura.errorTest, {
        description: error.message || 'Falha ao processar dados mock do Oura',
      });
    },
  });
};
