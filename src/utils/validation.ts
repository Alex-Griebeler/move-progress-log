/**
 * Validation schemas and utilities using Zod
 * AUD-010: Validação robusta de entrada no frontend
 */

import { z } from 'zod';

/**
 * Schema de validação para perfil de estudante
 */
export const studentProfileSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" })
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: "Nome deve conter apenas letras, espaços, hífens e apóstrofos" }),
  
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" })
    .toLowerCase(),
  
  phone: z.string()
    .trim()
    .regex(/^[\d\s()+-]+$/, { message: "Telefone deve conter apenas números e símbolos válidos" })
    .min(10, { message: "Telefone deve ter pelo menos 10 dígitos" })
    .max(20, { message: "Telefone deve ter no máximo 20 caracteres" })
    .optional()
    .or(z.literal('')),
  
  bio: z.string()
    .trim()
    .max(500, { message: "Bio deve ter no máximo 500 caracteres" })
    .optional()
    .or(z.literal('')),
});

/**
 * Schema de validação para observações de estudante
 */
export const studentObservationSchema = z.object({
  observation: z.string()
    .trim()
    .min(1, { message: "Observação não pode estar vazia" })
    .max(1000, { message: "Observação deve ter no máximo 1000 caracteres" }),
});

/**
 * Schema de validação para nome de prescrição/treino
 */
export const workoutNameSchema = z.object({
  name: z.string()
    .trim()
    .min(3, { message: "Nome deve ter pelo menos 3 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
});

/**
 * Schema de validação para protocolo de recuperação
 */
export const recoveryProtocolSchema = z.object({
  name: z.string()
    .trim()
    .min(3, { message: "Nome deve ter pelo menos 3 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  
  description: z.string()
    .trim()
    .min(10, { message: "Descrição deve ter pelo menos 10 caracteres" })
    .max(1000, { message: "Descrição deve ter no máximo 1000 caracteres" }),
  
  duration_minutes: z.number()
    .int({ message: "Duração deve ser um número inteiro" })
    .min(1, { message: "Duração deve ser pelo menos 1 minuto" })
    .max(240, { message: "Duração deve ser no máximo 240 minutos" }),
});

/**
 * Função auxiliar para sanitizar HTML básico
 * Remove tags HTML perigosas e mantém apenas texto
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

/**
 * Valida e sanitiza um input genérico
 */
export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

/**
 * Formata erros de validação Zod para exibição ao usuário
 */
export const formatValidationErrors = (errors: z.ZodError): string => {
  return errors.errors.map(err => err.message).join(', ');
};
