import { useState } from "react";
import { useRecoveryProtocols } from "@/hooks/useRecoveryProtocols";
import RecoveryProtocolCard from "@/components/RecoveryProtocolCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Sparkles } from "lucide-react";

const RecoveryProtocolsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: protocols, isLoading } = useRecoveryProtocols(selectedCategory);

  const categories = ["Termoterapia", "Respiração", "Mindfulness", "Atividade Leve"];

  const getProtocolsByCategory = (category: string) => {
    return protocols?.filter(p => p.category === category) || [];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Protocolos de Recuperação
          </h1>
          <p className="text-muted-foreground mt-2">
            Biblioteca completa de protocolos baseados em evidências científicas
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Heart className="h-8 w-8" />
          <Sparkles className="h-6 w-6" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
  );
};

export default RecoveryProtocolsPage;
