# Segunda confirmação da revisão final — PR-B2 cutover do check-in v3

Commit revisado: `8b7af11864d2e25358efaba5a46f7427983367d9`  
Base de comparação: `review_final_b2_confirm.md` e `git show HEAD`.

## Veredito

**NO-GO para merge.** A fila fecha a concorrência A→B→C na mesma montagem, a identidade do commit normal é registrada e as duas invalidações agora precedem o guard de versão. Os três gates passam. Porém, a sentinela introduz um caminho que libera “Iniciar treino” depois de uma gravação de alternativa que falhou: no remount, a escolha global retida é presumida como persistida sem ser comparada com a conduta reidratada do banco. A troca de aluna também abandona uma fila ainda ativa sem impedir que ela publique estado no novo escopo.

## Achados

### 1. BLOCKER — Remount após erro presume que a alternativa não persistida já está no banco

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:241-249`, `632-693`, `719-800`, `1476-1496`; estado global em `src/contexts/TrainingContext.tsx:69-95`.

Sequência demonstrável pelo código:

1. Há um check-in `done` com a conduta A persistida. O coach escolhe a alternativa B.
2. O upsert de B falha. A tela mantém B em `selectedAlternative`, o banco continua em A e `conductSyncState` vira `error`, corretamente.
3. O coach sai da aba Treinamento e volta. `selectedAlternative` e `checkInRecord` sobrevivem no `TrainingProvider`, mas `conductSyncState` volta a `idle` e `lastPersistedAlternativeRef` nasce `undefined` com a nova montagem.
4. O efeito das linhas 680-693 observa `done`, copia B para a ref e retorna sem gravar. A reidratação lê a linha A, mas não compara `f.conduta` com a conduta exibida; nas linhas 794-796 ela volta a registrar cegamente `conductAlternative?.type`, isto é, B.
5. Como o estado local de erro foi perdido e a ref diz que B já foi persistida, o CTA fica habilitado. A sessão pode começar em B enquanto o prontuário permanece em A, sem mensagem nem retry.

Isso recria exatamente a divergência clínica/auditável do BLOCKER original. A primeira observação só pode ser adotada como persistida quando houver evidência correspondente no registro reidratado. Uma solução objetiva é derivar a identidade persistida da própria linha v2 (`f.conduta`, ou um identificador explícito da alternativa) e manter `saving/error` ou regravar quando ela divergir da conduta exibida. O teste dirigido deve cobrir: A persistida → escolher B → upsert falha → remount → B não pode liberar o CTA até persistir.

### 2. MAJOR — Fila anterior pode publicar `idle`/`error` depois da troca de aluna

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:251-260`, `654-678`.

Na troca de `studentId`, a ref recebe uma fila nova, mas a fila antiga não é cancelada nem invalidada. Para uma tarefa em voo, `isLatest()` continua consultando a geração da fila antiga; portanto ela ainda pode retornar `true` após a troca.

Se a mesma instância do dashboard muda de A para B (por exemplo, navegação entre alunas já em cache), uma gravação de A pode concluir enquanto B já está em `saving` e publicar `idle`, liberando cedo o CTA de B. Se falhar, pode publicar `error` e toast de A na tela de B. O payload continua corretamente escopado para A; a regressão é a publicação de estado local fora do escopo.

A publicação precisa ser guardada também pela aluna/instância corrente, ou a fila antiga deve ser invalidada no reset. O teste dirigido deve manter A em voo, trocar para B, iniciar uma gravação de B e então resolver/rejeitar A; nenhuma transição ou toast de A pode atingir B.

## Confirmação dos três achados anteriores

- **Latest-wins na mesma fila:** fechado no util e na integração nominal. Tarefa superada antes de começar é pulada; tarefa em voo termina antes da mais nova; só a geração mais recente publica sucesso/erro. O erro é tratado dentro da tarefa e não é engolido pela `.catch()` da fila. Os quatro testes do util passam.
- **Remount/reidratação:** a escrita redundante do caso feliz foi removida, e o commit normal registra `conductAlternative?.type ?? null`; **não está fechado no caso de falha**, pelo BLOCKER 1.
- **Invalidações:** fechado. As invalidações de `checkin-rehydrate` e `perception-history` estão imediatamente após o upsert bem-sucedido e antes de `conductVersionRef.current !== startedVersion`. No fluxo normal, a reconciliação já terminou antes de o formulário ser interativo, e `rehydratedRef` impede a refetch invalidada de reaplicar estado local na mesma montagem.

## Gates executados no HEAD

- `npx tsc -b --force`: **PASS**.
- `npx vitest run`: **PASS** — 111 arquivos passaram, 1 pulado; 2.058 testes passaram, 33 pulados.
- `npm run lint`: **PASS sem erros** — 4 warnings preexistentes/fora do diff em `WhoopActivityCard.tsx`, `OuraTabContent.tsx` e `WhoopTabContent.tsx`.
- `git diff --check`: **PASS**.

## Critério objetivo para GO

Não presumir que a alternativa global retida foi persistida: reconciliar a identidade exibida com a conduta efetivamente reidratada e preservar o bloqueio/retry após falha e remount. Impedir também que uma fila de outra aluna publique estado ou toast no escopo corrente. Depois, repetir os três gates e adicionar os dois testes dirigidos descritos acima.
