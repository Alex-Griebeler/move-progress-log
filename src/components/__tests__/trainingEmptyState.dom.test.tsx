// @vitest-environment jsdom
/**
 * UX Onda 2 (19/09) — aba Treinamento: estado sem score de hoje (UX-01),
 * erro total com "Tentar novamente" (UX-11/24) e foco depois de "Iniciar sem
 * check-in" / "Editar check-in" (UX-08), na árvore renderizada.
 *
 * Invariante preservada (decisão do Alex 15/09): sem score de HOJE não há
 * conduta nem carga, nunca modo PSR. Em 20/09 o dono pediu o estado vazio de
 * volta ao formato anterior: só a frase curta, sem CTA nem links.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

afterEach(cleanup);

const net: { whoopConnection: unknown } = {
  whoopConnection: { last_sync_at: new Date().toISOString(), is_active: true },
};

vi.mock("@/integrations/supabase/client", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ["select", "eq", "neq", "contains", "gte", "gt", "lt", "lte", "order", "or", "insert", "update", "upsert", "in", "is", "limit", "maybeSingle", "single", "delete"]) {
      c[m] = vi.fn(self);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej);
    return c;
  };
  return {
    supabase: {
      from: vi.fn(() => chain()),
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "coach-1" } } })) },
    },
  };
});
vi.mock("@/hooks/useWhoopConnection", () => ({
  useWhoopConnection: () => ({ data: net.whoopConnection, isError: false }),
  useSyncWhoop: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDisconnectWhoop: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useUserRole", () => ({
  useIsAdmin: () => ({ isAdmin: false, isLoading: false }),
  useIsModerator: () => ({ isModerator: false, isLoading: false }),
  useUserRole: () => ({ role: "user", isLoading: false }),
}));
vi.mock("@/hooks/useOuraBaseline", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useOuraBaseline")>()),
  useOuraBaseline: () => ({ baseline: null, isLoading: false }),
}));
vi.mock("@/hooks/useOuraAcuteMetrics", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useOuraAcuteMetrics")>()),
  useLatestOuraAcuteMetrics: () => ({ data: null, isLoading: false }),
}));
vi.mock("@/hooks/useLoadSuggestions", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useLoadSuggestions")>()),
  useLoadSuggestions: () => ({
    data: { items: [], prescriptionId: null, mode: "fallback_recent", availablePrescriptions: [], prescriptionName: null, fallbackReason: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/utils/perceptionObservation", async (orig) => ({
  ...(await orig<typeof import("@/utils/perceptionObservation")>()),
  upsertPerceptionObservationV2: vi.fn(async () => "obs-1"),
  rememberPerceptionObservation: vi.fn(),
  validateRememberedPerception: vi.fn(),
}));

import PersonalizedTrainingDashboard from "../PersonalizedTrainingDashboard";
import { TrainingProvider } from "@/contexts/TrainingContext";
import { spToday } from "@/hooks/useOuraMetrics";
import type { WhoopMetrics } from "@/hooks/useWhoopMetrics";

const whoopRow = (): WhoopMetrics =>
  ({
    id: "w-today", student_id: "s1", date: spToday(), cycle_id: 1,
    recovery_score: 72, hrv_rmssd: 60, resting_heart_rate: 52, spo2: 97, skin_temp: 33,
    day_strain: 8, kilojoules: 5000, sleep_performance: 80, sleep_efficiency: 90,
    respiratory_rate: 14, total_sleep_duration: 25000, deep_sleep_duration: 5000,
    score_state: "SCORED",
  }) as unknown as WhoopMetrics;

interface HarnessProps {
  whoopMetrics?: WhoopMetrics[];
  isError?: boolean;
  hasOuraConnection?: boolean | null;
  onStartTraining?: (id?: string | null) => void;
  onConnectDevice?: (d: "oura" | "whoop") => void;
  onRetry?: () => void;
}

const Harness = ({
  whoopMetrics = [],
  isError = false,
  hasOuraConnection = false,
  onStartTraining = vi.fn(),
  onConnectDevice = vi.fn(),
  onRetry = vi.fn(),
}: HarnessProps) => {
  const [client] = [new QueryClient({ defaultOptions: { queries: { retry: false } } })];
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TrainingProvider>
          <PersonalizedTrainingDashboard
            latestMetrics={null}
            recentMetrics={[]}
            whoopMetrics={whoopMetrics}
            studentName="Alex"
            studentId="s1"
            isLoading={false}
            isError={isError}
            latestOuraError={false}
            hasOuraConnection={hasOuraConnection}
            onStartTraining={onStartTraining}
            onConnectDevice={onConnectDevice}
            onRetry={onRetry}
          />
        </TrainingProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("aba Treinamento — estado sem score de hoje (revertido em 20/09 a pedido do dono)", () => {
  it("mostra só a frase curta: sem CTA, sem links de conexão, sem conduta/carga/check-in", () => {
    net.whoopConnection = null;
    const onStartTraining = vi.fn();
    const onConnectDevice = vi.fn();
    render(<Harness onStartTraining={onStartTraining} onConnectDevice={onConnectDevice} />);
    expect(screen.getByText("Sem dados recentes de recuperação")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar treino" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conectar Oura" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conectar Whoop" })).not.toBeInTheDocument();
    // invariantes que seguem valendo: sem conduta, sem carga, sem PSR
    expect(screen.queryByLabelText("Conduta do dia")).not.toBeInTheDocument();
    expect(screen.queryByText("Sugestões de carga")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("erro total oferece Tentar novamente (não vira estado vazio)", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<Harness isError onRetry={onRetry} />);
    expect(screen.getByText("Não foi possível carregar os dados de recuperação.")).toBeVisible();
    expect(screen.queryByText("Sem dados recentes de recuperação")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("aba Treinamento — foco depois das ações do check-in (UX-08)", () => {
  it("Iniciar sem check-in leva o foco à conduta revelada", async () => {
    net.whoopConnection = { last_sync_at: new Date().toISOString(), is_active: true };
    const user = userEvent.setup();
    render(<Harness whoopMetrics={[whoopRow()]} hasOuraConnection={false} />);
    await user.click(await screen.findByRole("button", { name: "Iniciar sem check-in" }, { timeout: 4000 }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Conduta do dia")));
  });

  it("Editar check-in leva o foco ao rádio selecionado da escala", async () => {
    net.whoopConnection = { last_sync_at: new Date().toISOString(), is_active: true };
    const user = userEvent.setup();
    render(<Harness whoopMetrics={[whoopRow()]} hasOuraConnection={false} />);
    await screen.findByRole("radio", { name: "7" }, { timeout: 4000 });
    await user.click(screen.getByRole("radio", { name: "7" }));
    await user.click(await screen.findByRole("button", { name: "Registrar" }));
    await user.click(await screen.findByRole("button", { name: "Editar check-in" }, { timeout: 4000 }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: "7" })));
  });
});
