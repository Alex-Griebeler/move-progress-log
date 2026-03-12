/**
 * Logger utilitário que remove logs sensíveis em produção
 * Uso: import { logger } from '@/utils/logger'
 */

const isProduction = import.meta.env.PROD;

export const logger = {
  log: (...args: unknown[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Erros sempre são logados, mas sanitizados em produção
    if (isProduction) {
      console.error('[Error]', ...args.map(sanitize));
    } else {
      console.error(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};

/**
 * Sanitiza dados sensíveis para logs de produção
 */
function sanitize(data: unknown): unknown {
  if (typeof data === 'string') {
    // Oculta tokens, senhas, emails parcialmente
    return data
      .replace(/token[=:\s]+[^\s&]+/gi, 'token=***')
      .replace(/password[=:\s]+[^\s&]+/gi, 'password=***')
      .replace(/secret[=:\s]+[^\s&]+/gi, 'secret=***')
      .replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1@***');
  }
  
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = Array.isArray(data) ? [] : {};
    for (const key in record) {
      if (/(token|password|secret|key)/i.test(key)) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitize(record[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}
