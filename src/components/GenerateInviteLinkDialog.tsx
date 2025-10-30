import { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGenerateInvite } from "@/hooks/useStudentInvites";
import { toast } from "sonner";

interface GenerateInviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateInviteLinkDialog = ({
  open,
  onOpenChange,
}: GenerateInviteLinkDialogProps) => {
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generateInvite = useGenerateInvite();

  const handleGenerate = async () => {
    const result = await generateInvite.mutateAsync({
      email: email || undefined,
      expires_in_days: expiresInDays,
    });

    if (result?.invite_url) {
      setGeneratedUrl(result.invite_url);
    }
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast.success("Link copiado!");
    }
  };

  const handleWhatsApp = () => {
    if (generatedUrl) {
      const message = `Olá! Complete seu cadastro através deste link: ${generatedUrl}`;
      navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada! Cole no WhatsApp do aluno.", {
        description: "A mensagem com o link já está na sua área de transferência"
      });
    }
  };

  const handleClose = () => {
    setEmail("");
    setExpiresInDays(7);
    setGeneratedUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Convite</DialogTitle>
          <DialogDescription>
            Crie um link único para que o aluno complete seu cadastro
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Aluno (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="aluno@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Validade (dias)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateInvite.isPending}
              className="w-full"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {generateInvite.isPending ? "Gerando..." : "Gerar Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link de Convite</Label>
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleWhatsApp} variant="outline" className="flex-1">
                Copiar Mensagem WhatsApp
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Fechar
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Este link expira em {expiresInDays} {expiresInDays === 1 ? "dia" : "dias"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
