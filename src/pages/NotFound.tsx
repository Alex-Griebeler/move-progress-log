import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { ROUTES } from "@/constants/navigation";
import { logger } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center py-3xl">
      <ErrorState
        title="Página não encontrada"
        description="O endereço não existe ou mudou."
        onRetry={() => navigate(ROUTES.dashboard)}
        retryLabel="Ir para o início"
      />
    </div>
  );
};

export default NotFound;
