import { Link } from "react-router-dom";
import logoFabrik from "@/assets/logo-fabrik.webp";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AppHeader = ({ 
  title = "Fabrik Performance", 
  subtitle = "Sistema de Registro e Acompanhamento",
  actions 
}: AppHeaderProps) => {
  return (
    <header className="mb-10 pb-6 border-b border-border">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <img 
            src={logoFabrik} 
            alt="Logo Fabrik Performance" 
            className="h-12 md:h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </Link>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
};
