# BASA PMO — Dashboard Executivo
### Greenfield MVP-1 · Banco da Amazônia

Dashboard de gestão de projetos integrado ao Jira, com visão gerencial de cards, parceiros, bugs, sprints, gestão de mudanças e riscos.

---

## Estrutura do projeto

```
/
├── app/
│   ├── page.tsx                      # Dashboard principal (UI)
│   ├── layout.tsx                    # Layout raiz Next.js
│   ├── globals.css                   # Estilos globais
│   └── api/
│       ├── jira/
│       │   ├── route.ts              # Proxy server-side Jira API
│       │   └── webhook/
│       │       └── route.ts          # Recebe eventos do Jira (webhook)
│       └── notify/
│           ├── route.ts              # Dispara Email + Teams (uso futuro)
│           └── email-template.ts     # Template HTML dos emails
├── .env.local                        # Credenciais (nunca commitar)
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── next-env.d.ts
└── package.json
```

---

## Pré-requisitos

- Node.js 20+
- npm 9+
- Acesso ao Jira: `https://deskcorp.atlassian.net`
- Projeto Jira: `MDB`

---

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Instalar Nodemailer (para notificações futuras)
npm install nodemailer
npm install --save-dev @types/nodemailer

# 3. Configurar variáveis de ambiente
cp .env.local.example .env.local
# editar .env.local com as credenciais

# 4. Rodar em desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`

---

## Variáveis de ambiente (.env.local)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `JIRA_BASE_URL` | URL base do Jira | ✅ |
| `JIRA_EMAIL` | Email da conta Jira | ✅ |
| `JIRA_API_TOKEN` | Token de API do Jira | ✅ |
| `JIRA_PROJECT_KEY` | Chave do projeto (ex: `MDB`) | ✅ |
| `JIRA_WEBHOOK_SECRET` | Secret do webhook (opcional) | ❌ |
| `TEAMS_WEBHOOK_URL` | URL do Incoming Webhook Teams | 🔜 futuro |
| `SMTP_HOST` | Servidor SMTP | 🔜 futuro |
| `SMTP_PORT` | Porta SMTP (padrão: 587) | 🔜 futuro |
| `SMTP_USER` | Usuário SMTP | 🔜 futuro |
| `SMTP_PASS` | Senha SMTP | 🔜 futuro |
| `SMTP_FROM` | Remetente dos emails | 🔜 futuro |
| `NEXT_PUBLIC_APP_URL` | URL pública do dashboard | ✅ |
| `NEXT_PUBLIC_JIRA_BASE_URL` | URL pública do Jira (links nos cards) | ✅ |

---

## Funcionalidades

### Visão Geral
- KPIs: total de cards, em atendimento, concluídos, bloqueados, pendentes, bugs
- Distribuição por status
- Top responsáveis com barra de progresso
- Preview dos cards parados mais críticos

### Cards Parados ⏱
- Cards sem movimentação há 7+ dias
- Ordenado por dias parado (mais crítico primeiro)
- Exibe último comentário e data

### Em Revisão 🔍
- Cards com status de revisão/aprovação
- Identificação automática por keywords de status

### Bugs ⚠
- Todos os bugs em aberto
- Prioridade, responsável, tempo parado

### Por Responsável
- Distribuição de cards por pessoa
- Barra de progresso por status

### Por Sprint
- Progresso de cada sprint
- Contagem por categoria de status

### Gestão de Mudanças
- Solicitações de mudança com impacto, status e histórico de aprovações
> ⚠ Dados mock — conectar ao Jira via label `mudança` quando disponível

### Gestão de Riscos
- Matriz Probabilidade × Impacto
- Plano de mitigação, responsável, prazo, status
> ⚠ Dados mock — conectar ao Jira via label `risco` quando disponível

---

## Integração Jira

### API (dados em tempo real)
O dashboard chama `/api/jira` que faz proxy server-side para a API do Jira.
O token nunca é exposto no browser.

```
GET /api/jira?action=projects          # lista projetos disponíveis
GET /api/jira?action=dashboard&project=MDB  # dados completos do dashboard
```

### Webhook (eventos automáticos — uso futuro)
Configurar no Jira: **Settings → System → WebHooks → Create**

- URL: `https://SEU-DOMINIO/api/jira/webhook`
- Eventos: ✅ Issue Created · ✅ Issue Updated

### Keywords de status
Ajustar em `app/api/jira/route.ts` para bater com os status reais do projeto MDB:

```ts
const TODO_KEYWORDS     = ['to do', 'pendente', 'backlog', ...]
const DOING_KEYWORDS    = ['in progress', 'em andamento', ...]
const BLOCKED_KEYWORDS  = ['blocked', 'bloqueado', ...]
const DONE_KEYWORDS     = ['done', 'concluído', ...]
const REVISAO_KEYWORDS  = ['in review', 'em revisão', ...]
```

---

## Notificações (uso futuro)

O módulo de notificações está implementado mas desativado na UI.
Quando retomar, os arquivos estão em:
- `app/api/notify/route.ts` — disparo Email + Teams
- `app/api/notify/email-template.ts` — template HTML

Eventos suportados:
- `card_criado` — novo card criado no Jira
- `responsavel_alterado` — troca de responsável
- `card_em_revisao` — card entrou em revisão
- `card_bloqueado` — card bloqueado
- `card_parado` — card sem movimentação

---

## Scripts

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run start    # iniciar em produção
npm run lint     # verificar código
```

---

## Tecnologias

- [Next.js 16](https://nextjs.org) — framework React
- [TypeScript](https://typescriptlang.org)
- [Chart.js](https://chartjs.org) + [react-chartjs-2](https://react-chartjs-2.js.org)
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Microsoft Teams Incoming Webhook](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Nodemailer](https://nodemailer.com) (notificações futuras)

---

## Links úteis

- Jira do projeto: [https://deskcorp.atlassian.net/jira/software/projects/MDB](https://deskcorp.atlassian.net/jira/software/projects/MDB)
- Exemplo de issue: [MDB-217](https://deskcorp.atlassian.net/browse/MDB-217)
- Gerar token Jira: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

---

*Mantido pela equipe BASA PMO · carol.siqueira@deskcorp.com.br*
