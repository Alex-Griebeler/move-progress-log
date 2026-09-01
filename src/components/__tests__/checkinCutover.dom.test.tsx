// @vitest-environment jsdom
/**
 * PR-B2 — testes COMPORTAMENTAIS do cutover (critérios do GO da PR-B1 e da
 * review de UX): o formulário do check-in (slot reservado, commit explícito)
 * e a lista mista v1/v2/v3 do prontuário.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// Sem os globals do vitest o RTL não registra o auto-cleanup — explícito:
afterEach(cleanup);
import CheckInForm from "../checkin/CheckInForm";
import { PerceptionHistoryLine } from "../StudentObservationsCard";
import { buildPerceptionText, buildPerceptionTextV2 } from "@/utils/perceptionObservation";

const formProps = (overrides: Partial<Parameters<typeof CheckInForm>[0]> = {}) => ({
  psr: null as number | null,
  onSelectPsr: vi.fn(),
  onRegister: vi.fn(),
  onSkip: vi.fn(),
  onAddObservation: vi.fn(),
  saveState: "idle" as const,
  staleDataNotice: false,
  reconciliationFailed: false,
  ...overrides,
});

describe("CheckInForm — slot reservado e commit explícito (v8.2/v8.3)", () => {
  it("em repouso o Registrar está AUSENTE da árvore; as secundárias existem", () => {
    render(<CheckInForm {...formProps()} />);
    expect(screen.queryByRole("button", { name: /registrar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sem check-in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar observação" })).toBeInTheDocument();
  });

  it("a escala é radiogroup 0-10; tocar um número chama onSelectPsr (0 incluso)", async () => {
    const user = userEvent.setup();
    const props = formProps();
    render(<CheckInForm {...props} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(11);
    await user.click(screen.getByRole("radio", { name: "0" }));
    expect(props.onSelectPsr).toHaveBeenCalledWith(0);
  });

  it("com PSR selecionado o Registrar aparece e dispara onRegister", async () => {
    const user = userEvent.setup();
    const props = formProps({ psr: 7 });
    render(<CheckInForm {...props} />);
    expect(screen.getByRole("radio", { name: "7" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Registrar" }));
    expect(props.onRegister).toHaveBeenCalled();
  });

  it("falha de rede (U2): valor preservado, 'Check-in não foi salvo' e retry como CTA", () => {
    render(<CheckInForm {...formProps({ psr: 4, saveState: "error" })} />);
    expect(screen.getByText("Check-in não foi salvo.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Tentar registrar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sem check-in" })).toBeInTheDocument();
  });

  it("sync no meio (U4): aviso de reconfirmação visível", () => {
    render(<CheckInForm {...formProps({ psr: 6, staleDataNotice: true })} />);
    expect(screen.getByText(/dados do aparelho foram atualizados/i)).toBeVisible();
  });

  it("falha de reconciliação (v8.1-3): aviso + Tentar novamente", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<CheckInForm {...formProps({ reconciliationFailed: true, onRetryReconciliation: retry })} />);
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalled();
  });
});

describe("PerceptionHistoryLine — lista mista v1/v2/v3 (v7.2-M9/M4)", () => {
  const base = { id: "1", created_at: "2026-08-31T12:00:00.000Z", session_id: null };

  it("v1 histórico renderiza COM sintomas pra sempre", () => {
    const text = buildPerceptionText({
      source: "oura", score: 62, baseZoneLabel: "yellow", perception: "pior",
      symptoms: true, conductType: "Treino Reduzido 20%", vetoes: [],
      spDay: "2026-08-29", snapshotDate: "2026-08-29",
      registeredAtDisplay: "29/08 08:00", actorId: "c",
    });
    render(<PerceptionHistoryLine row={{ ...base, observation_text: text }} />);
    expect(screen.getByText(/Oura 62/)).toBeInTheDocument();
    expect(screen.getByText(/sintomas: sim/)).toBeInTheDocument();
  });

  it("v2 renderiza PSR e a fonte 'PSR' do modo sem dispositivo", () => {
    const text = buildPerceptionTextV2({
      source: "psr", score: 5, psr: 5, conductFingerprintHash: "h",
      registeredAtIso: "2026-08-31T11:00:00.000Z", baseZoneLabel: "yellow",
      perception: "condizente", conductType: "Treino Reduzido 20%", vetoes: [],
      spDay: "2026-08-31", snapshotDate: "2026-08-31",
      registeredAtDisplay: "31/08 08:00", actorId: "c",
    });
    render(<PerceptionHistoryLine row={{ ...base, observation_text: text }} />);
    expect(screen.getByText(/PSR 5/)).toBeInTheDocument();
    expect(screen.getByText(/PSR: 5/)).toBeInTheDocument();
    expect(screen.queryByText(/sintomas:/)).not.toBeInTheDocument();
  });

  it("v3 futura cai no CRU (formato desconhecido não vira lixo amigável)", () => {
    const text = "[percepcao_treino v3] | fonte=whoop | campo_novo=x";
    render(<PerceptionHistoryLine row={{ ...base, observation_text: text }} />);
    expect(screen.getByText(/campo_novo=x/)).toBeInTheDocument();
    expect(screen.queryByText(/percepção:/)).not.toBeInTheDocument();
  });
});
