import { useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { populateTestSessions } from "@/utils/populateTestSessions";
import { clearTestSessions } from "@/utils/clearTestSessions";
import { notify } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";

export const DevToolsCard = () => {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();

  const handlePopulateTestData = async () => {
    setIsPopulating(true);
    const loader = notify.loading("Gerando sessões de teste...");
    try {
      const result = await populateTestSessions();
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      loader.success("Dados de teste criados!", result.message);
    } catch (error: unknown) {
      logger.error('Erro ao popular dados:', error);
      loader.error("Falha ao criar dados de teste", buildErrorDescription(error) || "Tente novamente ou contate o suporte.");
    } finally {
      setIsPopulating(false);
    }
  };

  const handleClearTestData = async () => {
    setIsClearing(true);
    const loader = notify.loading("Removendo dados de teste...");
    try {
      const result = await clearTestSessions();
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      loader.success("Dados removidos com sucesso!", result.message);
    } catch (error: unknown) {
      logger.error('Erro ao limpar dados:', error);
      loader.error("Falha ao remover dados", buildErrorDescription(error) || "Tente novamente ou contate o suporte.");
    } finally {
      setIsClearing(false);
    }
  };

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="mb-6 border-dashed border-2 border-muted-foreground/20 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Ferramentas de Desenvolvimento</CardTitle>
            <Badge variant="outline" className="text-xs">DEV</Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Ferramentas para popular e limpar dados de teste
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handlePopulateTestData} disabled={isPopulating} className="gap-2">
          <Database className="h-4 w-4" />
          {isPopulating ? 'Criando...' : 'Popular Dados'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isClearing} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Limpando...' : 'Limpar Sessões'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá deletar TODAS as sessões de teste criadas desde 2025. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearTestData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
