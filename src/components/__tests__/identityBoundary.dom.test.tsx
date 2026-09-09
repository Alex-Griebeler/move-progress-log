// @vitest-environment jsdom
/**
 * A-001 — fronteira de identidade entre contas na MESMA aba (sem reload).
 *
 * Teste COMPORTAMENTAL (RTL/jsdom) que monta a casca de PRODUÇÃO das rotas
 * autenticadas (AuthProvider → ProtectedShell = ProtectedRoute + IdentityScope
 * + TrainingProvider + GlobalSearch + AppSidebar) e os hooks de produção
 * (useStudents/useCreateStudent, useIsAdmin, AdminRoute) sobre um Supabase
 * falso controlável (eventos de auth síncronos, respostas de rede seguráveis)
 * e prova, na árvore renderizada e em CADA commit do DOM, que a conta B nunca
 * vê dados, role ou menu da conta A.
 *
 * Reprodução registrada (commit anterior desta PR): com a composição do
 * App.tsx auditado (QueryClient global + ProtectedRoute/AdminRoute com sessão
 * própria) os cenários 1, 2, 3, 6b, 7 e 7b FALHAM — B recebe lista e menu
 * admin de A já no primeiro render, resposta tardia de A entra na UI de B,
 * o guard de admin de A vaza para B e a mutação antiga de A publica toast na
 * sessão B. Os cenários 4, 5 e 6a são guardas da arquitetura nova.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Supabase falso (hoisted: o vi.mock abaixo precisa dele)
// ---------------------------------------------------------------------------
type FakeUser = { id: string; email: string };
type FakeSession = { user: FakeUser; access_token: string } | null;
type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type AuthCallback = (event: AuthEvent, session: FakeSession) => void;
type Op = [string, unknown[]];
type Reply = { data: unknown; error: unknown };
type FakeRequest = {
  id: number;
  table: string;
  ops: Op[];
  /** Identidade cujo JWT iria na requisição (sessão no momento do disparo). */
  userId: string | null;
  resolve: (reply: Reply) => void;
};

const fake = vi.hoisted(() => {
  const state = {
    session: null as FakeSession,
    listeners: new Set<AuthCallback>(),
    emitInitialSession: true,
    /** Resposta pendurada SÓ para a primeira chamada de getSession (bootstrap). */
    getSessionOnce: null as null | Promise<FakeSession>,
    requests: [] as FakeRequest[],
    held: [] as FakeRequest[],
    holdMatcher: null as null | ((req: FakeRequest) => boolean),
    responder: null as null | ((req: FakeRequest) => Reply),
    nextId: 1,
  };

  const emit = (event: AuthEvent, session: FakeSession) => {
    for (const cb of Array.from(state.listeners)) cb(event, session);
  };

  const issue = (table: string, ops: Op[]): Promise<Reply> =>
    new Promise<Reply>((resolve) => {
      const req: FakeRequest = {
        id: state.nextId++,
        table,
        ops,
        userId: state.session?.user.id ?? null,
        resolve,
      };
      state.requests.push(req);
      if (state.holdMatcher?.(req)) {
        state.held.push(req);
        return;
      }
      queueMicrotask(() => resolve(state.responder!(req)));
    });

  const METHODS = [
    "select", "eq", "neq", "order", "range", "limit", "maybeSingle", "single", "insert",
    "update", "delete", "ilike", "in", "is", "gte", "gt", "lte", "lt", "or", "upsert", "contains",
  ];
  const from = (table: string) => {
    const ops: Op[] = [];
    let promise: Promise<Reply> | null = null;
    const builder: Record<string, unknown> = {};
    for (const m of METHODS) {
      builder[m] = (...args: unknown[]) => {
        ops.push([m, args]);
        return builder;
      };
    }
    builder.then = (onFulfilled?: (v: Reply) => unknown, onRejected?: (e: unknown) => unknown) => {
      promise ??= issue(table, ops);
      return promise.then(onFulfilled, onRejected);
    };
    return builder;
  };

  const client = {
    from: vi.fn(from),
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        state.listeners.add(cb);
        if (state.emitInitialSession) {
          // auth-js emite INITIAL_SESSION de forma assíncrona após a inscrição.
          queueMicrotask(() => {
            if (state.listeners.has(cb)) cb("INITIAL_SESSION", state.session);
          });
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                state.listeners.delete(cb);
              },
            },
          },
        };
      },
      getSession: async () => {
        const once = state.getSessionOnce;
        state.getSessionOnce = null;
        const session = once ? await once : state.session;
        return { data: { session }, error: null };
      },
      getUser: async () => ({ data: { user: state.session?.user ?? null }, error: null }),
      signOut: async () => {
        // auth-js remove a sessão e notifica SIGNED_OUT ANTES de resolver.
        state.session = null;
        emit("SIGNED_OUT", null);
        return { error: null };
      },
    },
  };

  return { state, client, emit };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: fake.client }));

const notifySpy = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ notify: notifySpy }));

// ---------------------------------------------------------------------------
// Componentes/hooks de PRODUÇÃO sob teste
// ---------------------------------------------------------------------------
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedShell } from "@/components/ProtectedShell";
import { AdminRoute } from "@/components/AdminRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createAppQueryClient } from "@/lib/authIdentity";
import { useStudents, useCreateStudent, type Student } from "@/hooks/useStudents";
import { useIsAdmin } from "@/hooks/useUserRole";
import { POST_LOGIN_ROUTE, ROUTES } from "@/constants/navigation";

// ---------------------------------------------------------------------------
// Dados sintéticos
// ---------------------------------------------------------------------------
const userA: FakeUser = { id: "user-a", email: "a@example.test" };
const userB: FakeUser = { id: "user-b", email: "b@example.test" };
const sessionOf = (user: FakeUser, token = "t1"): FakeSession => ({ user, access_token: `${user.id}-${token}` });

const STUDENTS: Record<string, string[]> = {
  [userA.id]: ["A-Alice", "A-Amanda"],
  [userB.id]: ["B-Bruna"],
};
const ROLES: Record<string, "admin" | "user"> = { [userA.id]: "admin", [userB.id]: "user" };
const ADMIN_LINK = "Usuários"; // item requiresAdmin do ROUTE_CONFIG
const ADMIN_AREA = "área admin (conteúdo protegido)";
const A_FORBIDDEN = [...STUDENTS[userA.id], ADMIN_LINK, ADMIN_AREA];

const studentRow = (name: string, i: number): Student => ({
  id: `${name}-${i}`, name, weekly_sessions_proposed: 3, birth_date: null, objectives: null,
  limitations: null, preferences: null, max_heart_rate: null, injury_history: null,
  fitness_level: null, avatar_url: null, weight_kg: null, height_cm: null, sex: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
});

/** Resposta "do servidor": lista pela identidade do JWT (RLS); role pelo filtro. */
const responder = (req: FakeRequest): Reply => {
  const has = (m: string) => req.ops.some(([n]) => n === m);
  const eq = Object.fromEntries(
    req.ops.filter(([n]) => n === "eq").map(([, a]) => [a[0] as string, a[1]]),
  ) as Record<string, unknown>;
  if (req.table === "students") {
    if (has("insert")) {
      const row = (req.ops.find(([n]) => n === "insert")?.[1][0] ?? {}) as Record<string, unknown>;
      return { data: { ...studentRow(String(row.name), req.id) }, error: null };
    }
    const names = req.userId ? STUDENTS[req.userId] ?? [] : [];
    return { data: names.map(studentRow), error: null };
  }
  if (req.table === "user_roles") {
    const role = ROLES[String(eq.user_id)] ?? null;
    const adminOnly = eq.role === "admin";
    const row = role && (!adminOnly || role === "admin") ? { role } : null;
    return { data: row, error: null };
  }
  return { data: has("maybeSingle") || has("single") ? null : [], error: null };
};

const studentSelects = () => fake.state.requests.filter((r) => r.table === "students" && !r.ops.some(([n]) => n === "insert"));
const roleRequests = () => fake.state.requests.filter((r) => r.table === "user_roles");

// ---------------------------------------------------------------------------
// Sondas (consomem os hooks de produção; registram CADA render)
// ---------------------------------------------------------------------------
type RenderEntry = { phase: string; names: string[]; isAdmin: boolean; loading: boolean };
const renderLog: RenderEntry[] = [];
let phase = "boot";
let probeMounts = 0;

let lastClient: QueryClient | null = null;
function StudentsProbe() {
  lastClient = useQueryClient();
  const { data, isLoading } = useStudents();
  const { isAdmin } = useIsAdmin();
  const create = useCreateStudent();
  const names = (data ?? []).map((s) => s.name);
  renderLog.push({ phase, names, isAdmin, loading: isLoading });
  useEffect(() => {
    probeMounts += 1;
  }, []);
  return (
    <div>
      {isLoading && <p>carregando alunos</p>}
      <ul aria-label="alunos">{names.map((n) => <li key={n}>{n}</li>)}</ul>
      <button type="button" onClick={() => create.mutate({ ...studentRow("Novo", 0) })}>
        Criar aluno
      </button>
    </div>
  );
}

const adminAreaRenders: string[] = [];
function AdminProbe() {
  adminAreaRenders.push(phase);
  return <p>{ADMIN_AREA}</p>;
}

function PublicProbe() {
  return <p>página pública</p>;
}

/** Substitui o AuthPage: após o SIGNED_IN, navega para a rota pós-login (como
 *  o AuthPage real faz depois do signInWithPassword). */
function AuthStub() {
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;
  useEffect(() => {
    const { data: { subscription } } = fake.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navRef.current(POST_LOGIN_ROUTE);
    });
    return () => subscription.unsubscribe();
  }, []);
  return <p>Página de login</p>;
}

// ---------------------------------------------------------------------------
// Harness — mesma composição do App.tsx: AuthProvider → client público →
// ThemeProvider/TooltipProvider → Router → rotas públicas + ProtectedShell
// ---------------------------------------------------------------------------
let publicClient: QueryClient;

function Harness({ initialPath }: { initialPath: string }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={publicClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                <Route path={ROUTES.auth} element={<AuthStub />} />
                <Route path="/publico" element={<PublicProbe />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedShell>
                      <Routes>
                        <Route path="/" element={<StudentsProbe />} />
                        <Route path="/admin/probe" element={<AdminRoute><AdminProbe /></AdminRoute>} />
                      </Routes>
                    </ProtectedShell>
                  }
                />
              </Routes>
            </MemoryRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Vigia do DOM: registra QUALQUER commit que exponha strings proibidas
// ---------------------------------------------------------------------------
function watchDom(forbidden: string[]) {
  const hits: string[] = [];
  const check = (text: string | null | undefined) => {
    for (const s of forbidden) if (text?.includes(s)) hits.push(s);
  };
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => check(n.textContent));
      if (r.type === "characterData") check(r.target.textContent);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return {
    hits,
    stop: () => {
      check(document.body.textContent);
      observer.disconnect();
      return hits;
    },
  };
}

const signIn = (user: FakeUser) =>
  act(async () => {
    fake.state.session = sessionOf(user);
    fake.emit("SIGNED_IN", fake.state.session);
  });
const signOutByEvent = () =>
  act(async () => {
    fake.state.session = null;
    fake.emit("SIGNED_OUT", null);
  });
const refreshToken = () =>
  act(async () => {
    fake.state.session = sessionOf(fake.state.session!.user, "t2");
    fake.emit("TOKEN_REFRESHED", fake.state.session);
  });
const release = (req: FakeRequest) => act(async () => req.resolve(responder(req)));

const expectAFullyLoaded = async () => {
  expect(await screen.findByText("A-Alice")).toBeInTheDocument();
  expect(screen.getByText("A-Amanda")).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: ADMIN_LINK })).toBeInTheDocument();
};

/** Nada de A na tela de B — checado ANTES de esperar a lista de B (pega o 1º render). */
const expectNoA = () => {
  expect(screen.queryByText("A-Alice"), "aluna de A exposta").not.toBeInTheDocument();
  expect(screen.queryByText("A-Amanda"), "aluna de A exposta").not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: ADMIN_LINK }), "menu admin de A exposto").not.toBeInTheDocument();
  expect(screen.queryByText(ADMIN_AREA), "área admin de A exposta").not.toBeInTheDocument();
};
const expectBView = async () => {
  expectNoA();
  expect(await screen.findByText("B-Bruna")).toBeInTheDocument();
  expectNoA();
};

const entriesIn = (p: string) => renderLog.filter((e) => e.phase === p);
const exposureIn = (p: string) =>
  entriesIn(p).filter((e) => e.isAdmin || e.names.some((n) => STUDENTS[userA.id].includes(n)));

beforeEach(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  fake.state.session = null;
  fake.state.listeners.clear();
  fake.state.emitInitialSession = true;
  fake.state.getSessionOnce = null;
  fake.state.requests = [];
  fake.state.held = [];
  fake.state.holdMatcher = null;
  fake.state.responder = responder;
  fake.state.nextId = 1;
  renderLog.length = 0;
  adminAreaRenders.length = 0;
  probeMounts = 0;
  phase = "boot";
  notifySpy.success.mockClear();
  notifySpy.error.mockClear();
  publicClient = createAppQueryClient();
});
afterEach(cleanup);

describe("A-001 — fronteira de identidade (A → logout → B na mesma aba)", () => {
  it("1. B não recebe lista/role de A, nem no primeiro render; recebe a própria lista e role", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    render(<Harness initialPath="/" />);
    await expectAFullyLoaded();

    // logout pelo botão REAL da sidebar
    const user = userEvent.setup();
    phase = "logout";
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByText("Página de login")).toBeInTheDocument();

    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    await expectBView();
    // role de B resolvida e ainda sem menu admin
    await waitFor(() => expect(roleRequests().some((r) => r.userId === userB.id)).toBe(true));
    await expectBView();
    const hits = watch.stop();

    expect(hits, "commits do DOM na sessão B expondo A").toEqual([]);
    expect(exposureIn("B"), "renders da sonda na sessão B com dados/role de A").toEqual([]);
    expect(entriesIn("B").length).toBeGreaterThan(0);
  });

  it("2. resposta tardia de A (lista e role) resolvendo com B ativa não polui cache nem UI de B", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    // A dispara students e user_roles, mas a rede segura as duas respostas
    fake.state.holdMatcher = (req) => req.userId === userA.id;
    render(<Harness initialPath="/" />);
    await screen.findByText("carregando alunos");
    await waitFor(() => expect(fake.state.held.length).toBeGreaterThanOrEqual(2));
    const heldOfA = [...fake.state.held];
    fake.state.holdMatcher = null;

    phase = "logout";
    await signOutByEvent();
    expect(await screen.findByText("Página de login")).toBeInTheDocument();

    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    expectNoA();

    // agora o servidor responde às requisições ANTIGAS de A (não cooperam com abort)
    for (const req of heldOfA) await release(req);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expectNoA();

    // B recebe a PRÓPRIA lista (requisição própria), e A continua fora
    await expectBView();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const hits = watch.stop();
    expect(hits, "commits do DOM na sessão B expondo A").toEqual([]);
    expect(exposureIn("B")).toEqual([]);
    expect(studentSelects().filter((r) => r.userId === userB.id).length, "B não fez a própria consulta").toBe(1);
    // nada de A no cache que B enxerga
    const cachedNames = (lastClient!.getQueryCache().getAll())
      .flatMap((q) => (Array.isArray(q.state.data) ? (q.state.data as Student[]).map((s) => s.name) : []));
    expect(cachedNames.filter((n) => STUDENTS[userA.id].includes(n))).toEqual([]);
    expect(lastClient!.getQueryData(["user-role"]), "role de A na chave antiga do cache de B").toBeUndefined();
  });

  it("3. logout por evento de auth (outra aba) e troca direta A→B funcionam sem o handler da sidebar", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    render(<Harness initialPath="/" />);
    await expectAFullyLoaded();

    // logout que chega só pelo onAuthStateChange
    phase = "logout";
    await signOutByEvent();
    expect(await screen.findByText("Página de login")).toBeInTheDocument();
    expect(screen.queryByText("A-Alice")).not.toBeInTheDocument();

    // volta A, depois troca DIRETA A→B (sem SIGNED_OUT no meio)
    phase = "A2";
    await signIn(userA);
    await expectAFullyLoaded();
    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    await expectBView();
    const hits = watch.stop();
    expect(hits).toEqual([]);
    expect(exposureIn("B")).toEqual([]);
  });

  it("4. TOKEN_REFRESHED da mesma identidade não desmonta, não refaz consultas e preserva a tela", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    render(<Harness initialPath="/" />);
    await expectAFullyLoaded();
    const mountsBefore = probeMounts;
    const selectsBefore = studentSelects().length;
    const rolesBefore = roleRequests().length;

    phase = "refresh";
    await refreshToken();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(probeMounts).toBe(mountsBefore);
    expect(studentSelects().length).toBe(selectsBefore);
    expect(roleRequests().length).toBe(rolesBefore);
    expect(screen.getByText("A-Alice")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ADMIN_LINK })).toBeInTheDocument();
    expect(entriesIn("refresh").filter((e) => e.loading)).toEqual([]);
  });

  it("5. identidade desconhecida não libera consultas privadas; getSession atrasado não desfaz evento mais recente", async () => {
    // sem INITIAL_SESSION e com getSession pendurado: identidade desconhecida
    fake.state.emitInitialSession = false;
    let releaseGetSession!: (s: FakeSession) => void;
    fake.state.getSessionOnce = new Promise<FakeSession>((r) => { releaseGetSession = r; });
    phase = "unknown";
    render(<Harness initialPath="/" />);
    expect(await screen.findByText("Verificando acesso...")).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(studentSelects().length, "consulta privada disparada sem identidade").toBe(0);
    expect(roleRequests().length).toBe(0);
    expect(screen.queryByText("Página de login")).not.toBeInTheDocument();

    // sem sessão inicial → login; B entra
    await signOutByEvent();
    expect(await screen.findByText("Página de login")).toBeInTheDocument();
    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    await expectBView();
    const mountsAfterB = probeMounts;

    // a resposta INICIAL antiga chega agora dizendo "sessão de A": deve ser ignorada
    await act(async () => releaseGetSession(sessionOf(userA)));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const hits = watch.stop();
    await expectBView();
    expect(hits).toEqual([]);
    expect(exposureIn("B")).toEqual([]);
    expect(probeMounts, "B foi remontada por um snapshot inicial antigo").toBe(mountsAfterB);
    expect(studentSelects().filter((r) => r.userId === userA.id)).toEqual([]);
  });

  it("6a. alteração normal de students invalida a chave certa e atualiza a lista", async () => {
    fake.state.session = sessionOf(userB);
    phase = "B";
    render(<Harness initialPath="/" />);
    await expectBView();
    const user = userEvent.setup();
    const selectsBefore = studentSelects().length;
    STUDENTS[userB.id] = ["B-Bruna", "Novo"];
    try {
      await user.click(screen.getByRole("button", { name: "Criar aluno" }));
      expect(await screen.findByText("Novo")).toBeInTheDocument();
      expect(studentSelects().length).toBe(selectsBefore + 1);
      expect(notifySpy.success).toHaveBeenCalledTimes(1);
    } finally {
      STUDENTS[userB.id] = ["B-Bruna"];
    }
  });

  it("6b. mutação de A em voo atravessa a transição: não publica toast nem invalidação na sessão B", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    render(<Harness initialPath="/" />);
    await expectAFullyLoaded();
    const user = userEvent.setup();
    fake.state.holdMatcher = (req) => req.table === "students" && req.ops.some(([n]) => n === "insert");
    await user.click(screen.getByRole("button", { name: "Criar aluno" }));
    await waitFor(() => expect(fake.state.held.length).toBe(1));
    const heldInsert = fake.state.held[0];
    fake.state.holdMatcher = null;

    phase = "logout";
    await signOutByEvent();
    expect(await screen.findByText("Página de login")).toBeInTheDocument();
    phase = "B";
    await signIn(userB);
    await expectBView();
    const bSelects = studentSelects().filter((r) => r.userId === userB.id).length;
    const watch = watchDom(A_FORBIDDEN);

    // o INSERT de A conclui no servidor (a escrita já foi; aqui só a publicação no cliente)
    await release(heldInsert);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const hits = watch.stop();
    await expectBView();
    expect(hits).toEqual([]);
    expect(notifySpy.success, "toast da mutação de A apareceu na sessão B").not.toHaveBeenCalled();
    expect(notifySpy.error).not.toHaveBeenCalled();
    expect(studentSelects().filter((r) => r.userId === userB.id).length, "invalidação de A refez a lista de B").toBe(bSelects);
  });

  it("7. AdminRoute e rotas públicas: A admin entra; B não herda a área nem o menu; público segue aberto", async () => {
    // pública sem sessão
    render(<Harness initialPath="/publico" />);
    expect(await screen.findByText("página pública")).toBeInTheDocument();
    cleanup();

    // A (admin) na rota de admin — segura a resposta de role do AdminRoute
    fake.state.session = sessionOf(userA);
    phase = "A";
    render(<Harness initialPath="/admin/probe" />);
    expect(await screen.findByText(ADMIN_AREA)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: ADMIN_LINK })).toBeInTheDocument();

    // troca direta A→B na rota de admin: B (user) não pode ver a área nem por um commit
    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    await waitFor(() => expect(roleRequests().some((r) => r.userId === userB.id && r.ops.some(([n, a]) => n === "eq" && a[0] === "role"))).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const hits = watch.stop();
    expect(screen.queryByText(ADMIN_AREA)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ADMIN_LINK })).not.toBeInTheDocument();
    expect(hits, "commits na sessão B expondo área/menu admin").toEqual([]);
    expect(adminAreaRenders.filter((p) => p === "B")).toEqual([]);
    cleanup();

    // pública com sessão de B
    render(<Harness initialPath="/publico" />);
    expect(await screen.findByText("página pública")).toBeInTheDocument();
  });

  it("7b. resposta tardia do guard de admin de A não libera a área para B", async () => {
    fake.state.session = sessionOf(userA);
    phase = "A";
    fake.state.holdMatcher = (req) => req.table === "user_roles" && req.userId === userA.id;
    render(<Harness initialPath="/admin/probe" />);
    await waitFor(() => expect(fake.state.held.length).toBeGreaterThanOrEqual(1));
    const heldRoles = [...fake.state.held];
    fake.state.holdMatcher = null;

    phase = "B";
    const watch = watchDom(A_FORBIDDEN);
    await signIn(userB);
    await waitFor(() => expect(roleRequests().some((r) => r.userId === userB.id)).toBe(true));
    for (const req of heldRoles) await release(req);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const hits = watch.stop();
    expect(screen.queryByText(ADMIN_AREA)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ADMIN_LINK })).not.toBeInTheDocument();
    expect(hits).toEqual([]);
    expect(adminAreaRenders.filter((p) => p === "B")).toEqual([]);
  });
});
