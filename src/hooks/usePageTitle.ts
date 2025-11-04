import { useEffect } from 'react';

/**
 * Hook para gerenciar o title da página dinamicamente
 * Padrão: "{Título} · Fabrik Performance"
 * 
 * @param title - Título da página (usar NAV_LABELS quando possível)
 * @param includeAppName - Se deve incluir "· Fabrik Performance" (padrão: true)
 * 
 * @example
 * usePageTitle(NAV_LABELS.students);
 * // Resultado: "Alunos · Fabrik Performance"
 */
export const usePageTitle = (title: string, includeAppName: boolean = true) => {
  useEffect(() => {
    const previousTitle = document.title;
    
    document.title = includeAppName 
      ? `${title} · Fabrik Performance`
      : title;
    
    // Cleanup: restaurar título anterior ao desmontar
    return () => {
      document.title = previousTitle;
    };
  }, [title, includeAppName]);
};
