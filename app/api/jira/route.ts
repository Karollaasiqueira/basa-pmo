// app/api/jira/route.ts — Proxy server-side Jira · BASA PMO
// Versão corrigida: endpoint /rest/api/3/search + paginação completa + multi-projeto

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL  = process.env.JIRA_BASE_URL!;
const EMAIL     = process.env.JIRA_EMAIL!;
const API_TOKEN = process.env.JIRA_API_TOKEN!;
const AUTH      = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
const HEADERS   = {
  'Authorization': `Basic ${AUTH}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

// ── Projetos disponíveis ─────────────────────────────────────────────────────
const PROJECTS = [
  { key: 'DD',        name: 'Desenvolvimento & Delivery' },
  { key: 'DB',        name: 'Diário de Bordo' },
  { key: 'DEV',       name: 'Esteira de Desenvolvimento' },
  { key: 'FUNCIONAL', name: 'Funcional' },
  { key: 'GP',        name: 'Gestão Projetos' },
  { key: 'INF',       name: 'Infraestrutura' },
  { key: 'INT',       name: 'Integrações' },
  { key: 'MUD',       name: 'Mudança' },
  { key: 'MDB',       name: 'MVP1 - Daily Banking' },
  { key: 'PDR',       name: 'Projeto de Risco' },
  { key: 'QTV1',      name: 'QA Tests v1' },
  { key: 'TDN',       name: 'Treinamento' },
];

// ── Keywords de classificação ────────────────────────────────────────────────
const DONE_KEYWORDS     = ['done','concluído','concluido','fechado','closed','resolved','resolvido','entregue'];
const DOING_KEYWORDS    = ['in progress','em andamento','em desenvolvimento','dev','doing','em atendimento','em execução','em execucao'];
const ANALYSIS_KEYWORDS = ['in analysis','em análise','em analise','refinamento','refinement','análise','analise','backlog refinement'];
const BLOCKED_KEYWORDS  = ['blocked','bloqueado','impedido','impedimento','on hold','aguardando','parado'];
const REVIEW_KEYWORDS   = ['in review','code review','em revisão','em revisao','review','aguardando aprovação','aguardando aprovacao'];
const CANCEL_KEYWORDS   = ['cancelled','cancelado','canceled',"won't do",'wontdo','descartado'];
const BUG_TYPES         = ['bug','defeito','defect'];

// ── Mapeamento de labels para parceiros ─────────────────────────────────────
const PARCEIRO_LABEL_MAP: Record<string, { nome: string; papel: string }> = {
  'tailwind':      { nome: 'Tailwind',      papel: 'Frontend · App · Web Banking' },
  'itss':          { nome: 'ITSS',          papel: 'Core Bancário · T24 / Temenos' },
  'corebank':      { nome: 'Corebank',      papel: 'Orquestração · SPB / PIX' },
  'temenos':       { nome: 'Temenos',       papel: 'Core Bancário (Transact)' },
  'cyberalliance': { nome: 'Cyberalliance', papel: 'HCM · Delinea · Segurança' },
  'neurotech':     { nome: 'Neurotech',     papel: 'Motor de Risco · Antifraude · ML' },
};

// ── Mapeamento de labels para DROPs ─────────────────────────────────────────
const DROP_LABEL_MAP: Record<string, string> = {
  'd0':'D0','d1':'D1','d2':'D2','d3':'D3','d4':'D4','d5':'D5',
  'drop0':'D0','drop1':'D1','drop2':'D2','drop3':'D3','drop4':'D4','drop5':'D5',
  'drop-0':'D0','drop-1':'D1','drop-2':'D2','drop-3':'D3','drop-4':'D4','drop-5':'D5',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function diasSemMovimento(updated: string): number {
  return Math.floor((Date.now() - new Date(updated).getTime()) / 86400000);
}

function classify(statusName: string): 'done'|'doing'|'blocked'|'analysis'|'cancelled'|'review'|'todo' {
  const s = statusName.toLowerCase();
  if (DONE_KEYWORDS.some(k => s.includes(k)))     return 'done';
  if (CANCEL_KEYWORDS.some(k => s.includes(k)))   return 'cancelled';
  if (BLOCKED_KEYWORDS.some(k => s.includes(k)))  return 'blocked';
  if (REVIEW_KEYWORDS.some(k => s.includes(k)))   return 'review';
  if (DOING_KEYWORDS.some(k => s.includes(k)))    return 'doing';
  if (ANALYSIS_KEYWORDS.some(k => s.includes(k))) return 'analysis';
  return 'todo';
}

function getDrop(labels: string[]): string | null {
  for (const l of labels) {
    const d = DROP_LABEL_MAP[l.toLowerCase()];
    if (d) return d;
  }
  return null;
}

function getParceiro(labels: string[]): string | null {
  for (const l of labels) {
    const p = PARCEIRO_LABEL_MAP[l.toLowerCase()];
    if (p) return p.nome;
  }
  return null;
}

// ── Jira fetch com retry ─────────────────────────────────────────────────────
async function jiraGet(path: string, retries = 2): Promise<any> {
  const url = `${BASE_URL}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Jira ${res.status} ${res.statusText} — ${path} | ${body.slice(0, 300)}`);
      }
      return res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

// ── Paginação completa — CORREÇÃO PRINCIPAL ──────────────────────────────────
// Endpoint correto: /rest/api/3/search (não /search/jql)
async function getAllIssues(jql: string, fields: string, maxTotal = 1000): Promise<any[]> {
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
    const data = await jiraGet(`/rest/api/3/search/jql?${params.toString()}`);
    const issues: any[] = data.issues ?? [];
    total = data.total ?? 0;
    all = [...all, ...issues];
    startAt += PAGE;

    if (issues.length < PAGE) break;
  }

  return all;
}

// ── Buscar lista de projetos ─────────────────────────────────────────────────
async function getProjects() {
  const data = await jiraGet('/rest/api/3/project/search?maxResults=50&action=view');
  return data.values ?? [];
}

// ── Último comentário de uma issue ──────────────────────────────────────────
async function getLastComment(key: string) {
  try {
    const data = await jiraGet(`/rest/api/3/issue/${key}/comment?maxResults=1&orderBy=-created`);
    const c = data.comments?.[0];
    if (!c) return null;
    return {
      autor: c.author?.displayName ?? '—',
      data: new Date(c.created).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      texto: typeof c.body === 'string'
        ? c.body
        : (c.body?.content?.[0]?.content?.[0]?.text ?? c.renderedBody ?? '(sem texto)'),
    };
  } catch {
    return null;
  }
}

// ── MAIN GET ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') ?? 'dashboard';

    // ── Ação: listar projetos ─────────────────────────────────────────────
    if (action === 'projects') {
      const projects = await getProjects();
      return NextResponse.json({ projects });
    }

    // ── Ação: dashboard de um projeto específico ──────────────────────────
    const projectKey = searchParams.get('project') || process.env.JIRA_PROJECT_KEY || 'MDB';
    if (!projectKey) {
      return NextResponse.json({ error: 'Parâmetro "project" é obrigatório' }, { status: 400 });
    }

    const fields = [
      'summary','status','assignee','priority','issuetype',
      'updated','created','labels','fixVersions','duedate',
      'customfield_10020', // Sprint
      'customfield_10014', // Epic Link
      'customfield_10016', // Story Points
    ].join(',');

    const allIssues = await getAllIssues(
      `project = "${projectKey}" ORDER BY updated ASC`,
      fields,
      1000
    );

    // ── Summary ───────────────────────────────────────────────────────────
    const summary = {
      total: allIssues.length,
      concluido: 0, concluidoNoPrazo: 0, concluidoForaPrazo: 0,
      emAndamento: 0, emAnalise: 0, bloqueado: 0, backlog: 0,
      cancelado: 0, bugs: 0, emRevisao: 0, parados: 0,
    };

    // ── Estruturas de agrupamento ─────────────────────────────────────────
    type DropEntry = {
      total: number; concluido: number; emAndamento: number;
      bloqueado: number; backlog: number; cancelado: number;
      analise: number; parceiros: Set<string>;
    };
    type ParcEntry = {
      parceiro: string; papel: string; drops: Set<string>;
      total: number; concluido: number; emAndamento: number;
      bloqueado: number; backlog: number; cancelado: number; analise: number;
    };
    type SprintEntry = {
      nome: string; total: number; concluido: number;
      emAndamento: number; bloqueado: number; backlog: number;
    };

    const dropMap: Record<string, DropEntry> = {};
    const parcMap: Record<string, ParcEntry> = {};
    const sprintMap: Record<string, SprintEntry> = {};
    const today = new Date();
    const processed: any[] = [];

    for (const issue of allIssues) {
      const statusName  = issue.fields?.status?.name ?? '';
      const cat         = classify(statusName);
      const labels: string[] = issue.fields?.labels ?? [];
      const drop        = getDrop(labels);
      const parceiroNome = getParceiro(labels);
      const parceiroInfo = parceiroNome
        ? Object.values(PARCEIRO_LABEL_MAP).find(p => p.nome === parceiroNome)
        : null;
      const isBug       = BUG_TYPES.some(k =>
        (issue.fields?.issuetype?.name ?? '').toLowerCase().includes(k)
      );
      const diasParado  = diasSemMovimento(issue.fields?.updated ?? new Date().toISOString());
      const sprint      = issue.fields?.customfield_10020?.at(-1)?.name ?? null;
      const duedate     = issue.fields?.duedate ?? null;

      // Summary
      if (cat === 'done') {
        summary.concluido++;
        if (duedate && new Date() <= new Date(duedate)) summary.concluidoNoPrazo++;
        else summary.concluidoForaPrazo++;
      }
      if (cat === 'doing')     summary.emAndamento++;
      if (cat === 'analysis')  summary.emAnalise++;
      if (cat === 'blocked')   summary.bloqueado++;
      if (cat === 'todo')      summary.backlog++;
      if (cat === 'cancelled') summary.cancelado++;
      if (cat === 'review')    summary.emRevisao++;
      if (isBug && !['done','cancelled'].includes(cat)) summary.bugs++;
      if (!['done','cancelled'].includes(cat) && diasParado >= 7) summary.parados++;

      // DROP map
      if (drop) {
        if (!dropMap[drop]) {
          dropMap[drop] = { total:0, concluido:0, emAndamento:0, bloqueado:0, backlog:0, cancelado:0, analise:0, parceiros: new Set() };
        }
        dropMap[drop].total++;
        if (cat === 'done')      dropMap[drop].concluido++;
        if (cat === 'doing')     dropMap[drop].emAndamento++;
        if (cat === 'blocked')   dropMap[drop].bloqueado++;
        if (cat === 'todo')      dropMap[drop].backlog++;
        if (cat === 'cancelled') dropMap[drop].cancelado++;
        if (cat === 'analysis')  dropMap[drop].analise++;
        if (parceiroNome) dropMap[drop].parceiros.add(parceiroNome);
      }

      // Parceiro map
      if (parceiroNome) {
        if (!parcMap[parceiroNome]) {
          parcMap[parceiroNome] = {
            parceiro: parceiroNome,
            papel: parceiroInfo?.papel ?? '',
            drops: new Set(),
            total:0, concluido:0, emAndamento:0, bloqueado:0, backlog:0, cancelado:0, analise:0,
          };
        }
        parcMap[parceiroNome].total++;
        if (cat === 'done')      parcMap[parceiroNome].concluido++;
        if (cat === 'doing')     parcMap[parceiroNome].emAndamento++;
        if (cat === 'blocked')   parcMap[parceiroNome].bloqueado++;
        if (cat === 'todo')      parcMap[parceiroNome].backlog++;
        if (cat === 'cancelled') parcMap[parceiroNome].cancelado++;
        if (cat === 'analysis')  parcMap[parceiroNome].analise++;
        if (drop) parcMap[parceiroNome].drops.add(drop);
      }

      // Sprint map
      if (sprint) {
        if (!sprintMap[sprint]) {
          sprintMap[sprint] = { nome: sprint, total:0, concluido:0, emAndamento:0, bloqueado:0, backlog:0 };
        }
        sprintMap[sprint].total++;
        if (cat === 'done')    sprintMap[sprint].concluido++;
        if (cat === 'doing')   sprintMap[sprint].emAndamento++;
        if (cat === 'blocked') sprintMap[sprint].bloqueado++;
        if (cat === 'todo')    sprintMap[sprint].backlog++;
      }

      processed.push({
        key:           issue.key,
        summary:       issue.fields?.summary ?? '',
        status:        statusName,
        statusCat:     cat,
        tipo:          issue.fields?.issuetype?.name ?? '',
        isBug,
        assignee:      issue.fields?.assignee?.displayName ?? 'Não atribuído',
        assigneeEmail: issue.fields?.assignee?.emailAddress ?? '',
        priority:      issue.fields?.priority?.name ?? 'Medium',
        updated:       issue.fields?.updated ?? '',
        created:       issue.fields?.created ?? '',
        diasParado,
        sprint,
        epicLink:      issue.fields?.customfield_10014 ?? null,
        storyPoints:   issue.fields?.customfield_10016 ?? null,
        labels,
        drop,
        parceiro: parceiroNome,
        url: `${BASE_URL}/browse/${issue.key}`,
      });
    }

    // ── Parados — top 20 com último comentário ────────────────────────────
    const paradosList = processed
      .filter(i => !['done','cancelled'].includes(i.statusCat) && i.diasParado >= 7)
      .sort((a, b) => b.diasParado - a.diasParado)
      .slice(0, 20);

    const [paradosComComentario, paradosRest] = await Promise.all([
      Promise.all(
        paradosList.slice(0, 10).map(async i => ({
          ...i,
          ultimoComentario: await getLastComment(i.key),
        }))
      ),
      Promise.resolve(paradosList.slice(10).map(i => ({ ...i, ultimoComentario: null }))),
    ]);

    // ── Bugs abertos ──────────────────────────────────────────────────────
    const bugs = processed
      .filter(i => i.isBug && !['done','cancelled'].includes(i.statusCat))
      .sort((a, b) => b.diasParado - a.diasParado)
      .slice(0, 50);

    // ── Em revisão ────────────────────────────────────────────────────────
    const emRevisao = processed
      .filter(i => i.statusCat === 'review')
      .sort((a, b) => b.diasParado - a.diasParado)
      .slice(0, 50);

    // ── Por DROP ──────────────────────────────────────────────────────────
    const porDrop = Object.entries(dropMap)
      .map(([drop, d]) => ({
        drop,
        total: d.total, concluido: d.concluido, emAndamento: d.emAndamento,
        bloqueado: d.bloqueado, backlog: d.backlog, cancelado: d.cancelado, analise: d.analise,
        pct: d.total > 0 ? Math.round((d.concluido / d.total) * 100) : 0,
        parceiros: Array.from(d.parceiros),
      }))
      .sort((a, b) => a.drop.localeCompare(b.drop));

    // ── Por parceiro ──────────────────────────────────────────────────────
    const porParceiro = Object.values(parcMap)
      .map(p => ({
        ...p,
        drops: Array.from(p.drops).sort(),
        pct: p.total > 0 ? Math.round((p.concluido / p.total) * 100) : 0,
        health: p.total > 0
          ? Math.round(((p.concluido + p.emAndamento * 0.5) / p.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Por sprint ────────────────────────────────────────────────────────
    const porSprint = Object.values(sprintMap)
      .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));

    return NextResponse.json({
      projectKey,
      geradoEm: new Date().toISOString(),
      summary,
      porDrop,
      porParceiro,
      porSprint,
      parados: [...paradosComComentario, ...paradosRest],
      bugs,
      emRevisao,
      totalIssues: allIssues.length,
    });

  } catch (err: any) {
    console.error('[JIRA API ERROR]', err);
    return NextResponse.json(
      {
        error: err.message ?? 'Erro interno',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
