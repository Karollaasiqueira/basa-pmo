import { NextRequest, NextResponse } from 'next/server';

const BASE_URL  = process.env.JIRA_BASE_URL ?? '';
const EMAIL     = process.env.JIRA_EMAIL ?? '';
const API_TOKEN = process.env.JIRA_API_TOKEN ?? '';

function authHeader() {
  return 'Basic ' + Buffer.from(EMAIL + ':' + API_TOKEN).toString('base64');
}

async function jiraPost(path: string, body: object) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Jira ' + res.status + ': ' + text.slice(0, 200));
  return JSON.parse(text);
}

async function jiraGet(path: string) {
  const res = await fetch(BASE_URL + path, {
    method: 'GET',
    headers: {
      'Authorization': authHeader(),
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Jira ' + res.status + ': ' + text.slice(0, 200));
  return JSON.parse(text);
}

const DONE     = ['done','concluido','concluído','fechado','closed','resolved','resolvido','entregue'];
const DOING    = ['in progress','em andamento','em desenvolvimento','doing','em execucao','em execução'];
const ANALYSIS = ['in analysis','em analise','em análise','refinamento','refinement'];
const BLOCKED  = ['blocked','bloqueado','impedido','on hold','aguardando'];
const REVIEW   = ['in review','code review','em revisao','em revisão','review'];
const CANCEL   = ['cancelled','cancelado','canceled','descartado'];

function classify(s: string) {
  const n = s.toLowerCase();
  if (DONE.some(k => n.includes(k)))     return 'done';
  if (CANCEL.some(k => n.includes(k)))   return 'cancelled';
  if (BLOCKED.some(k => n.includes(k)))  return 'blocked';
  if (REVIEW.some(k => n.includes(k)))   return 'review';
  if (DOING.some(k => n.includes(k)))    return 'doing';
  if (ANALYSIS.some(k => n.includes(k))) return 'analysis';
  return 'todo';
}

const PARCEIROS: Record<string, { nome: string; papel: string }> = {
  'tailwind':      { nome: 'Tailwind',      papel: 'Frontend / App / Web Banking' },
  'itss':          { nome: 'ITSS',          papel: 'Core Bancario / Temenos' },
  'corebank':      { nome: 'Corebank',      papel: 'Orquestracao / SPB / PIX' },
  'temenos':       { nome: 'Temenos',       papel: 'Core Bancario (Transact)' },
  'cyberalliance': { nome: 'Cyberalliance', papel: 'Seguranca / HCM' },
  'neurotech':     { nome: 'Neurotech',     papel: 'Antifraude / ML' },
};

const DROPS: Record<string, string> = {
  'd0':'D0','d1':'D1','d2':'D2','d3':'D3','d4':'D4','d5':'D5',
  'drop0':'D0','drop1':'D1','drop2':'D2','drop3':'D3','drop4':'D4','drop5':'D5',
  'drop-0':'D0','drop-1':'D1','drop-2':'D2','drop-3':'D3','drop-4':'D4','drop-5':'D5',
};

function dias(updated: string) {
  return Math.floor((Date.now() - new Date(updated).getTime()) / 86400000);
}

async function fetchAllIssues(project: string) {
  const fields = ['summary','status','assignee','priority','issuetype','updated','created','labels','duedate','customfield_10020'];
  const jql = 'project = ' + project + ' ORDER BY updated DESC';
  const all: any[] = [];
  let token: string | undefined;

  do {
    const body: any = { jql, fields, maxResults: 100 };
    if (token) body.nextPageToken = token;
    const data = await jiraPost('/rest/api/3/search/jql', body);
    const issues: any[] = data.issues ?? [];
    all.push(...issues);
    token = data.isLast === false ? data.nextPageToken : undefined;
  } while (token && all.length < 2000);

  return all;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') ?? 'dashboard';

    // Teste de autenticacao
    if (action === 'me') {
      const data = await jiraGet('/rest/api/3/myself');
      return NextResponse.json({ ok: true, user: data.displayName, email: data.emailAddress });
    }

    const project = searchParams.get('project') ?? process.env.JIRA_PROJECT_KEY ?? 'MDB';
    const issues = await fetchAllIssues(project);

    const s = { total:issues.length, concluido:0, concluidoNoPrazo:0, concluidoForaPrazo:0, emAndamento:0, emAnalise:0, bloqueado:0, backlog:0, cancelado:0, bugs:0, emRevisao:0, parados:0 };
    const dropMap: Record<string, any> = {};
    const parcMap: Record<string, any> = {};
    const sprintMap: Record<string, any> = {};
    const processed: any[] = [];

    for (const issue of issues) {
      const status = issue.fields?.status?.name ?? '';
      const cat = classify(status);
      const labels: string[] = issue.fields?.labels ?? [];
      const drop = labels.map(l => DROPS[l.toLowerCase()]).find(Boolean) ?? null;
      const parceiroKey = labels.find(l => PARCEIROS[l.toLowerCase()]);
      const parceiro = parceiroKey ? PARCEIROS[parceiroKey.toLowerCase()] : null;
      const isBug = (issue.fields?.issuetype?.name ?? '').toLowerCase().includes('bug');
      const d = dias(issue.fields?.updated ?? new Date().toISOString());
      const sprint = issue.fields?.customfield_10020?.at?.(-1)?.name ?? null;
      const due = issue.fields?.duedate ?? null;

      if (cat === 'done') { s.concluido++; if (due && new Date() <= new Date(due)) s.concluidoNoPrazo++; else s.concluidoForaPrazo++; }
      if (cat === 'doing')     s.emAndamento++;
      if (cat === 'analysis')  s.emAnalise++;
      if (cat === 'blocked')   s.bloqueado++;
      if (cat === 'todo')      s.backlog++;
      if (cat === 'cancelled') s.cancelado++;
      if (cat === 'review')    s.emRevisao++;
      if (isBug && !['done','cancelled'].includes(cat)) s.bugs++;
      if (!['done','cancelled'].includes(cat) && d >= 7) s.parados++;

      if (drop) {
        if (!dropMap[drop]) dropMap[drop] = { total:0,concluido:0,emAndamento:0,bloqueado:0,backlog:0,cancelado:0,analise:0,parceiros:new Set() };
        dropMap[drop].total++;
        if (cat==='done')      dropMap[drop].concluido++;
        if (cat==='doing')     dropMap[drop].emAndamento++;
        if (cat==='blocked')   dropMap[drop].bloqueado++;
        if (cat==='todo')      dropMap[drop].backlog++;
        if (cat==='cancelled') dropMap[drop].cancelado++;
        if (cat==='analysis')  dropMap[drop].analise++;
        if (parceiro) dropMap[drop].parceiros.add(parceiro.nome);
      }

      if (parceiro) {
        if (!parcMap[parceiro.nome]) parcMap[parceiro.nome] = { parceiro:parceiro.nome, papel:parceiro.papel, drops:new Set(), total:0,concluido:0,emAndamento:0,bloqueado:0,backlog:0,cancelado:0,analise:0 };
        parcMap[parceiro.nome].total++;
        if (cat==='done')      parcMap[parceiro.nome].concluido++;
        if (cat==='doing')     parcMap[parceiro.nome].emAndamento++;
        if (cat==='blocked')   parcMap[parceiro.nome].bloqueado++;
        if (cat==='todo')      parcMap[parceiro.nome].backlog++;
        if (cat==='cancelled') parcMap[parceiro.nome].cancelado++;
        if (cat==='analysis')  parcMap[parceiro.nome].analise++;
        if (drop) parcMap[parceiro.nome].drops.add(drop);
      }

      if (sprint) {
        if (!sprintMap[sprint]) sprintMap[sprint] = { nome:sprint,total:0,concluido:0,emAndamento:0,bloqueado:0,backlog:0 };
        sprintMap[sprint].total++;
        if (cat==='done')    sprintMap[sprint].concluido++;
        if (cat==='doing')   sprintMap[sprint].emAndamento++;
        if (cat==='blocked') sprintMap[sprint].bloqueado++;
        if (cat==='todo')    sprintMap[sprint].backlog++;
      }

      processed.push({
        key: issue.key, summary: issue.fields?.summary ?? '',
        status, statusCat: cat, tipo: issue.fields?.issuetype?.name ?? '',
        isBug, assignee: issue.fields?.assignee?.displayName ?? 'Nao atribuido',
        assigneeEmail: issue.fields?.assignee?.emailAddress ?? '',
        priority: issue.fields?.priority?.name ?? 'Medium',
        updated: issue.fields?.updated ?? '', created: issue.fields?.created ?? '',
        diasParado: d, sprint, labels, drop, parceiro: parceiro?.nome ?? null,
        url: BASE_URL + '/browse/' + issue.key,
        ultimoComentario: null,
      });
    }

    const parados = processed.filter(i => !['done','cancelled'].includes(i.statusCat) && i.diasParado >= 7).sort((a,b) => b.diasParado - a.diasParado).slice(0,20);
    const bugs = processed.filter(i => i.isBug && !['done','cancelled'].includes(i.statusCat)).sort((a,b) => b.diasParado - a.diasParado).slice(0,50);
    const emRevisao = processed.filter(i => i.statusCat === 'review').slice(0,50);

    const porDrop = Object.entries(dropMap).map(([drop,d]:any) => ({
      drop, total:d.total, concluido:d.concluido, emAndamento:d.emAndamento,
      bloqueado:d.bloqueado, backlog:d.backlog, cancelado:d.cancelado, analise:d.analise,
      pct: d.total > 0 ? Math.round((d.concluido/d.total)*100) : 0,
      parceiros: Array.from(d.parceiros),
    })).sort((a,b) => a.drop.localeCompare(b.drop));

    const porParceiro = Object.values(parcMap).map((p:any) => ({
      ...p, drops: Array.from(p.drops).sort(),
      pct: p.total > 0 ? Math.round((p.concluido/p.total)*100) : 0,
      health: p.total > 0 ? Math.round(((p.concluido + p.emAndamento*0.5)/p.total)*100) : 0,
    })).sort((a:any,b:any) => b.total - a.total);

    const porSprint = Object.values(sprintMap).sort((a:any,b:any) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));

    return NextResponse.json({ projectKey:project, geradoEm:new Date().toISOString(), summary:s, porDrop, porParceiro, porSprint, parados, bugs, emRevisao, totalIssues:issues.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
