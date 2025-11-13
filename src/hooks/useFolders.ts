import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";

export interface PrescriptionFolder {
  id: string;
  name: string;
  trainer_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Fetch all folders for current trainer
export const useFolders = () => {
  return useQuery({
    queryKey: ["prescription-folders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("prescription_folders")
        .select("*")
        .eq("trainer_id", user.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PrescriptionFolder[];
    },
  });
};

// Create new folder
export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get max order_index
      const { data: folders } = await supabase
        .from("prescription_folders")
        .select("order_index")
        .eq("trainer_id", user.id)
        .order("order_index", { ascending: false })
        .limit(1);

      const maxOrder = folders && folders.length > 0 ? folders[0].order_index : -1;

      const { data, error } = await supabase
        .from("prescription_folders")
        .insert({
          name: name.trim(),
          trainer_id: user.id,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PrescriptionFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-folders"] });
      notify.success("Pasta criada com sucesso!");
    },
    onError: (error: any) => {
      notify.error("Erro ao criar pasta", {
        description: error.message
      });
    },
  });
};

// Update folder (rename)
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("prescription_folders")
        .update({ name: name.trim() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-folders"] });
      notify.success("Pasta renomeada com sucesso!");
    },
    onError: (error: any) => {
      notify.error("Erro ao renomear pasta", {
        description: error.message
      });
    },
  });
};

// Delete folder (prescriptions move to null folder_id)
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      // Prescriptions will be set to null automatically by ON DELETE SET NULL
      const { error } = await supabase
        .from("prescription_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-folders"] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      notify.success("Pasta excluída com sucesso!");
    },
    onError: (error: any) => {
      notify.error("Erro ao excluir pasta", {
        description: error.message
      });
    },
  });
};

// Reorder folders
export const useReorderFolders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folders: Array<{ id: string; order_index: number }>) => {
      // Update all folders in a transaction-like manner
      const updates = folders.map(({ id, order_index }) =>
        supabase
          .from("prescription_folders")
          .update({ order_index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-folders"] });
    },
    onError: (error: any) => {
      notify.error("Erro ao reordenar pastas", {
        description: error.message
      });
    },
  });
};

// Move prescription to folder
export const useMovePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      prescriptionId, 
      folderId, 
      orderIndex 
    }: { 
      prescriptionId: string; 
      folderId: string | null; 
      orderIndex: number;
    }) => {
      const { error } = await supabase
        .from("workout_prescriptions")
        .update({ 
          folder_id: folderId,
          order_index: orderIndex 
        })
        .eq("id", prescriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
    onError: (error: any) => {
      notify.error("Erro ao mover prescrição", {
        description: error.message
      });
    },
  });
};

// Reorder prescriptions within folder
export const useReorderPrescriptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptions: Array<{ id: string; order_index: number }>) => {
      const updates = prescriptions.map(({ id, order_index }) =>
        supabase
          .from("workout_prescriptions")
          .update({ order_index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
    onError: (error: any) => {
      notify.error("Erro ao reordenar prescrições", {
        description: error.message
      });
    },
  });
};