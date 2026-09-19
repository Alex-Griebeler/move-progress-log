import { useRecoveryProtocols } from "@/hooks/useRecoveryProtocols";
import RecoveryProtocolCard from "@/components/RecoveryProtocolCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { getWebPageSchema, getBreadcrumbSchema } from "@/utils/structuredData";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";

const RecoveryProtocolsPage = () => {
  usePageTitle(NAV_LABELS.protocols);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: 'Protocolos · Fabrik Performance',
    type: 'website',
    url: true,
  });

  // Busca tudo uma vez e filtra em memória: antes cada aba refazia a consulta
  // por categoria e as contagens das outras abas zeravam.
  const { data: protocols, isLoading, isError, refetch } = useRecoveryProtocols(undefined);

  const categories = ["Termoterapia", "Respiração", "Mindfulness", "Atividade Leve"];

  const getProtocolsByCategory = (category: string) => {
    return protocols?.filter(p => p.category === category) || [];
  };

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.protocols, "Biblioteca completa de protocolos de recuperação baseados em evidências científicas"), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }, { label: NAV_LABELS.protocols, href: "/protocolos" }]), id: "breadcrumb-schema" },
      ]}
    >
      <PageHeader
        title={NAV_LABELS.protocols}
        description={NAV_LABELS.subtitleProtocols}
        breadcrumbs={[{ label: NAV_LABELS.protocols }]}
      />

      {isLoading ? (
        <div className="space-y-4" role="status" aria-busy="true">
          <span className="sr-only">Carregando protocolos</span>
          {[1, 2, 3].map((i) => (
            <Card key={i} aria-hidden="true">
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Não foi possível carregar os protocolos"
          description="Verifique a conexão e tente de novo."
          onRetry={() => refetch()}
        />
      ) : !protocols || protocols.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="Nenhum protocolo cadastrado"
          description="Os protocolos de recuperação aparecem aqui quando cadastrados."
        />
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          {/* Rola na horizontal no celular em vez de espremer 5 colunas. */}
          <TabsList className="flex h-auto w-full justify-start overflow-x-auto bg-primary/5">
            <TabsTrigger
              value="all"
              className="min-h-touch shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Todos ({protocols?.length || 0})
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="min-h-touch shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
                  <h2 className="text-h2">{category}</h2>
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
    </PageLayout>
  );
};

export default RecoveryProtocolsPage;
