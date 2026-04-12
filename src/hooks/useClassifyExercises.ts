/**
 * Hook para Classificação Batch de Exercícios via IA
 * Fase 1 do plano v14.5 — Popular dimensões AX/LOM/TEC/MET/JOE/QUA
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { buildErrorDescription } from "@/utils/errorParsing";

interface ClassificationResult {
  classified: number;
  total: number;
  remaining: number;
  hasMore: boolean;
  errors?: string[];
}

interface ClassificationProgress {
  totalClassified: number;
  totalRemaining: number;
  isRunning: boolean;
  currentBatch: number;
  errors: string[];
}

export const useClassifyExercises = () => {
  const [progress, setProgress] = useState<ClassificationProgress>({
    totalClassified: 0,
    totalRemaining: 0,
    isRunning: false,
    currentBatch: 0,
    errors: [],
  });

  const classifyBatch = useCallback(async (batchSize = 20, offset = 0): Promise<ClassificationResult | null> => {
    const { data, error } = await supabase.functions.invoke(
      "classify-exercises",
      { body: { batchSize, offset, onlyUnclassified: true } }
    );

    if (error) {
      throw new Error(error.message || "Erro ao classificar exercícios");
    }

    const result = data as ClassificationResult & { success?: boolean; error?: string };

    if (!result?.success) {
      throw new Error(result?.error || "Erro desconhecido");
    }

    return result;
  }, []);

  const runBatchClassification = useCallback(async () => {
    setProgress((prev) => ({ ...prev, isRunning: true, totalClassified: 0, errors: [], currentBatch: 0 }));

    let totalClassified = 0;
    let batchNumber = 0;
    let allErrors: string[] = [];
    let hasMore = true;

    try {
      while (hasMore) {
        batchNumber++;
        setProgress((prev) => ({ ...prev, currentBatch: batchNumber }));

        const result = await classifyBatch(20, 0); // always offset 0 since we filter by unclassified
        if (!result) break;

        totalClassified += result.classified;
        hasMore = result.hasMore;

        if (result.errors) {
          allErrors = [...allErrors, ...result.errors];
        }

        setProgress((prev) => ({
          ...prev,
          totalClassified,
          totalRemaining: result.remaining,
          errors: allErrors,
        }));

        // Small delay between batches to avoid rate limiting
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      notify.success(`${totalClassified} exercícios classificados com sucesso!`);
    } catch (err) {
      const message = buildErrorDescription(err) || "Erro desconhecido";
      notify.error("Erro na classificação", { description: message });
      allErrors.push(message);
    } finally {
      setProgress((prev) => ({ ...prev, isRunning: false, errors: allErrors }));
    }

    return { totalClassified, errors: allErrors };
  }, [classifyBatch]);

  return { progress, runBatchClassification, classifyBatch };
};
