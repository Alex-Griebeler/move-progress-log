// @vitest-environment jsdom
/**
 * PR-C1 — teste de COMPONENTE do dashboard (dívida H1 paga em parte):
 * monta PersonalizedTrainingDashboard com Supabase e hooks de rede mockados
 * e prova, na árvore renderizada, os cenários (a), (b) e (e) da spec v9.2 §5:
 *   (a) Whoop 59 + PSR 9 + sync velha → "Manter o treino planejado" + frase;
 *   (b) Whoop 59 + PSR 9 + strain 15 → "Reduzir o treino em 20%" + veto visível;
 *   (e) fresh→stale depois do registro preserva o check-in (fingerprint categórico).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

afterEach(cleanup);

// ---- estado mutável dos mocks (controlado por cenário) ----
const net = { lastSyncAt: new Date(Date.now() - 1 * 3_600_000).toISOString(), dayStrain: 8 };

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
  useWhoopConnection: () => ({ data: { last_sync_at: net.lastSyncAt }, isError: false }),
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
  useLoadSuggestions: () => ({ data: { items: [], prescriptionId: null, mode: "plan" }, isLoading: false, isError: false }),
}));
const upsertSpy = vi.fn(async () => "obs-1");
vi.mock("@/utils/perceptionObservation", async (orig) => ({
  ...(await orig<typeof import("@/utils/perceptionObservation")>()),
  upsertPerceptionObservationV2: (...args: unknown[]) => upsertSpy(...(args as [])),
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
    recovery_score: 59, hrv_rmssd: 60, resting_heart_rate: 52, spo2: 97, skin_temp: 33,
    day_strain: net.dayStrain, kilojoules: 5000, sleep_performance: 80, sleep_efficiency: 90,
    respiratory_rate: 14, total_sleep_duration: 25000, deep_sleep_duration: 5000,
    score_state: "SCORED",
  }) as unknown as WhoopMetrics;

const Harness = () => {
  const [client] = [new QueryClient({ defaultOptions: { queries: { retry: false } } })];
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TrainingProvider>
          <PersonalizedTrainingDashboard
            latestMetrics={null}
            recentMetrics={[]}
            whoopMetrics={[whoopRow()]}
            studentName="Alex"
            studentId="s1"
            isLoading={false}
            isError={false}
            latestOuraError={false}
          />
        </TrainingProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const registerPsr9 = async () => {
  const user = userEvent.setup();
  await screen.findByRole("radio", { name: "9" }, { timeout: 4000 });
  await user.click(screen.getByRole("radio", { name: "9" }));
  await user.click(await screen.findByRole("button", { name: "Registrar" }));
};

describe("dashboard — regra de concordância na árvore renderizada (v9.2)", () => {
  it("(a)+(e): 59 + PSR 9 com sync velha → Manter + frase; fresh→stale depois do registro preserva o check-in", async () => {
    net.lastSyncAt = new Date(Date.now() - 5 * 3_600_000).toISOString(); // stale desde o início
    net.dayStrain = 8;
    const view = render(<Harness />);
    await registerPsr9();
    expect(await screen.findByText("Manter o treino planejado", {}, { timeout: 4000 })).toBeVisible();
    const phrase = screen.getByText("Aparelho: reduzir o treino em 20%. PSR 9: manter o treino planejado.");
    expect(phrase).toBeVisible();
    expect(phrase.className).toContain("text-sm");
    expect(phrase.className).not.toContain("muted");
    expect(screen.getByText("Ajuste por PSR")).toBeVisible();
    expect(screen.queryByText(/Recomendação do aparelho:/)).not.toBeInTheDocument();
    // persistiu o vocabulário novo
    expect(upsertSpy).toHaveBeenCalled();
    const record = (upsertSpy.mock.calls.at(-1) as unknown[])[2] as { perception: string; psr: number };
    expect(record.perception).toBe("discordante_acima");
    expect(record.psr).toBe(9);
    // (e) transição de relógio: sync ainda mais velha → check-in continua done
    net.lastSyncAt = new Date(Date.now() - 9 * 3_600_000).toISOString();
    view.rerender(<Harness />);
    expect(screen.getByText("Manter o treino planejado")).toBeVisible();
    // linha colapsada é composta por vários spans — compara o texto plano
    expect(document.body.textContent?.replace(/\s+/g, " ")).toContain("Check-in: PSR 9");
    expect(screen.queryByRole("radio", { name: "9" })).not.toBeInTheDocument();
  });

  it("(b): 59 + PSR 9 com strain 15 conhecido → Reduzir, veto visível com 15,0/21", async () => {
    net.lastSyncAt = new Date(Date.now() - 1 * 3_600_000).toISOString();
    net.dayStrain = 15;
    render(<Harness />);
    await registerPsr9();
    expect(await screen.findByText("Reduzir o treino em 20%", {}, { timeout: 4000 })).toBeVisible();
    const veto = screen.getByText("PSR 9 não altera a conduta: strain do dia alto (15,0/21).");
    expect(veto).toBeVisible();
    expect(veto.className).toContain("text-sm");
    expect(screen.getByText("Ajuste por PSR não aplicado")).toBeVisible();
    // nenhum bullet cinza de veto de percepção
    expect(screen.queryByText(/• .*PSR/)).not.toBeInTheDocument();
  });
});
