import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon } from "lucide-react";
import { useRecoveryProtocols } from "@/hooks/useRecoveryProtocols";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualProtocolRecommendationDialogProps {
  studentId: string;
}

const ManualProtocolRecommendationDialog = ({ studentId }: ManualProtocolRecommendationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [protocolId, setProtocolId] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const { data: protocols } = useRecoveryProtocols();
  const queryClient = useQueryClient();

  const createRecommendation = useMutation({
    mutationFn: async () => {
      if (!protocolId || !reason) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const { error } = await supabase
        .from("protocol_recommendations")
        .insert({
          student_id: studentId,
          protocol_id: protocolId,
          recommended_date: format(date, "yyyy-MM-dd"),
          reason: reason,
          priority: priority,
          applied: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-recommendations", studentId] });
      toast.success("Recomendação criada com sucesso");
      setOpen(false);
      setProtocolId("");
      setReason("");
      setPriority("medium");
      setDate(new Date());
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar recomendação: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    createRecommendation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Recomendar Protocolo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recomendar Protocolo de Recuperação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Protocolo *</Label>
            <Select value={protocolId} onValueChange={setProtocolId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um protocolo" />
              </SelectTrigger>
              <SelectContent>
                {protocols?.map((protocol) => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    {protocol.name} - {protocol.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da Recomendação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo da Recomendação *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por que está recomendando este protocolo..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createRecommendation.isPending}>
            {createRecommendation.isPending ? "Salvando..." : "Criar Recomendação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualProtocolRecommendationDialog;
