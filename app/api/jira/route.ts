// app/api/jira-gov/route.ts — Governança MVP · BASA PMO
// Versão corrigida: endpoint /rest/api/3/search + paginação completa

import { NextRequest, NextResponse } from 'next/server';

const BASE    = process.env.JIRA_BASE_URL!;
const EMAIL   = process.env.JIRA_EMAIL!;
const TOKEN   = process.env.JIRA_API_TOKEN!;
const AUTH    = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const HEADERS = {
  'Authorization': `Basic ${AUTH}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

// ── Classificação de DROP por palavras-chave no título ──────────────────────
const DROP_RULES: { drop: string; label: string; keys: string[] }[] = [
  {
    drop: 'D1',
    label: 'Fundação Digital',
    keys: [
      'onboarding','kyc','biometria','autenticacao','autenticação','auth','facematch',
      'ocr','cadastro','abertura de conta','abertura conta','identidade','lgpd',
      'seguranca','segurança','certificado','ssl','tls','keycloak','oauth','rhbk',
      'pld','aml','lista restrit','lista impedit','lista pep','cpf','cnpj',
      'serpro','validacao de documento','validação de documento','contas eleitorais',
      'acesso de dispositivo','authcube','senha','otp','pin','login','password',
    ],
  },
  {
    drop: 'D2',
    label: 'Transações Core',
    keys: [
      'pix','ted','doc','boleto','pagamento','transferencia','transferência',
      'transacao','transação','cnab','dda','debito automatico','débito automático',
      'saque','qr code','copia e cola','codigo de barras','código de barras',
      'comprovante','extrato','tarifa','cobranca','cobrança','nuclea','cip',
      'agendamento','limite pix','limites pix','saque sem cartao','saque sem cartão',
      'saque&pague','saque e pague','notificacao de status','notificação de status',
    ],
  },
  {
    drop: 'D3',
    label: 'Crédito & Produtos',
    keys: [
      'credito','crédito','emprestimo','empréstimo','financiamento','bureau',
      'score','limite de credito','limite de crédito','parcela','refinanciamento',
      'renegociacao','renegociação','fatura','cartao','cartão','nfc','cashback',
      'reemissao de cartao','reemissão de cartão','consignavel','consignável',
      'portabilidade de credito','portabilidade de crédito','proagro','seguro',
      'fno','fomento','cheque especial','iof','taxa de cambio','taxa de câmbio',
      'tarifas','pacote de servico','pacote de serviço','pacote de tarifa',
      'acompanhamento de credito','acompanhamento de crédito','simulador',
    ],
  },
  {
    drop: 'D4',
    label: 'Investimentos & Open Finance',
    keys: [
      'investimento','fundo','cdb','lca','rdb','ativo','carteira','resgate',
      'perfil de investidor','suitability','atm','tecban','open finance',
      'openfinance','carteira digital','wallet','simulacao de investimento',
      'simulação de investimento','renda fixa','portabilidade de salario',
      'portabilidade de salário','gestao financeira','gestão financeira',
      'deposito de cheque','depósito de cheque','talonario','talônário',
      'cheque emitido','cheques','informe de rendimento','informe rendimento',
    ],
  },
  {
    drop: 'D5',
    label: 'Infra & Integrações',
    keys: [
      'cloud','infraestrutura','infrastructure','ambiente','deploy','ci/cd',
      'integracao','integração','temenos','transact','corebanx','go-live',
      'golive','migracao','migração','cutover','legado','legacy','cnab240',
      'infred','asaptech','itss','plataforma','arquitetura','api restritivo',
      'neurotech','lexisnexis','warsaw','engine de risco','sisbajud',
      'judicial','conta judicial','sisjud','whatsapp','chatbot','push',
      'notificacao push','notificação push','provisionamento','monitoramento',
      'acesso do ambiente','ambiente de testes','testes de carga','automacao de testes',
      'automação de testes','performance','capacitacao','capacitação','treinamento',
      'documentacao','documentação','raci','backlog grooming','sprint','agil','ágil',
      'rotatividade','comunicacao entre','comunicação entre','alinhamento entre',
      'fornecedor','parceiro','deskcorp','tailwind','corebanx',
    ],
  },
];

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function classifyDrop(titulo: string): { drop: string; label: string } {
  const t = normalize(titulo);
  for (const rule of DROP_RULES) {
    const normalizedKeys = rule.keys.map(normalize);
    if (normalizedKeys.some(k => t.includes(k))) {
      return { drop: rule.drop, label: rule.label };
    }
  }
  return { drop: 'Geral', label: 'Não classificado' };
}

// ── Classificação de módulo ──────────────────────────────────────────────────
const MODULO_RULES: { modulo: string; keys: string[] }[] = [
  { modulo: 'Segurança',      keys: ['seguranca','segurança','kyc','biometria','facematch','ocr','lgpd','autenticacao','autenticação','auth','ssl','tls','certificado','keycloak','oauth','vulnerabilidade','pci','fraude','antifraude','anti-fraude','lexisnexis','pld','aml'] },
  { modulo: 'Transações',     keys: ['pix','ted','doc','boleto','pagamento','transferencia','transferência','transacao','transação','cnab','dda','debito automatico','débito automático','saque','comprovante','cobranca','cobrança','nuclea','cip'] },
  { modulo: 'Crédito',        keys: ['credito','crédito','emprestimo','empréstimo','financiamento','bureau','score','parcela','refinanciamento','renegociacao','renegociação','fatura','cartao','cartão','consignavel','consignável','iof','cheque especial','fno','fomento'] },
  { modulo: 'Investimentos',  keys: ['investimento','fundo','cdb','lca','rdb','ativo','carteira','resgate','perfil de investidor','suitability','renda fixa','simulacao de investimento','simulação de investimento'] },
  { modulo: 'Onboarding',     keys: ['onboarding','cadastro','abertura de conta','abertura conta','identidade','cpf','cnpj','serpro','contas eleitorais','conta pj','conta pf','neobiz','termo de criacao','termo de criação'] },
  { modulo: 'Infraestrutura', keys: ['cloud','infraestrutura','infrastructure','ambiente','deploy','ci/cd','integracao','integração','temenos','transact','migracao','migração','cutover','legado','legacy','arquitetura','monitoramento','pipeline','appfactory','atm','tecban'] },
];

function classifyModulo(titulo: string): string {
  const t = normalize(titulo);
  for (const rule of MODULO_RULES) {
    const nk = rule.keys.map(normalize);
    if (nk.some(k => t.includes(k))) return rule.modulo;
  }
  return 'Outros';
}

// ── Ciclo de vida do risco ───────────────────────────────────────────────────
const CICLO_VIDA = [
  'Identificado',
  'Avaliado',
  'Mitigação em Curso',
  'Contingência Ativada',
  'Monitorado',
  'Done',
] as const;
type CicloVida = typeof CICLO_VIDA[number];

const JIRA_TO_CICLO: Record<string, CicloVida> = {
  'identificado':         'Identificado',
  'identified':           'Identificado',
  'aberto':               'Identificado',
  'open':                 'Identificado',
  'avaliado':             'Avaliado',
  'assessed':             'Avaliado',
  'classificado':         'Avaliado',
  'em analise':           'Avaliado',
  'em análise':           'Avaliado',
  'in analysis':          'Avaliado',
  'mitigacao em curso':   'Mitigação em Curso',
  'mitigação em curso':   'Mitigação em Curso',
  'in progress':          'Mitigação em Curso',
  'em andamento':         'Mitigação em Curso',
  'mitigando':            'Mitigação em Curso',
  'tratamento':           'Mitigação em Curso',
  'contingencia ativada': 'Contingência Ativada',
  'contingência ativada': 'Contingência Ativada',
  'contingency':          'Contingência Ativada',
  'monitorado':           'Monitorado',
  'monitoring':           'Monitorado',
  'monitoramento':        'Monitorado',
  'done':                 'Done',
  'concluído':            'Done',
  'concluido':            'Done',
  'fechado':              'Done',
  'closed':               'Done',
  'resolved':             'Done',
  'resolvido':            'Done',
  'encerrado':            'Done',
  'mitigado':             'Done',
};

const CICLO_TO_JIRA_TRANSITION: Record<CicloVida, string> = {
  'Identificado':        'Identificado',
  'Avaliado':            'Avaliado',
  'Mitigação em Curso':  'Em Andamento',
  'Contingência Ativada':'Contingência Ativada',
  'Monitorado':          'Monitorado',
  'Done':                'Done',
};

function getCicloVida(statusJira: string): CicloVida {
  const l = normalize(statusJira.trim());
  return JIRA_TO_CICLO[l] ?? 'Identificado';
}

// ── Status helpers ───────────────────────────────────────────────────────────
function getStatusRisco(s: string): string {
  const ciclo = getCicloVida(s);
  if (ciclo === 'Done') return 'Encerrado';
  if (ciclo === 'Mitigação em Curso' || ciclo === 'Contingência Ativada') return 'Em Mitigação';
  if (ciclo === 'Monitorado') return 'Mitigado';
  return 'Aberto';
}

function getStatusMudanca(s: string): string {
  const l = normalize(s);
  if (['done','implementad','conclu','entregue'].some(k => l.includes(k))) return 'Implementada';
  if (['reject','rejeit','cancel','cancelado'].some(k => l.includes(k)))   return 'Rejeitada';
  if (['aprovado','aprovad','approv'].some(k => l.includes(k)))            return 'Aprovada';
  return 'Em Análise';
}

function getPrioridade(p: string): string {
  const l = normalize(p);
  if (l.includes('highest') || l.includes('critical')) return 'Crítico';
  if (l.includes('high'))   return 'Alto';
  if (l.includes('medium')) return 'Médio';
  return 'Baixo';
}

// ── Parceiro responsável ─────────────────────────────────────────────────────
const KNOWN_ASSIGNEES: Record<string, string> = {
  'abisai santos':      'Tailwind',
  'sylvio barreto':     'Tailwind',
  'claudio elson':      'Deskcorp/BASA',
  'leonardo patricio':  'Deskcorp/BASA',
  'leonardo almeida':   'Deskcorp/BASA',
  'rodrigo foggiato':   'Deskcorp/BASA',
  'jairton pimenta':    'Deskcorp/BASA',
  'bruna cordeiro':     'Tailwind',
  'gustavo ravanhani':  'Tailwind',
  'ivan ricardo':       'ITSS',
  'estevao fornaciari': 'ITSS',
  'jesus guillermo':    'ITSS',
  'rayhan uddin':       'ITSS',
  'fabio martins':      'ASAPTech',
  'tiago figueiroa':    'Deskcorp/BASA',
  'jackson paulo':      'Deskcorp/BASA',
  'aries smith':        'Tailwind',
  'gabriel.monteiro':   'Corebanx',
  'gustavo.armoa':      'Corebanx',
  'patrick.rodrigues':  'Deskcorp/BASA',
  'paolo hargreaves':   'Deskcorp/BASA',
  'mariana da rocha':   'Tailwind',
};

function getParceiro(titulo: string, assignee: string): string {
  const t = normalize(titulo + ' ' + assignee);
  if (t.includes('tw dependency - cb') || t.includes('tw dependency - at')) return 'Corebanx';
  if (t.includes('tw dependency - itss')) return 'ITSS';
  if (t.includes('tw dependency'))  return 'Tailwind';
  if (t.includes('asaptech'))       return 'ASAPTech';
  if (t.includes('tecban') || t.includes('saque&pague') || t.includes('saque e pague')) return 'Tecban';
  if (t.includes('neurotech') || t.includes('neurotec'))  return 'Neurotech';
  if (t.includes('temenos') || t.includes('transact') || t.includes('infinity') || t.includes('itss')) return 'Temenos/ITSS';
  if (t.includes('tailwind'))  return 'Tailwind';
  if (t.includes('corebanx'))  return 'Corebanx';
  if (t.includes('deskcorp') || t.includes('basa') || t.includes('pmo')) return 'Deskcorp/BASA';
  const assigneeNorm = normalize(assignee);
  for (const [key, nome] of Object.entries(KNOWN_ASSIGNEES)) {
    if (assigneeNorm.includes(normalize(key))) return nome;
  }
  return 'Não atribuído';
}

function getAvaliacaoStatus(statusJira: string, assignee: string): 'Avaliado' | 'Em Avaliação' | 'Não Avaliado' {
  const s = normalize(statusJira);
  const semResponsavel = !assignee || assignee === 'Não atribuído';
  if (s.includes('identificado') && semResponsavel)  return 'Não Avaliado';
  if (s.includes('identificado') && !semResponsavel) return 'Em Avaliação';
  if (['cftn','classificado','aprovado','resolvido','backlog'].some(k => s.includes(k))) return 'Avaliado';
  return 'Em Avaliação';
}

// ── Jira fetch com retry ─────────────────────────────────────────────────────
async function jiraGet(path: string, retries = 2): Promise<any> {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Jira ${res.status} ${res.statusText} — ${path} | ${body.slice(0, 200)}`);
      }
      return res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

// ── Paginação completa — CORREÇÃO PRINCIPAL ──────────────────────────────────
// Endpoint correto: /rest/api/3/search (não /search/jql)
async function searchAll(jql: string, fields: string, maxTotal = 500): Promise<any[]> {
  const PAGE = 100;
  let all: any[] = [];
  let startAt = 0;
  let total = Infinity;

  while (startAt < total && all.length < maxTotal) {
    const params = new URLSearchParams({
      jql,
      fields,
      maxResults: String(PAGE),
      startAt: String(startAt),
    });

    // ✅ Endpoint correto: /rest/api/3/search
    const data = await jiraGet(`/rest/api/3/search?${params.toString()}`);
    const issues: any[] = data.issues ?? [];
    total = data.total ?? 0;
    all = [...all, ...issues];
    startAt += PAGE;

    // Evita loop infinito se Jira retornar menos que o esperado
    if (issues.length < PAGE) break;
  }

  return all;
}

// ── MAIN GET ─────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const fields = 'summary,status,priority,assignee,labels,created,updated,duedate,description';

    // Busca paralela com paginação para os 3 projetos
    const [pdrIssues, mudIssues, mdbBlocked] = await Promise.all([
      searchAll(`project = "PDR" ORDER BY priority DESC`, fields, 500),
      searchAll(`project = "MUD" ORDER BY created DESC`, fields, 500),
      searchAll(
        `project = "MDB" AND (priority in (Highest, Critical) OR status = Blocked OR labels = bloqueador) ORDER BY priority DESC`,
        fields,
        100
      ),
    ]);

    // ── Processa Riscos (PDR) ──────────────────────────────────────────────
    const riscos = pdrIssues.map((i: any) => {
      const titulo    = i.fields?.summary ?? '';
      const { drop, label: dropLabel } = classifyDrop(titulo);
      const modulo    = classifyModulo(titulo);
      const status    = i.fields?.status?.name ?? '';
      const priority  = i.fields?.priority?.name ?? 'Medium';
      const assignee  = i.fields?.assignee?.displayName ?? 'Não atribuído';
      const parceiro  = getParceiro(titulo, assignee);
      const avaliacaoStatus = getAvaliacaoStatus(status, assignee);
      const prioridade = getPrioridade(priority);
      return {
        key:            i.key,
        titulo,
        modulo,
        drop,
        dropLabel,
        status:         getStatusRisco(status),
        statusJira:     status,
        prioridade,
        impacto:        ['Crítico', 'Alto'].includes(prioridade) ? 'Alto' : priority.toLowerCase().includes('medium') ? 'Médio' : 'Baixo',
        probabilidade:  'Média',
        responsavel:    assignee,
        parceiro,
        avaliacaoStatus,
        cicloVida:      getCicloVida(status),
        prazo:          i.fields?.duedate ?? null,
        criado:         i.fields?.created ?? '',
        atualizado:     i.fields?.updated ?? '',
        url:            `${BASE}/browse/${i.key}`,
        mitigacao:      i.fields?.description?.content?.[0]?.content?.[0]?.text ?? '',
        labels:         i.fields?.labels ?? [],
      };
    });

    // ── Processa Mudanças (MUD) ───────────────────────────────────────────
    const mudancas = mudIssues.map((i: any) => {
      const titulo    = i.fields?.summary ?? '';
      const { drop, label: dropLabel } = classifyDrop(titulo);
      const modulo    = classifyModulo(titulo);
      const status    = i.fields?.status?.name ?? '';
      const priority  = i.fields?.priority?.name ?? 'Medium';
      const assignee  = i.fields?.assignee?.displayName ?? 'Não atribuído';
      const parceiro  = getParceiro(titulo, assignee);
      const avaliacaoStatus = getAvaliacaoStatus(status, assignee);
      return {
        key:            i.key,
        titulo,
        modulo,
        drop,
        dropLabel,
        status:         getStatusMudanca(status),
        statusJira:     status,
        impacto:        ['Crítico', 'Alto'].includes(getPrioridade(priority)) ? 'Alto' : priority.toLowerCase().includes('medium') ? 'Médio' : 'Baixo',
        responsavel:    assignee,
        parceiro,
        avaliacaoStatus,
        prazo:          i.fields?.duedate ?? null,
        criado:         i.fields?.created ?? '',
        atualizado:     i.fields?.updated ?? '',
        url:            `${BASE}/browse/${i.key}`,
        descricao:      i.fields?.description?.content?.[0]?.content?.[0]?.text ?? '',
        labels:         i.fields?.labels ?? [],
      };
    });

    // ── Issues críticas MDB ───────────────────────────────────────────────
    const criticas = mdbBlocked.map((i: any) => {
      const titulo = i.fields?.summary ?? '';
      const { drop } = classifyDrop(titulo);
      return {
        key:          i.key,
        titulo,
        status:       i.fields?.status?.name ?? '',
        prioridade:   getPrioridade(i.fields?.priority?.name ?? ''),
        responsavel:  i.fields?.assignee?.displayName ?? 'Não atribuído',
        drop,
        modulo:       classifyModulo(titulo),
        url:          `${BASE}/browse/${i.key}`,
        labels:       i.fields?.labels ?? [],
      };
    });

    // ── Matriz por módulo ─────────────────────────────────────────────────
    const MODULOS = ['Segurança', 'Transações', 'Investimentos', 'Crédito', 'Onboarding', 'Infraestrutura'];
    const matrizModulos = MODULOS.map(mod => {
      const rm   = riscos.filter((r: any) => r.modulo === mod);
      const crit = rm.filter((r: any) => r.prioridade === 'Crítico' || r.impacto === 'Alto');
      const ab   = rm.filter((r: any) => r.status === 'Aberto' || r.status === 'Em Mitigação');
      return {
        modulo:    mod,
        total:     rm.length,
        criticos:  crit.length,
        abertos:   ab.length,
        mitigados: rm.filter((r: any) => ['Mitigado', 'Encerrado'].includes(r.status)).length,
        score:     rm.length > 0
          ? Math.max(0, Math.round(100 - ((crit.length * 30 + ab.length * 10) / rm.length)))
          : 100,
      };
    });

    // ── Resumo por DROP ───────────────────────────────────────────────────
    const DROPS = [
      { drop: 'D1', label: 'Fundação Digital' },
      { drop: 'D2', label: 'Transações Core' },
      { drop: 'D3', label: 'Crédito & Produtos' },
      { drop: 'D4', label: 'Investimentos & Open Finance' },
      { drop: 'D5', label: 'Infra & Integrações' },
    ];
    const resumoDrops = DROPS.map(({ drop, label }) => ({
      drop,
      label,
      riscos:             riscos.filter((r: any) => r.drop === drop).length,
      riscosAltos:        riscos.filter((r: any) => r.drop === drop && r.impacto === 'Alto').length,
      mudancas:           mudancas.filter((m: any) => m.drop === drop).length,
      mudancasAnalise:    mudancas.filter((m: any) => m.drop === drop && m.status === 'Em Análise').length,
      mudancasAprovadas:  mudancas.filter((m: any) => m.drop === drop && m.status === 'Aprovada').length,
      mudancasImpl:       mudancas.filter((m: any) => m.drop === drop && m.status === 'Implementada').length,
      criticas:           criticas.filter((c: any) => c.drop === drop).length,
    }));

    // ── Summary geral ─────────────────────────────────────────────────────
    const summary = {
      totalRiscos:        riscos.length,
      riscosAbertos:      riscos.filter((r: any) => r.status === 'Aberto').length,
      riscosCriticos:     riscos.filter((r: any) => r.prioridade === 'Crítico').length,
      riscosAltos:        riscos.filter((r: any) => r.prioridade === 'Alto').length,
      emMitigacao:        riscos.filter((r: any) => r.status === 'Em Mitigação').length,
      mitigados:          riscos.filter((r: any) => ['Mitigado', 'Encerrado'].includes(r.status)).length,
      totalMudancas:      mudancas.length,
      mudancasAnalise:    mudancas.filter((m: any) => m.status === 'Em Análise').length,
      mudancasAprovadas:  mudancas.filter((m: any) => m.status === 'Aprovada').length,
      mudancasImpl:       mudancas.filter((m: any) => m.status === 'Implementada').length,
      totalCriticas:      criticas.length,
      riscosGeral:        riscos.filter((r: any) => r.drop === 'Geral').length,
      mudancasGeral:      mudancas.filter((m: any) => m.drop === 'Geral').length,
    };

    // ── Resumo por parceiro ───────────────────────────────────────────────
    const PARCEIROS_LISTA = [
      'Tailwind','Corebanx','ITSS','Neurotech','Temenos/ITSS',
      'Tecban','ASAPTech','Deskcorp/BASA','Não atribuído',
    ];
    const resumoParceiros = PARCEIROS_LISTA.map(nome => {
      const riscosP   = riscos.filter((r: any) => r.parceiro === nome);
      const mudancasP = mudancas.filter((m: any) => m.parceiro === nome);
      const todos     = [...riscosP, ...mudancasP];
      const naoAvaliados = todos.filter((i: any) => i.avaliacaoStatus === 'Não Avaliado').length;
      const emAvaliacao  = todos.filter((i: any) => i.avaliacaoStatus === 'Em Avaliação').length;
      const avaliados    = todos.filter((i: any) => i.avaliacaoStatus === 'Avaliado').length;
      const drops = [...new Set([
        ...riscosP.map((r: any) => r.drop),
        ...mudancasP.map((m: any) => m.drop),
      ])].filter(d => d !== 'Geral');
      return {
        nome,
        totalRiscos:   riscosP.length,
        totalMudancas: mudancasP.length,
        total:         todos.length,
        naoAvaliados,
        emAvaliacao,
        avaliados,
        drops,
        pctAvaliado: todos.length > 0
          ? Math.round((avaliados / todos.length) * 100)
          : 0,
      };
    }).filter(p => p.total > 0);

    return NextResponse.json({
      geradoEm: new Date().toISOString(),
      totalIssues: {
        pdr: pdrIssues.length,
        mud: mudIssues.length,
        mdbCriticas: mdbBlocked.length,
      },
      summary,
      riscos,
      mudancas,
      criticas,
      matrizModulos,
      resumoDrops,
      resumoParceiros,
      dropRules: DROP_RULES.map(r => ({ drop: r.drop, label: r.label })),
    });

  } catch (err: any) {
    console.error('[GOV API ERROR]', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno', stack: process.env.NODE_ENV === 'development' ? err.stack : undefined },
      { status: 500 }
    );
  }
}

// ── PATCH: Atualizar ciclo de vida do risco no Jira ──────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { issueKey, cicloVida } = await req.json();
    if (!issueKey || !cicloVida) {
      return NextResponse.json({ error: 'issueKey e cicloVida são obrigatórios' }, { status: 400 });
    }

    // 1. Buscar transições disponíveis
    const transData = await jiraGet(`/rest/api/3/issue/${issueKey}/transitions`);
    const transitions: any[] = transData.transitions ?? [];

    const targetName = CICLO_TO_JIRA_TRANSITION[cicloVida as CicloVida] ?? cicloVida;

    const findTransition = (name: string) =>
      transitions.find((t: any) =>
        normalize(t.name).includes(normalize(name)) ||
        normalize(t.to?.name ?? '').includes(normalize(name))
      );

    const transition = findTransition(targetName) ?? findTransition(cicloVida);

    if (!transition) {
      return NextResponse.json({
        error: `Transição "${cicloVida}" não encontrada`,
        available: transitions.map((t: any) => t.name),
      }, { status: 404 });
    }

    await fetch(`${BASE}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    return NextResponse.json({ success: true, transition: transition.name });

  } catch (err: any) {
    console.error('[GOV PATCH ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
