import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useOuraSyncAll } from "@/hooks/useOuraSyncAll";

export const OuraSyncAllButton = () => {
  const { mutate: syncAll, isPending } = useOuraSyncAll();

  return (
    <Button
      onClick={() => syncAll()}
      disabled={isPending}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar Todos Agora'}
    </Button>
  );
};
