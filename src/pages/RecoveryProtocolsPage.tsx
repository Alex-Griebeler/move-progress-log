import { useState } from "react";
import { useRecoveryProtocols } from "@/hooks/useRecoveryProtocols";
import RecoveryProtocolCard from "@/components/RecoveryProtocolCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import { Heart, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";

const RecoveryProtocolsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: protocols, isLoading } = useRecoveryProtocols(selectedCategory);

  const categories = ["Termoterapia", "Respiração", "Mindfulness", "Atividade Leve"];

  const getProtocolsByCategory = (category: string) => {
    return protocols?.filter(p => p.category === category) || [];
  };

  return (
    <div id="main-content" className="min-h-screen bg-background" role="main">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs 
          items={[
            { label: "Protocolos de Recuperação" }
          ]}
        />
        
        <AppHeader
          title="Protocolos de Recuperação"
          subtitle="Biblioteca completa baseada em evidências científicas"
        />

        <div className="space-y-6">

      {isLoading ? (
        <LoadingSpinner text="Carregando protocolos..." />
      ) : !protocols || protocols.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nenhum protocolo disponível"
          description="Os protocolos de recuperação baseados em evidências científicas serão carregados em breve."
        />
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" onClick={() => setSelectedCategory(undefined)}>
              Todos ({protocols?.length || 0})
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({getProtocolsByCategory(category).length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {categories.map((category) => {
              const categoryProtocols = getProtocolsByCategory(category);
              if (categoryProtocols.length === 0) return null;

              return (
                <div key={category} className="space-y-4">
                  <h2 className="text-2xl font-semibold">{category}</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryProtocols.map((protocol) => (
                      <RecoveryProtocolCard key={protocol.id} protocol={protocol} />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getProtocolsByCategory(category).map((protocol) => (
                  <RecoveryProtocolCard key={protocol.id} protocol={protocol} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
        </div>
      </div>
    </div>
  );
};

export default RecoveryProtocolsPage;
