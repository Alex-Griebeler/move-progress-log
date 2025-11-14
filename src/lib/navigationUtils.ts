/**
 * Utilitários centralizados para lógica de navegação e estados visuais
 * Evita duplicação de lógica de isActive em múltiplos componentes
 */

export const isRouteActive = (
  currentPath: string,
  targetPath: string,
  options?: { exact?: boolean; startsWith?: boolean }
): boolean => {
  if (options?.exact) {
    return currentPath === targetPath;
  }
  if (options?.startsWith) {
    return currentPath.startsWith(targetPath);
  }
  // Default: exact match
  return currentPath === targetPath;
};
