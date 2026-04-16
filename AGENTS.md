<!-- BEGIN:basa-pmo-agent-rules -->

# BASA PMO — Regras para Agentes

## Contexto do projeto
- **Projeto:** BASA PMO · Greenfield MVP-1 · Banco da Amazônia
- **Stack:** Next.js 16 (App Router) · TypeScript · React 19
- **Jira:** https://deskcorp.atlassian.net · Projeto: `MDB`
- **Padrão de issue:** `MDB-XXX` (ex: MDB-217)

---

## Estrutura de pastas (App Router)

```
app/
  page.tsx           ← ÚNICO arquivo de UI do dashboard
  layout.tsx         ← layout raiz — não alterar sem necessidade
  globals.css        ← estilos base — não duplicar estilos aqui
  api/
    jira/
      route.ts       ← proxy Jira — lógica de busca e classificação
      webhook/
        route.ts     ← receptor de eventos do Jira
    notify/
      route.ts       ← notificações Email + Teams (desativado na UI)
      email-template.ts
```

---

## Regras de desenvolvimento

### Sempre
- Usar `'use client'` apenas em `app/page.tsx` — rotas API são sempre server-side
- Credenciais ficam APENAS no `.env.local` e variáveis `process.env.*` server-side
- Variáveis expostas ao browser precisam do prefixo `NEXT_PUBLIC_`
- Links para issues Jira seguem o padrão: `https://deskcorp.atlassian.net/browse/MDB-XXX`
- Manter `JIRA_PROJECT_KEY=MDB` no `.env.local`

### Nunca
- Nunca colocar `JIRA_API_TOKEN` em arquivos client-side (`'use client'`)
- Nunca hardcodar senhas, tokens ou URLs de webhook no código
- Nunca commitar `.env.local` — está no `.gitignore`
- Nunca usar `any` em tipos críticos — definir interfaces em `app/page.tsx`
- Nunca renomear `app/api/jira/route.ts` — o frontend chama `/api/jira`

---

## Convenções de código

### Classificação de status Jira
Ao adicionar novos status, editar APENAS em `app/api/jira/route.ts`:
```ts
const TODO_KEYWORDS     = [...]   // status "pendente"
const DOING_KEYWORDS    = [...]   // status "em andamento"
const BLOCKED_KEYWORDS  = [...]   // status "bloqueado"
const DONE_KEYWORDS     = [...]   // status "concluído"
const REVISAO_KEYWORDS  = [...]   // status "em revisão"
```

### Dados mock (temporários)
Os dados de Gestão de Mudanças e Riscos são mock em `app/page.tsx`:
```ts
const MUDANCAS = [...]   // linha ~761
const RISCOS   = [...]   // linha ~836
```
Quando o Jira tiver issues com labels `mudança` e `risco`, substituir por chamada à API.

### Notificações (desativadas)
O módulo de notificações (`app/api/notify/`) está implementado mas sem botões na UI.
Não remover os arquivos — serão reativados em sprint futuro.

---

## API Routes disponíveis

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/jira?action=projects` | Lista projetos Jira |
| GET | `/api/jira?action=dashboard&project=MDB` | Dados completos do dashboard |
| POST | `/api/jira/webhook` | Recebe eventos do Jira |
| POST | `/api/notify` | Dispara Email + Teams (uso futuro) |
| GET | `/api/notify` | Verifica configuração de notificações |

---

## Dependências principais

```json
{
  "next": "16.2.1",
  "react": "19.2.4",
  "chart.js": "^4.5.1",
  "react-chartjs-2": "^5.3.1",
  "nodemailer": "instalado separado"
}
```

<!-- END:basa-pmo-agent-rules -->
