import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { ROUTES } from "@/constants/navigation";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <ErrorState
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        onRetry={() => navigate(ROUTES.dashboard)}
        retryLabel="Ir para Home"
      />
    </div>
  );
};

export default NotFound;
