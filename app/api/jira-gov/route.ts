import { NextResponse } from 'next/server';

const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;

const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ─── Paginação via nextPageToken (Jira Cloud novo endpoint) ──────────────────
async function searchAll(jql: string, fields: string[], maxTotal = 5000) {
  const all: any[] = [];
  let token: string | undefined = undefined;
  const pageSize = 100;

  while (all.length < maxTotal) {
    const body: any = {
      jql,
      fields,
      maxResults: Math.min(pageSize, maxTotal - all.length),
    };
    if (token) body.nextPageToken = token;

    const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira search failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const issues: any[] = data.issues ?? [];
    all.push(...issues);

    token = data.nextPageToken ?? undefined;
    if (!token || issues.length === 0) break;
  }

  return all;
}

// ─── Módulos ─────────────────────────────────────────────────────────────────
const MODULOS = [
  'Segurança',
  'Transações',
  'Investimentos',
  'Crédito',
  'Onboarding',
  'Infraestrutura',
];

const DROP_LABELS: Record<string, string> = {
  D1: 'Fundacao Digital',
  D2: 'Transacoes Core',
  D3: 'Credito e Produtos',
  D4: 'Investimentos e Open Finance',
  D5: 'Infra e Integracoes',
  Geral: 'Nao classificado',
};

interface MR {
  valor: RegExp;
  modulo: string;
  drop: string;
}

const MR: MR[] = [
  { valor: /segur|vpn|lgpd|pci|kyc|aml|biometr|facematch|ocr|antifraude|fraude|autenti|keycloak|iam/i, modulo: 'Segurança', drop: 'D1' },
  { valor: /pix|ted|boleto|pagamento|transf|saque|depósito|deposito|extrato|cnab|dda|débito|debito|cobrança/i, modulo: 'Transações', drop: 'D2' },
  { valor: /cheque especial|overdraft|empréstimo|emprestimo|financiamento|limite de conta|neurotech|bureau/i, modulo: 'Crédito', drop: 'D3' },
  { valor: /investimento|poupança|poupanca|fundo|resgate|aplicação|aplicacao|rendimento|cdb|lca|rdb/i, modulo: 'Investimentos', drop: 'D4' },
  { valor: /onboarding|cadastro|abertura de conta|cpf|cnpj/i, modulo: 'Onboarding', drop: 'D1' },
  { valor: /infra|ambiente|cloud|integração|integracao|api|temenos|transact|corebanx|migração|migracao|atm|sisbajud/i, modulo: 'Infraestrutura', drop: 'D5' },
];

function inferModuloDrop(issue: any): { modulo: string; drop: string; dropLabel: string } {
  const summary: string = issue.fields?.summary ?? '';
  for (const rule of MR) {
    if (rule.valor.test(summary)) {
      return { modulo: rule.modulo, drop: rule.drop, dropLabel: DROP_LABELS[rule.drop] };
    }
  }
  return { modulo: 'Outros', drop: 'Geral', dropLabel: 'Nao classificado' };
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseRisco(issue: any) {
  const f = issue.fields;
  const { modulo, drop, dropLabel } = inferModuloDrop(issue);
  const prioridade = f.priority?.name ?? 'Medium';
  const status = f.status?.name ?? 'Identificado';

  const prioridadeMap: Record<string, string> = {
    Highest: 'Critico', High: 'Alto', Medium: 'Medio', Low: 'Baixo', Lowest: 'Baixo',
  };
  const impactoMap: Record<string, string> = {
    Highest: 'Alto', High: 'Alto', Medium: 'Medio', Low: 'Baixo', Lowest: 'Baixo',
  };
  const cicloMap: Record<string, string> = {
    Identificado: 'Identificado', Avaliado: 'Avaliado',
    'Em Mitigação': 'Em Mitigacao', Mitigado: 'Mitigado', Fechado: 'Fechado',
  };

  const avaliacaoStatus =
    status === 'Identificado' ? 'Nao Avaliado'
    : status === 'Avaliado' ? 'Em Avaliacao'
    : status === 'Mitigado' ? 'Mitigado'
    : 'Nao Avaliado';

  return {
    key: issue.key,
    titulo: f.summary ?? '',
    modulo, drop, dropLabel,
    status: ['Fechado', 'Done', 'Resolvido', 'Closed'].includes(status) ? 'Fechado' : 'Aberto',
    statusJira: status,
    prioridade: prioridadeMap[prioridade] ?? 'Medio',
    impacto: impactoMap[prioridade] ?? 'Medio',
    probabilidade: 'Media',
    responsavel: f.assignee?.displayName ?? 'Nao atribuido',
    parceiro: f.customfield_10038?.value ?? f.customfield_10037?.value ?? 'Nao atribuido',
    avaliacaoStatus,
    cicloVida: cicloMap[status] ?? 'Identificado',
    prazo: f.duedate ?? null,
    criado: f.created,
    atualizado: f.updated,
    url: `${JIRA_BASE_URL}/browse/${issue.key}`,
    mitigacao: f.customfield_10034 ?? '',
    labels: f.labels ?? [],
  };
}

function parseMudanca(issue: any) {
  const f = issue.fields;
  const { modulo, drop, dropLabel } = inferModuloDrop(issue);
  const status = f.status?.name ?? 'Backlog';

  // Mapeamento completo dos status reais do Jira MUD
  const statusMapa: Record<string, string> = {
    // Aprovadas
    'Aprovado':       'Aprovada',
    'Aprovada':       'Aprovada',
    'Approved':       'Aprovada',
    // Rejeitadas
    'Cancelado':      'Rejeitada',
    'Cancelled':      'Rejeitada',
    'Rejected':       'Rejeitada',
    // Implementadas
    'In Progress':    'Implementada',
    'Done':           'Implementada',
    // Em Análise — todos os demais status do MUD
    'Backlog':              'Em Analise',
    'CFTN - I':             'Em Analise',
    'CFTN - B':             'Em Analise',
    'Não Classificado':     'Em Analise',
    'Nao Classificado':     'Em Analise',
    'Classificado':         'Em Analise',
    'Resolvido':            'Em Analise',
  };

  const impacto =
    f.priority?.name === 'High' || f.priority?.name === 'Highest' ? 'Alto'
    : f.priority?.name === 'Low' || f.priority?.name === 'Lowest' ? 'Baixo'
    : 'Medio';

  const statusFinal = statusMapa[status] ?? 'Em Analise';

  const avaliacaoStatus =
    statusFinal === 'Aprovada' || statusFinal === 'Implementada' ? 'Avaliado'
    : statusFinal === 'Rejeitada' ? 'Em Avaliacao'
    : 'Avaliado';

  return {
    key: issue.key,
    titulo: f.summary ?? '',
    modulo, drop, dropLabel,
    status: statusFinal,
    statusJira: status,
    impacto,
    responsavel: f.assignee?.displayName ?? 'Nao atribuido',
    parceiro: f.customfield_10038?.value ?? f.customfield_10037?.value ?? 'Nao atribuido',
    avaliacaoStatus,
    prazo: f.duedate ?? null,
    criado: f.created,
    atualizado: f.updated,
    url: `${JIRA_BASE_URL}/browse/${issue.key}`,
    descricao: '',
    labels: f.labels ?? [],
  };
}

function parseCritica(issue: any) {
  const f = issue.fields;
  const { modulo, drop } = inferModuloDrop(issue);
  return {
    key: issue.key,
    titulo: f.summary ?? '',
    status: f.status?.name ?? 'Blocked',
    prioridade:
      f.priority?.name === 'High' || f.priority?.name === 'Highest' ? 'Alto'
      : f.priority?.name === 'Low' ? 'Baixo'
      : 'Medio',
    responsavel: f.assignee?.displayName ?? 'Nao atribuido',
    drop, modulo,
    url: `${JIRA_BASE_URL}/browse/${issue.key}`,
    labels: f.labels ?? [],
  };
}

// ─── Matrizes e resumos ───────────────────────────────────────────────────────

function buildMatrizModulos(riscos: any[]) {
  return MODULOS.map((modulo) => {
    const s = riscos.filter((r) => r.modulo === modulo);
    return {
      modulo,
      total: s.length,
      criticos: s.filter((r) => r.prioridade === 'Critico').length,
      abertos: s.filter((r) => r.status === 'Aberto').length,
      mitigados: s.filter((r) => r.status === 'Fechado').length,
      score: s.length === 0 ? 100 : Math.max(0, 100 - s.filter((r) => r.status === 'Aberto').length * 2),
    };
  });
}

function buildResumoDrops(riscos: any[], mudancas: any[], criticas: any[]) {
  return ['D1', 'D2', 'D3', 'D4', 'D5'].map((drop) => ({
    drop,
    label: DROP_LABELS[drop],
    riscos: riscos.filter((r) => r.drop === drop).length,
    riscosAltos: riscos.filter((r) => r.drop === drop && (r.prioridade === 'Alto' || r.prioridade === 'Critico')).length,
    mudancas: mudancas.filter((m) => m.drop === drop).length,
    mudancasAnalise: mudancas.filter((m) => m.drop === drop && m.status === 'Em Analise').length,
    mudancasAprovadas: mudancas.filter((m) => m.drop === drop && m.status === 'Aprovada').length,
    mudancasImpl: mudancas.filter((m) => m.drop === drop && m.status === 'Implementada').length,
    criticas: criticas.filter((c) => c.drop === drop).length,
  }));
}

function buildResumoParceiros(riscos: any[], mudancas: any[]) {
  const parceiroSet = new Set<string>();
  riscos.forEach((r) => parceiroSet.add(r.parceiro));
  mudancas.forEach((m) => parceiroSet.add(m.parceiro));

  return Array.from(parceiroSet).map((nome) => {
    const rS = riscos.filter((r) => r.parceiro === nome);
    const mS = mudancas.filter((m) => m.parceiro === nome);
    const todos = [...rS, ...mS];
    const total = todos.length;
    const avaliados = todos.filter((i) => i.avaliacaoStatus === 'Avaliado' || i.avaliacaoStatus === 'Mitigado').length;
    const emAvaliacao = todos.filter((i) => i.avaliacaoStatus === 'Em Avaliacao' || i.avaliacaoStatus === 'Em Mitigacao').length;
    const naoAvaliados = todos.filter((i) => i.avaliacaoStatus === 'Nao Avaliado').length;
    const drops = Array.from(new Set(todos.map((i) => i.drop).filter((d) => d !== 'Geral')));
    return {
      nome, totalRiscos: rS.length, totalMudancas: mS.length, total,
      naoAvaliados, emAvaliacao, avaliados, drops,
      pctAvaliado: total > 0 ? Math.round((avaliados / total) * 100) : 0,
    };
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const fields = [
      'summary', 'status', 'priority', 'assignee', 'duedate',
      'created', 'updated', 'labels', 'components', 'description',
      'customfield_10020', 'customfield_10034', 'customfield_10037', 'customfield_10038',
    ];

    const [rawRiscos, rawMudancas, rawCriticas] = await Promise.all([
      searchAll(`project = "PDR" ORDER BY created DESC`, fields, 500),
      searchAll(`project = "MUD" ORDER BY created DESC`, fields, 5000),
      searchAll(`project = "MDB" AND status = Blocked ORDER BY created DESC`, fields, 100),
    ]);

    const riscos   = rawRiscos.map(parseRisco);
    const mudancas = rawMudancas.map(parseMudanca);
    const criticas = rawCriticas.map(parseCritica);

    const summary = {
      totalRiscos:      riscos.length,
      riscosAbertos:    riscos.filter((r) => r.status === 'Aberto').length,
      riscosCriticos:   riscos.filter((r) => r.prioridade === 'Critico').length,
      riscosAltos:      riscos.filter((r) => r.prioridade === 'Alto').length,
      emMitigacao:      riscos.filter((r) => r.cicloVida === 'Em Mitigacao').length,
      mitigados:        riscos.filter((r) => r.status === 'Fechado').length,
      totalMudancas:    mudancas.length,
      mudancasAnalise:  mudancas.filter((m) => m.status === 'Em Analise').length,
      mudancasAprovadas:mudancas.filter((m) => m.status === 'Aprovada').length,
      mudancasImpl:     mudancas.filter((m) => m.status === 'Implementada').length,
      totalCriticas:    criticas.length,
      riscosGeral:      riscos.filter((r) => r.drop === 'Geral').length,
      mudancasGeral:    mudancas.filter((m) => m.drop === 'Geral').length,
    };

    return NextResponse.json({
      geradoEm: new Date().toISOString(),
      totalIssues: {
        pdr: rawRiscos.length,
        mud: rawMudancas.length,
        mdbCriticas: rawCriticas.length,
      },
      summary,
      riscos,
      mudancas,
      criticas,
      matrizModulos:    buildMatrizModulos(riscos),
      resumoDrops:      buildResumoDrops(riscos, mudancas, criticas),
      resumoParceiros:  buildResumoParceiros(riscos, mudancas),
      dropRules: Object.entries(DROP_LABELS)
        .filter(([k]) => k !== 'Geral')
        .map(([drop, label]) => ({ drop, label })),
    });
  } catch (error: any) {
    console.error('[jira-gov] erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
