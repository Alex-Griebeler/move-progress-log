import { useState } from "react";
import { Upload } from "lucide-react";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { ImportSessionsDialog } from "@/components/ImportSessionsDialog";
import { SessionDetailDialog } from "@/components/SessionDetailDialog";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { getWebPageSchema, getBreadcrumbSchema } from "@/utils/structuredData";
import { DevToolsCard } from "@/components/dashboard/DevToolsCard";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RecentWorkoutsSection } from "@/components/dashboard/RecentWorkoutsSection";

const Index = () => {
  usePageTitle(NAV_LABELS.dashboard);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: 'Dashboard · Fabrik Performance',
    type: 'website',
    url: true,
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleWorkoutAdded = () => setRefreshKey(prev => prev + 1);

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.dashboard, "Dashboard principal com visão geral de sessões, estatísticas e atividades recentes"), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }]), id: "breadcrumb-schema" },
      ]}
    >
      <PageHeader
        title={NAV_LABELS.dashboard}
        description={NAV_LABELS.subtitleDefault}
        breadcrumbs={[{ label: NAV_LABELS.dashboard }]}
        actions={
          <div className="flex items-center gap-xs">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-xs">
              <Upload className="h-4 w-4" />
              {NAV_LABELS.importExcel}
            </Button>
            <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
          </div>
        }
      />

      <DevToolsCard />
      <StatsGrid />
      <RecentWorkoutsSection
        onSessionSelect={setSelectedSessionId}
        onImportOpen={() => setImportDialogOpen(true)}
        onWorkoutAdded={handleWorkoutAdded}
      />

      <ImportSessionsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <SessionDetailDialog
        sessionId={selectedSessionId}
        open={!!selectedSessionId}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
      />
    </PageLayout>
  );
};

export default Index;
