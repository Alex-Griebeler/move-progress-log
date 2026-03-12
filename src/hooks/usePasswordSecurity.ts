import { useState } from "react";
import { z } from "zod";
import { logger } from "@/utils/logger";

interface PasswordSecurityResult {
  isSecure: boolean;
  strength: "weak" | "medium" | "strong";
  message: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    leaked: boolean | null; // null = checking
  };
}

/**
 * Hook para validar segurança de senhas
 * - Valida força da senha (comprimento, caracteres)
 * - Verifica contra banco de senhas vazadas (HaveIBeenPwned API)
 */
export const usePasswordSecurity = () => {
  const [checking, setChecking] = useState(false);

  /**
   * Valida força da senha baseado em critérios
   */
  const validateStrength = (password: string) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;

    let strength: "weak" | "medium" | "strong" = "weak";
    if (passedChecks >= 5) strength = "strong";
    else if (passedChecks >= 3) strength = "medium";

    return { checks, strength, passedChecks };
  };

  /**
   * Verifica se senha está em banco de dados de breach
   * Usa HaveIBeenPwned API com k-anonymity (seguro)
   */
  const checkPasswordBreach = async (password: string): Promise<boolean> => {
    if (!password || password.length < 8) return false;

    try {
      // 1. Gerar SHA-1 hash da senha
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // 2. Enviar apenas os primeiros 5 caracteres (k-anonymity)
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // 3. Consultar API HaveIBeenPwned
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          'Add-Padding': 'true' // Segurança adicional
        }
      });

      if (!response.ok) {
        logger.error('[Security] Erro ao consultar HaveIBeenPwned:', response.status);
        // Em caso de erro, permitir (fail-safe)
        return false;
      }

      const text = await response.text();
      const hashes = text.split('\n');

      // 4. Verificar se o sufixo do hash está na lista
      for (const line of hashes) {
        const [hashSuffix] = line.split(':');
        if (hashSuffix === suffix) {
          // Senha encontrada em breach!
          return true;
        }
      }

      // Senha segura (não encontrada)
      return false;
    } catch (error) {
      logger.error('[Security] Erro ao verificar senha:', error);
      // Em caso de erro, permitir (fail-safe)
      return false;
    }
  };

  /**
   * Validação completa de segurança da senha
   */
  const checkPasswordSecurity = async (password: string): Promise<PasswordSecurityResult> => {
    if (!password) {
      return {
        isSecure: false,
        strength: "weak",
        message: "Digite uma senha",
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
          leaked: null,
        },
      };
    }

    setChecking(true);

    // Validar força
    const { checks, strength, passedChecks } = validateStrength(password);

    // Se muito fraca, nem verifica breach
    if (passedChecks < 3) {
      setChecking(false);
      return {
        isSecure: false,
        strength,
        message: "Senha muito fraca. Adicione maiúsculas, números e caracteres especiais.",
        checks: { ...checks, leaked: null },
      };
    }

    // Verificar breach
    const isLeaked = await checkPasswordBreach(password);
    setChecking(false);

    const finalChecks = { ...checks, leaked: !isLeaked };

    if (isLeaked) {
      return {
        isSecure: false,
        strength: "weak",
        message: "⚠️ Esta senha foi comprometida em vazamentos de dados. Escolha outra.",
        checks: finalChecks,
      };
    }

    // Senha segura
    let message = "";
    if (strength === "strong") {
      message = "✅ Senha forte e segura";
    } else if (strength === "medium") {
      message = "⚠️ Senha razoável. Adicione mais caracteres para melhorar.";
    }

    return {
      isSecure: strength !== "weak",
      strength,
      message,
      checks: finalChecks,
    };
  };

  return {
    checkPasswordSecurity,
    checking,
  };
};

/**
 * Schema Zod para validação de senha
 */
export const passwordSchema = z
  .string()
  .min(12, "A senha deve ter no mínimo 12 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    "A senha deve conter pelo menos um caractere especial"
  );
