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
      toast.success("Link copiado");
    }
  };

  // Abre o WhatsApp com a mensagem pronta (o app pede o contato); antes só
  // copiava o texto e a treinadora precisava sair, abrir o WhatsApp e colar.
  const whatsAppHref = generatedUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Olá. Para concluir seu cadastro na Fabrik, use este link: ${generatedUrl}`)}`
    : undefined;

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
          <DialogTitle>Gerar convite</DialogTitle>
          <DialogDescription>
            Link único para a pessoa preencher o próprio cadastro.
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Validade (dias)</Label>
              <Input
                id="expires"
                type="number"
                inputMode="numeric"
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
              {generateInvite.isPending ? "Gerando…" : "Gerar link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-url">Link do convite</Label>
              <div className="flex gap-2">
                <Input id="invite-url" value={generatedUrl} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar link">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <a href={whatsAppHref} target="_blank" rel="noreferrer">
                  Enviar pelo WhatsApp
                </a>
              </Button>
              <Button onClick={handleClose} variant="ghost" className="flex-1">
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
