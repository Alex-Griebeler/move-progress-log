const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FileChange {
  path: string;
  content: string;
  action: "create" | "modify";
}

// ── GitHub Helpers ───────────────────────────────────────────────

const GH_OWNER = "Alex-Griebeler";
const GH_REPO = "move-progress-log";
const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;

async function ghFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Fabrik-AI-Builder",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function readFileFromGitHub(
  path: string,
  token: string,
  ref = "main"
): Promise<string | null> {
  try {
    const data = await ghFetch(`/contents/${path}?ref=${ref}`, token);
    if (data.content) {
      return atob(data.content.replace(/\n/g, ""));
    }
    return null;
  } catch {
    return null;
  }
}

async function createPullRequest(
  token: string,
  branchName: string,
  title: string,
  body: string,
  files: FileChange[]
): Promise<string> {
  // 1. Get default branch SHA
  const mainRef = await ghFetch(`/git/ref/heads/main`, token);
  const baseSha = mainRef.object.sha;

  // 2. Create branch
  await ghFetch(`/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  });

  // 3. Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await ghFetch(`/git/blobs`, token, {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      return { path: f.path, sha: blob.sha, mode: "100644" as const, type: "blob" as const };
    })
  );

  // 4. Get base tree
  const baseCommit = await ghFetch(`/git/commits/${baseSha}`, token);
  const baseTreeSha = baseCommit.tree.sha;

  // 5. Create new tree
  const tree = await ghFetch(`/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
  });

  // 6. Create commit
  const commit = await ghFetch(`/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: `[AI Builder] ${title}`,
      tree: tree.sha,
      parents: [baseSha],
    }),
  });

  // 7. Update branch ref
  await ghFetch(`/git/refs/heads/${branchName}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  // 8. Create PR
  const pr = await ghFetch(`/pulls`, token, {
    method: "POST",
    body: JSON.stringify({
      title: `[AI Builder] ${title}`,
      head: branchName,
      base: "main",
      body,
    }),
  });

  return pr.html_url;
}

// ── AI Helpers ───────────────────────────────────────────────────

async function callAI(
  apiKey: string,
  messages: { role: string; content: string }[],
  tools?: unknown[],
  toolChoice?: unknown
) {
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw { status: 429, message: "Limite de requisições excedido. Tente novamente em alguns instantes." };
    if (status === 402) throw { status: 402, message: "Créditos de IA esgotados. Adicione créditos ao workspace." };
    const text = await res.text();
    throw new Error(`AI Gateway error ${status}: ${text}`);
  }

  return res.json();
}

// ── Tools Definitions ────────────────────────────────────────────

const classifyTool = {
  type: "function",
  function: {
    name: "classify_response",
    description: "Classify user intent and return response",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["conversation", "planning", "build"] },
        message: { type: "string" },
        title: { type: "string", description: "Short summary, max 60 chars" },
      },
      required: ["type", "message"],
      additionalProperties: false,
    },
  },
};

const codeGenTool = {
  type: "function",
  function: {
    name: "generate_code_changes",
    description: "Generate file changes to implement the requested feature",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path relative to repo root" },
              content: { type: "string", description: "Complete file content" },
              action: { type: "string", enum: ["create", "modify"] },
            },
            required: ["path", "content", "action"],
            additionalProperties: false,
          },
        },
        summary: { type: "string", description: "PR description in markdown" },
      },
      required: ["files", "summary"],
      additionalProperties: false,
    },
  },
};

// ── Main Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Admin check
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Validate input
    const { message, history } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem não pode estar vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Mensagem excede 2000 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatHistory: ChatMessage[] = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        if (msg && typeof msg.role === "string" && typeof msg.content === "string" &&
            (msg.role === "user" || msg.role === "assistant") && msg.content.length <= 4000) {
          chatHistory.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // 4. Load project memory
    const { data: memoryRows } = await supabaseService
      .from("ai_project_memory")
      .select("key, content");

    const projectMemory = (memoryRows || [])
      .map((row: { key: string; content: string }) => `## ${row.key}\n${row.content}`)
      .join("\n\n");

    // 5. AI keys
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 6. Classification call
    const systemPrompt = `You are the AI Builder for the Fabrik Performance project.

## Project Memory
${projectMemory}

## Intent Classification
- **conversation**: Questions, suggestions, architecture discussion.
- **planning**: User asks for an implementation plan or step-by-step guide.
- **build**: User explicitly asks to BUILD, CREATE, or IMPLEMENT something.

## Response Format
Call classify_response with type, message (markdown, pt-BR), and title (max 60 chars).
Always respond in Portuguese (Brazilian).`;

    const classifyResult = await callAI(
      LOVABLE_API_KEY,
      [{ role: "system", content: systemPrompt }, ...chatHistory, { role: "user", content: message }],
      [classifyTool],
      { type: "function", function: { name: "classify_response" } }
    );

    const toolCall = classifyResult.choices?.[0]?.message?.tool_calls?.[0];
    let result: { type: string; message: string; title?: string; issue_url?: string; pr_url?: string };

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      result = {
        type: "conversation",
        message: classifyResult.choices?.[0]?.message?.content || "Desculpe, não consegui processar.",
      };
    }

    // 7. If build intent → generate code and create PR
    if (result.type === "build") {
      const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

      if (!GITHUB_TOKEN) {
        result.message += "\n\n⚠️ GITHUB_TOKEN não configurado. Não foi possível criar o PR.";
      } else {
        try {
          // Read key project files for context
          const contextFiles = [
            "src/App.tsx",
            "src/index.css",
            "tailwind.config.ts",
            "src/components/ui/button.tsx",
          ];

          const fileContents: string[] = [];
          for (const f of contextFiles) {
            const content = await readFileFromGitHub(f, GITHUB_TOKEN);
            if (content) {
              fileContents.push(`### ${f}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``);
            }
          }

          // Second AI call: generate code
          const codeGenPrompt = `You are a senior TypeScript/React developer for the Fabrik Performance project.

## Project Context
${projectMemory}

## Existing Files (for reference)
${fileContents.join("\n\n")}

## Tech Stack
- React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Supabase client at @/integrations/supabase/client
- Use semantic design tokens (--primary, --background, etc.)
- Components in src/components/, pages in src/pages/, hooks in src/hooks/

## Task
The user wants: ${message}

Plan from classification:
${result.message}

Generate the file changes needed. Create complete, working files. Use existing patterns and conventions from the codebase.`;

          const codeGenResult = await callAI(
            LOVABLE_API_KEY,
            [{ role: "system", content: codeGenPrompt }, { role: "user", content: "Generate the code changes." }],
            [codeGenTool],
            { type: "function", function: { name: "generate_code_changes" } }
          );

          const codeCall = codeGenResult.choices?.[0]?.message?.tool_calls?.[0];
          if (codeCall?.function?.arguments) {
            const codeChanges: { files: FileChange[]; summary: string } = JSON.parse(codeCall.function.arguments);

            if (codeChanges.files.length > 0) {
              const branchName = `ai-builder/${Date.now()}`;
              const prTitle = result.title || message.slice(0, 60).trim() || "AI Builder Task";

              const prBody = `## Solicitação\n\n${message}\n\n---\n\n## Plano\n\n${result.message}\n\n---\n\n## Arquivos alterados\n\n${codeChanges.files.map((f) => `- \`${f.path}\` (${f.action})`).join("\n")}\n\n---\n\n${codeChanges.summary}`;

              const prUrl = await createPullRequest(
                GITHUB_TOKEN,
                branchName,
                prTitle,
                prBody,
                codeChanges.files
              );

              result.pr_url = prUrl;
              result.message += `\n\n✅ **Pull Request criado:** ${prUrl}\n\nArquivos: ${codeChanges.files.map((f) => `\`${f.path}\``).join(", ")}`;
            } else {
              result.message += "\n\n⚠️ A IA não gerou arquivos. Tente ser mais específico.";
            }
          } else {
            result.message += "\n\n⚠️ Não foi possível gerar código para esta solicitação.";
          }
        } catch (ghErr) {
          console.error("PR creation error:", ghErr);
          const errMsg = ghErr instanceof Error ? ghErr.message : "Erro desconhecido";
          result.message += `\n\n⚠️ Erro ao criar PR: ${errMsg}`;
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("ai-builder-chat error:", e);

    const isRateError = typeof e === "object" && e !== null && "status" in e;
    if (isRateError) {
      const err = e as { status: number; message: string };
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
