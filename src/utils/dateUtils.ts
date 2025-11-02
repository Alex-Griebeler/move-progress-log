import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Converte data UTC do Oura para timezone local e formata
 */
export const formatOuraDate = (dateString: string, formatStr: string = "PPP"): string => {
  try {
    // Parse ISO date (assume UTC se não tiver timezone)
    const date = parseISO(dateString);
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Error formatting Oura date:', error);
    return dateString;
  }
};

/**
 * Converte datetime UTC do Oura para timezone local
 */
export const formatOuraDateTime = (datetimeString: string, formatStr: string = "PPP 'às' HH:mm"): string => {
  try {
    const date = parseISO(datetimeString);
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Error formatting Oura datetime:', error);
    return datetimeString;
  }
};

/**
 * Retorna a data no formato local para exibição
 */
export const formatLocalDate = (dateString: string): string => {
  return formatOuraDate(dateString, "dd 'de' MMMM");
};

/**
 * Retorna datetime completo no formato local
 */
export const formatLocalDateTime = (datetimeString: string): string => {
  return formatOuraDateTime(datetimeString);
};
