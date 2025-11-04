/**
 * Logger utilitário que remove logs sensíveis em produção
 * Uso: import { logger } from '@/utils/logger'
 */

const isProduction = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Erros sempre são logados, mas sanitizados em produção
    if (isProduction) {
      console.error('[Error]', ...args.map(sanitize));
    } else {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};

/**
 * Sanitiza dados sensíveis para logs de produção
 */
function sanitize(data: any): any {
  if (typeof data === 'string') {
    // Oculta tokens, senhas, emails parcialmente
    return data
      .replace(/token[=:\s]+[^\s&]+/gi, 'token=***')
      .replace(/password[=:\s]+[^\s&]+/gi, 'password=***')
      .replace(/secret[=:\s]+[^\s&]+/gi, 'secret=***')
      .replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1@***');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      if (/(token|password|secret|key)/i.test(key)) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitize(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}
