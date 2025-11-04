/**
 * Utilitário unificado para exibir notificações toast
 * Centraliza todos os toasts da aplicação para consistência
 * 
 * @example
 * notify.success("Aluno criado com sucesso");
 * notify.error("Erro ao salvar", { description: error.message });
 * 
 * const loader = notify.loading("Salvando...");
 * // ... operação assíncrona
 * loader.success("Salvo com sucesso");
 */

import { toast } from "sonner";

type ToastOptions = {
  description?: string;
  id?: string | number;
  duration?: number;
};

export const notify = {
  /**
   * Exibe toast de sucesso
   */
  success(title: string, options: ToastOptions = {}) {
    return toast.success(title, {
      description: options.description,
      id: options.id,
      duration: options.duration ?? 4000,
    });
  },

  /**
   * Exibe toast de erro
   */
  error(title: string, options: ToastOptions = {}) {
    return toast.error(title, {
      description: options.description,
      id: options.id,
      duration: options.duration ?? 6000, // Erros ficam mais tempo
    });
  },

  /**
   * Exibe toast informativo
   */
  info(title: string, options: ToastOptions = {}) {
    return toast.info(title, {
      description: options.description,
      id: options.id,
      duration: options.duration ?? 4000,
    });
  },

  /**
   * Exibe toast de aviso
   */
  warning(title: string, options: ToastOptions = {}) {
    return toast.warning(title, {
      description: options.description,
      id: options.id,
      duration: options.duration ?? 5000,
    });
  },

  /**
   * Exibe toast de loading com controles para atualização
   * @returns Objeto com métodos para atualizar ou finalizar o loading
   * 
   * @example
   * const loader = notify.loading("Salvando aluno...");
   * try {
   *   await saveStudent();
   *   loader.success("Aluno salvo com sucesso");
   * } catch (error) {
   *   loader.error("Erro ao salvar aluno", error.message);
   * }
   */
  loading(title: string) {
    const id = toast.loading(title);
    
    return {
      id,
      
      /** Atualiza mensagem do loading */
      update(message: string) {
        toast.message(message, { id });
      },
      
      /** Finaliza com sucesso */
      success(message: string, description?: string) {
        toast.success(message, { description, id });
        toast.dismiss(id);
      },
      
      /** Finaliza com erro */
      error(message: string, description?: string) {
        toast.error(message, { description, id });
        toast.dismiss(id);
      },
      
      /** Remove o toast */
      dismiss() {
        toast.dismiss(id);
      },
    };
  },

  /**
   * Remove um toast específico
   */
  dismiss(toastId?: string | number) {
    toast.dismiss(toastId);
  },

  /**
   * Remove todos os toasts
   */
  dismissAll() {
    toast.dismiss();
  },
};
