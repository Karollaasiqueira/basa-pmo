'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── DADOS ───────────────────────────────────────────────────────────────────

const ALL_PROJECTS = [
  { name: 'MVP1 - Daily Banking', pend: 25, ref: 3,  dev: 45, done: 19, bugs: 8, riscos: 5,  score: 52 },
  { name: 'Mudança',              pend: 15, ref: 12, dev: 35, done: 17, bugs: 2, riscos: 2,  score: 78 },
  { name: 'Projeto de Risco',     pend: 18, ref: 8,  dev: 28, done: 14, bugs: 3, riscos: 13, score: 58 },
  { name: 'Esteira de Dev',       pend: 12, ref: 18, dev: 40, done: 32, bugs: 1, riscos: 1,  score: 88 },
  { name: 'Gestão Projetos',      pend: 8,  ref: 5,  dev: 6,  done: 15, bugs: 0, riscos: 0,  score: 92 },
  { name: 'Infraestrutura',       pend: 14, ref: 10, dev: 38, done: 11, bugs: 2, riscos: 2,  score: 72 },
  { name: 'Integrações',          pend: 13, ref: 9,  dev: 30, done: 13, bugs: 1, riscos: 1,  score: 75 },
];

type ChangeType = 'status' | 'fornecedor' | 'criado' | 'risco' | 'bugfix';

interface ChangeEvent {
  id: number;
  type: ChangeType;
  projeto: string;
  descricao: string;
  detalhe?: string;
  usuario: string;
  tempo: string;       // ex: "há 5 min"
  timestamp: number;   // para ordenação
  lido: boolean;
  urgente?: boolean;
  paradoDias: number;           // quantos dias sem movimentação
  ultimoComentario: {
    autor: string;
    data: string;               // ex: "03/04/2026 às 14:22"
    texto: string;
  } | null;
}

const INITIAL_CHANGES: ChangeEvent[] = [
  {
    id: 1,
    type: 'status',
    projeto: 'MVP1 - Daily Banking',
    descricao: 'Card #1042 mudou de status',
    detalhe: 'Dev → Bloqueado',
    usuario: 'Carlos M.',
    tempo: 'há 3 min',
    timestamp: Date.now() - 3 * 60000,
    lido: false,
    urgente: true,
    paradoDias: 12,
    ultimoComentario: { autor: 'Carlos M.', data: '25/03/2026 às 09:10', texto: 'Aguardando retorno do fornecedor para desbloquear.' },
  },
  {
    id: 2,
    type: 'fornecedor',
    projeto: 'Infraestrutura',
    descricao: 'Fornecedor substituído',
    detalhe: 'AWS → Azure (contrato encerrado)',
    usuario: 'Ana P.',
    tempo: 'há 17 min',
    timestamp: Date.now() - 17 * 60000,
    lido: false,
    urgente: true,
    paradoDias: 8,
    ultimoComentario: { autor: 'Ana P.', data: '29/03/2026 às 16:45', texto: 'Contrato rescindido, iniciando migração.' },
  },
  {
    id: 3,
    type: 'criado',
    projeto: 'Esteira de Dev',
    descricao: 'Novo card criado',
    detalhe: '#1201 — Pipeline CI/CD (Refinamento)',
    usuario: 'Rodrigo S.',
    tempo: 'há 28 min',
    timestamp: Date.now() - 28 * 60000,
    lido: false,
    paradoDias: 0,
    ultimoComentario: null,
  },
  {
    id: 4,
    type: 'risco',
    projeto: 'Projeto de Risco',
    descricao: 'Risco elevado para crítico',
    detalhe: 'Prazo regulatório: 10 dias restantes',
    usuario: 'Carolina S.',
    tempo: 'há 41 min',
    timestamp: Date.now() - 41 * 60000,
    lido: false,
    urgente: true,
    paradoDias: 21,
    ultimoComentario: { autor: 'Felipe R.', data: '16/03/2026 às 11:00', texto: 'Nenhuma ação tomada até o momento.' },
  },
  {
    id: 5,
    type: 'status',
    projeto: 'Integrações',
    descricao: 'Card #0987 mudou de status',
    detalhe: 'Pendente → Em Refinamento',
    usuario: 'Beatriz L.',
    tempo: 'há 1h',
    timestamp: Date.now() - 60 * 60000,
    lido: true,
    paradoDias: 3,
    ultimoComentario: { autor: 'Beatriz L.', data: '03/04/2026 às 08:30', texto: 'Iniciado refinamento com o PO.' },
  },
  {
    id: 6,
    type: 'bugfix',
    projeto: 'Mudança',
    descricao: 'Bug #312 resolvido',
    detalhe: 'Falha no fluxo de aprovação corrigida',
    usuario: 'Lucas F.',
    tempo: 'há 2h',
    timestamp: Date.now() - 120 * 60000,
    lido: true,
    paradoDias: 1,
    ultimoComentario: { autor: 'Lucas F.', data: '05/04/2026 às 17:55', texto: 'Deploy realizado em produção com sucesso.' },
  },
  {
    id: 7,
    type: 'criado',
    projeto: 'Gestão Projetos',
    descricao: 'Novo card criado',
    detalhe: '#0055 — Revisão de roadmap Q2',
    usuario: 'Mariana T.',
    tempo: 'há 3h',
    timestamp: Date.now() - 180 * 60000,
    lido: true,
    paradoDias: 0,
    ultimoComentario: null,
  },
  {
    id: 8,
    type: 'fornecedor',
    projeto: 'MVP1 - Daily Banking',
    descricao: 'Fornecedor adicionado',
    detalhe: 'Stripe integrado ao escopo de pagamentos',
    usuario: 'Pedro A.',
    tempo: 'há 5h',
    timestamp: Date.now() - 300 * 60000,
    lido: true,
    paradoDias: 5,
    ultimoComentario: { autor: 'Pedro A.', data: '01/04/2026 às 14:20', texto: 'Contrato assinado, integração em andamento.' },
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function scoreClass(s: number) {
  if (s >= 80) return 'score-ex';
  if (s >= 60) return 'score-gd';
  return 'score-bd';
}
function shortName(n: string) { return n.length > 13 ? n.slice(0, 13) + '…' : n; }
function scoreColor(s: number) {
  if (s >= 80) return '#1A9E75';
  if (s >= 60) return '#C9A84C';
  return '#D85A30';
}

type Project = typeof ALL_PROJECTS[0];

const CHANGE_META: Record<ChangeType, { label: string; color: string; bg: string; icon: string }> = {
  status:     { label: 'Status',     color: '#185FA5', bg: '#E6F1FB', icon: '⇄' },
  fornecedor: { label: 'Fornecedor', color: '#7B3FA5', bg: '#F2E8FB', icon: '🔄' },
  criado:     { label: 'Criado',     color: '#1A9E75', bg: '#EAF3DE', icon: '+' },
  risco:      { label: 'Risco',      color: '#D85A30', bg: '#FCEBEB', icon: '⚠' },
  bugfix:     { label: 'Bug',        color: '#C9A84C', bg: '#FAEEDA', icon: '✓' },
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function Dashboard() {
  const [dateStart, setDateStart]     = useState('2026-03-01');
  const [dateEnd, setDateEnd]         = useState('2026-03-30');
  const [filterScore, setFilterScore] = useState('all');
  const [filtered, setFiltered]       = useState<Project[]>(ALL_PROJECTS);
  const [applied, setApplied]         = useState({ ds: '2026-03-01', de: '2026-03-30', count: ALL_PROJECTS.length });
  const [activePeriod, setActivePeriod] = useState('mes');

  // Feed de mudanças
  const [changes, setChanges] = useState<ChangeEvent[]>(INITIAL_CHANGES);
  const [feedFilter, setFeedFilter] = useState<'todos' | 'nao_lidos' | 'urgentes'>('todos');
  const [feedOpen, setFeedOpen] = useState(true);

  const naoLidos = changes.filter(c => !c.lido).length;

  function marcarLido(id: number) {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, lido: true } : c));
  }
  function marcarTodosLidos() {
    setChanges(prev => prev.map(c => ({ ...c, lido: true })));
  }

  // Simula chegada de novo evento após 8s
  useEffect(() => {
    const t = setTimeout(() => {
      setChanges(prev => [{
        id: 99,
        type: 'status',
        projeto: 'Esteira de Dev',
        descricao: 'Card #1205 mudou de status',
        detalhe: 'Refinamento → Dev',
        usuario: 'Rodrigo S.',
        tempo: 'agora',
        timestamp: Date.now(),
        lido: false,
        urgente: false,
        paradoDias: 0,
        ultimoComentario: null,
      }, ...prev]);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  function applyFilter() {
    const f =
      filterScore === 'excellent' ? ALL_PROJECTS.filter(p => p.score >= 80) :
      filterScore === 'good'      ? ALL_PROJECTS.filter(p => p.score >= 60 && p.score < 80) :
      filterScore === 'poor'      ? ALL_PROJECTS.filter(p => p.score < 60) :
      ALL_PROJECTS;
    setFiltered(f);
    setApplied({ ds: dateStart, de: dateEnd, count: f.length });
  }

  const totalCards  = filtered.reduce((s, p) => s + p.pend + p.ref + p.dev + p.done, 0);
  const totalBugs   = filtered.reduce((s, p) => s + p.bugs, 0);
  const avgScore    = Math.round(filtered.reduce((s, p) => s + p.score, 0) / filtered.length);
  const totalRiscos = filtered.reduce((s, p) => s + p.riscos, 0);

  const feedItems = changes.filter(c => {
    if (feedFilter === 'nao_lidos') return !c.lido;
    if (feedFilter === 'urgentes')  return c.urgente;
    return true;
  });

  const barData = {
    labels: filtered.map(p => shortName(p.name)),
    datasets: [
      { label: 'Pendente',    data: filtered.map(p => p.pend),  backgroundColor: '#E24B4A', borderRadius: 3 },
      { label: 'Refinamento', data: filtered.map(p => p.ref),   backgroundColor: '#EF9F27', borderRadius: 3 },
      { label: 'Dev',         data: filtered.map(p => p.dev),   backgroundColor: '#378ADD', borderRadius: 3 },
      { label: 'Done',        data: filtered.map(p => p.done),  backgroundColor: '#1D9E75', borderRadius: 3 },
    ],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false, backgroundColor: '#0B1F3A', titleColor: '#fff', bodyColor: 'rgba(255,255,255,.75)', cornerRadius: 8, padding: 10 } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#8898AA', maxRotation: 30 } },
      y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 }, color: '#8898AA' } },
    },
  } as const;

  const hbarData = {
    labels: filtered.map(p => shortName(p.name)),
    datasets: [{ label: 'Score', data: filtered.map(p => p.score), backgroundColor: filtered.map(p => scoreColor(p.score)), borderRadius: 4, borderSkipped: false as const }],
  };
  const hbarOptions = {
    indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0B1F3A', titleColor: '#fff', bodyColor: 'rgba(255,255,255,.75)', cornerRadius: 8, padding: 8 } },
    scales: {
      x: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 }, color: '#8898AA' } },
      y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#8898AA' } },
    },
  } as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #0B1F3A; --navy3: #1A3357;
          --gold: #C9A84C; --gold2: #E2C47A;
          --slate: #6B7FA3; --slate2: #A8B8D0; --slate3: #D6DFE8;
          --surf: #F7F8FA; --surf2: #EFF2F6; --white: #FFFFFF;
          --tx: #0B1F3A; --tx2: #4A5C75; --tx3: #8898AA;
          --ok: #1A9E75; --warn: #C9A84C; --bad: #D85A30; --inf: #185FA5;
          --r: 10px; --r2: 14px;
        }
        html, body { height: 100%; font-family: 'DM Sans', sans-serif; background: var(--surf); color: var(--tx); }
        .layout { display: flex; height: 100vh; overflow: hidden; }

        /* ── SIDEBAR ── */
        .sidebar { width: 240px; background: var(--navy); display: flex; flex-direction: column; flex-shrink: 0; position: relative; }
        .sidebar::after { content: ''; position: absolute; top: 0; right: 0; width: 1px; height: 100%; background: rgba(201,168,76,.15); }
        .sl { padding: 28px 24px 20px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .sl-mark { display: flex; align-items: center; gap: 10px; }
        .sl-dot { width: 32px; height: 32px; background: var(--gold); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sl-brand { font-size: 14px; font-weight: 600; color: #fff; }
        .sl-brand span { display: block; font-size: 10px; font-weight: 400; color: var(--slate2); letter-spacing: .9px; text-transform: uppercase; margin-top: 1px; }
        .ss { padding: 20px 12px 6px; font-size: 10px; font-weight: 500; color: var(--slate); letter-spacing: 1.1px; text-transform: uppercase; }
        .si { display: flex; align-items: center; gap: 10px; padding: 9px 12px; margin: 2px 8px; border-radius: 8px; cursor: pointer; color: var(--slate2); font-size: 13px; font-weight: 400; border: none; background: transparent; font-family: 'DM Sans', sans-serif; width: calc(100% - 16px); text-align: left; }
        .si:hover { background: rgba(255,255,255,.06); color: #fff; }
        .si.active { background: rgba(201,168,76,.12); color: var(--gold2); }
        .sb2 { margin-left: auto; background: var(--gold); color: var(--navy); font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
        .sb2.danger { background: var(--bad); color: #fff; }
        /* badge de novidades piscante */
        .sb2.pulse { background: var(--bad); color: #fff; animation: pulseB 1.4s ease-in-out infinite; }
        @keyframes pulseB { 0%,100% { box-shadow: 0 0 0 0 rgba(216,90,48,.5); } 50% { box-shadow: 0 0 0 5px rgba(216,90,48,0); } }
        .sf { margin-top: auto; border-top: 1px solid rgba(255,255,255,.07); padding: 14px 8px; }
        .uc { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
        .uc:hover { background: rgba(255,255,255,.05); }
        .uav { width: 34px; height: 34px; border-radius: 50%; background: var(--inf); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; flex-shrink: 0; }
        .un { font-size: 13px; font-weight: 500; color: #fff; }
        .ur { font-size: 11px; color: var(--slate); margin-top: 1px; }

        /* ── MAIN ── */
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--slate3); padding: 0 28px; display: flex; align-items: center; gap: 10px; height: 62px; flex-shrink: 0; }
        .tb-title { font-family: 'DM Serif Display', serif; font-size: 19px; color: var(--navy); flex: 1; }
        .tb-title span { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 400; color: var(--tx3); display: block; margin-top: 1px; }
        .chip { padding: 5px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 0.5px solid var(--slate3); color: var(--tx2); background: transparent; }
        .chip.active { background: var(--navy); color: #fff; border-color: var(--navy); }
        .divider { width: 1px; height: 28px; background: var(--slate3); margin: 0 4px; }
        .ib { width: 34px; height: 34px; border-radius: 8px; border: 0.5px solid var(--slate3); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--tx2); position: relative; background: transparent; }
        .ib.nd::after { content: ''; position: absolute; top: 6px; right: 7px; width: 7px; height: 7px; background: var(--bad); border-radius: 50%; border: 1.5px solid #fff; animation: pulseB 1.4s ease-in-out infinite; }
        .notif-count { position: absolute; top: -4px; right: -4px; background: var(--bad); color: #fff; font-size: 9px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #fff; padding: 0 3px; animation: pulseB 1.4s ease-in-out infinite; }

        /* ── BODY SPLIT ── */
        .body-split { flex: 1; display: flex; overflow: hidden; }
        .content { flex: 1; overflow-y: auto; padding: 22px 26px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }

        /* ── FILTERS ── */
        .fcard { background: var(--white); border: 0.5px solid var(--slate3); border-radius: var(--r2); padding: 16px 20px; border-left: 3px solid var(--gold); border-top-left-radius: 0; border-bottom-left-radius: 0; }
        .fgrid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; align-items: end; }
        .flabel { font-size: 11px; font-weight: 500; color: var(--tx3); letter-spacing: .6px; text-transform: uppercase; margin-bottom: 6px; }
        .finput { width: 100%; border: 0.5px solid var(--slate3); padding: 7px 12px; border-radius: 8px; font-size: 13px; color: var(--tx); background: var(--surf); font-family: 'DM Sans', sans-serif; outline: none; }
        .finput:focus { border-color: var(--gold); }
        .fmeta { font-size: 12px; color: var(--tx3); margin-top: 10px; }
        .fmeta strong { color: var(--tx2); font-weight: 500; }
        .fbtn { background: var(--navy); color: #fff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
        .fbtn:hover { background: var(--navy3); }

        /* ── KPIs ── */
        .krow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .kcard { background: var(--white); border: 0.5px solid var(--slate3); border-radius: var(--r2); padding: 16px 18px; position: relative; overflow: hidden; }
        .kcard::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .k1::before { background: #185FA5; } .k2::before { background: #D85A30; } .k3::before { background: #C9A84C; } .k4::before { background: #1A9E75; }
        .klabel { font-size: 10px; font-weight: 500; color: var(--tx3); letter-spacing: .8px; text-transform: uppercase; margin-bottom: 6px; }
        .kval { font-size: 26px; font-weight: 300; color: var(--navy); letter-spacing: -.5px; line-height: 1; }
        .kval b { font-weight: 600; }
        .kdelta { display: inline-flex; align-items: center; font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 4px; margin-top: 8px; }
        .up { background: #EAF3DE; color: #3B6D11; } .dn { background: #FCEBEB; color: #A32D2D; } .neu { background: #FAEEDA; color: #854F0B; }

        /* ── CHARTS ── */
        .crow { display: grid; grid-template-columns: 1.55fr 1fr; gap: 14px; }
        .card { background: var(--white); border: 0.5px solid var(--slate3); border-radius: var(--r2); padding: 18px 20px; }
        .ch { display: flex; align-items: flex-start; margin-bottom: 14px; }
        .ct { font-size: 14px; font-weight: 500; color: var(--navy); }
        .cs { font-size: 11px; color: var(--tx3); margin-top: 2px; }
        .lgrow { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
        .lgi { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--tx2); }
        .lgd { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

        /* ── TABLE ── */
        .tcard { background: var(--white); border: 0.5px solid var(--slate3); border-radius: var(--r2); overflow: hidden; }
        .thead2 { padding: 14px 20px; border-bottom: 0.5px solid var(--slate3); display: flex; align-items: center; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { font-size: 10px; font-weight: 500; letter-spacing: .8px; text-transform: uppercase; color: var(--tx3); padding: 9px 14px; text-align: left; border-bottom: 0.5px solid var(--slate3); white-space: nowrap; }
        th.c { text-align: center; }
        tbody tr { border-bottom: 0.5px solid var(--surf2); transition: background .1s; }
        tbody tr:hover { background: var(--surf); }
        tbody tr:last-child { border-bottom: none; }
        td { padding: 9px 14px; color: var(--tx); vertical-align: middle; }
        td.c { text-align: center; }
        .pname { font-weight: 500; font-size: 13px; color: var(--navy); }
        .pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; min-width: 28px; }
        .p-pend { background: #FCEBEB; color: #A32D2D; }
        .p-ref  { background: #FAEEDA; color: #854F0B; }
        .p-dev  { background: #E6F1FB; color: #0C447C; }
        .p-done { background: #EAF3DE; color: #3B6D11; }
        .p-ok   { background: #EAF3DE; color: #3B6D11; }
        .p-bad  { background: #FCEBEB; color: #A32D2D; }
        .score-circle { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; margin: 0 auto; }
        .score-ex { background: #1A9E75; } .score-gd { background: #C9A84C; } .score-bd { background: #D85A30; }

        /* ══════════════════════════════════════════
           FEED DE MUDANÇAS — PAINEL LATERAL DIREITO
        ══════════════════════════════════════════ */
        .feed-panel {
          width: 320px;
          flex-shrink: 0;
          background: var(--white);
          border-left: 1px solid var(--slate3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: width .25s ease;
        }
        .feed-panel.collapsed { width: 0; overflow: hidden; }

        .feed-header {
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--slate3);
          flex-shrink: 0;
          background: var(--white);
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .feed-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .feed-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--navy);
          flex: 1;
        }
        .feed-unread {
          background: var(--bad);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          animation: pulseB 1.4s ease-in-out infinite;
        }
        .feed-clear {
          font-size: 11px;
          color: var(--inf);
          cursor: pointer;
          background: none;
          border: none;
          font-family: 'DM Sans', sans-serif;
          padding: 2px 4px;
        }
        .feed-clear:hover { text-decoration: underline; }
        .feed-tabs {
          display: flex;
          gap: 4px;
        }
        .feed-tab {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          border: 0.5px solid var(--slate3);
          color: var(--tx3);
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          transition: all .15s;
        }
        .feed-tab.active {
          background: var(--navy);
          color: #fff;
          border-color: var(--navy);
        }

        .feed-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }
        .feed-body::-webkit-scrollbar { width: 4px; }
        .feed-body::-webkit-scrollbar-track { background: transparent; }
        .feed-body::-webkit-scrollbar-thumb { background: var(--slate3); border-radius: 2px; }

        /* ITEM DO FEED */
        .feed-item {
          display: flex;
          gap: 10px;
          padding: 11px 16px;
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: background .12s, border-color .12s;
          position: relative;
          animation: fadeSlide .35s ease;
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .feed-item:hover { background: var(--surf); }
        .feed-item.unread {
          background: #F5F8FF;
          border-left-color: var(--inf);
        }
        .feed-item.unread.urgente {
          background: #FFF6F4;
          border-left-color: var(--bad);
        }
        .feed-item.unread.urgente .fi-type { animation: pulseB 1.4s ease-in-out infinite; }

        .fi-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .fi-body { flex: 1; min-width: 0; }
        .fi-top { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 2px; }
        .fi-type {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: .5px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .fi-urgente {
          font-size: 9px;
          font-weight: 700;
          color: var(--bad);
          background: #FCEBEB;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: .4px;
          flex-shrink: 0;
        }
        .fi-desc {
          font-size: 12px;
          font-weight: 500;
          color: var(--navy);
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fi-projeto {
          font-size: 11px;
          color: var(--tx3);
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fi-detalhe {
          font-size: 11.5px;
          color: var(--tx2);
          background: var(--surf2);
          padding: 3px 8px;
          border-radius: 5px;
          margin: 4px 0;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fi-meta {
          font-size: 10px;
          color: var(--tx3);
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .fi-dot { color: var(--slate3); }
        .fi-unread-dot {
          width: 7px;
          height: 7px;
          background: var(--inf);
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 3px;
        }
        .fi-unread-dot.urgente { background: var(--bad); }

        /* ── PARADO + COMENTÁRIO ── */
        .fi-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .fi-parado {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 5px;
          white-space: nowrap;
        }
        .fi-parado.ok   { background: #EAF3DE; color: #3B6D11; }
        .fi-parado.warn { background: #FAEEDA; color: #854F0B; }
        .fi-parado.crit { background: #FCEBEB; color: #A32D2D; animation: pulseB 1.8s ease-in-out infinite; }
        .fi-comentario {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--tx3);
          padding: 2px 7px;
          background: var(--surf2);
          border-radius: 5px;
          white-space: nowrap;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: default;
        }
        .fi-comentario span.autor { color: var(--tx2); font-weight: 500; }
        .fi-sem-comentario {
          font-size: 10px;
          color: var(--slate);
          font-style: italic;
          padding: 2px 0;
        }
        .feed-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--tx3);
          font-size: 13px;
        }
        .feed-empty svg { display: block; margin: 0 auto 10px; opacity: .35; }

        /* toggle feed button */
        .feed-toggle {
          position: fixed;
          right: feedOpen ? 332px : 12px;
          bottom: 24px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--navy);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,.2);
          z-index: 10;
          font-size: 15px;
        }
      `}</style>

      <div className="layout">

        {/* ── SIDEBAR ─────────────────────────────── */}
        <div className="sidebar">
          <div className="sl">
            <div className="sl-mark">
              <div className="sl-dot">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L7 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="sl-brand">DeskCorp PMO<span>Risk Management</span></div>
            </div>
          </div>

          <div className="ss">Principal</div>
          <button className="si active">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            Visão Geral
          </button>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L10.5 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H5.5L8 1Z"/></svg>
            Portfólio
            <span className="sb2">7</span>
          </button>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l3 2" strokeLinecap="round"/></svg>
            Cronograma
          </button>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12L6 8L9 11L14 4" strokeLinecap="round"/></svg>
            Desempenho
          </button>

          <div className="ss">Gestão</div>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-5 5-5s5 2 5 5"/></svg>
            Equipes
          </button>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="2" rx="1"/><rect x="1" y="7" width="10" height="2" rx="1"/><rect x="1" y="11" width="12" height="2" rx="1"/></svg>
            Relatórios
            <span className="sb2">3</span>
          </button>
          <button className="si">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,2 14,14 2,14"/><line x1="8" y1="7" x2="8" y2="10"/><circle cx="8" cy="12" r=".5" fill="currentColor"/></svg>
            Riscos
            <span className="sb2 danger">{ALL_PROJECTS.reduce((s,p)=>s+p.riscos,0)}</span>
          </button>
          {/* Atalho para o feed de mudanças */}
          <button className="si" onClick={() => setFeedOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round"/></svg>
            O que mudou
            {naoLidos > 0 && <span className="sb2 pulse">{naoLidos}</span>}
          </button>

          <div className="sf">
            <div className="uc">
              <div className="uav">CS</div>
              <div>
                <div className="un">Carolina Siqueira</div>
                <div className="ur">Risk Management</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ─────────────────────────────────── */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-title">
              Dashboard Executivo
              <span>Atualizado em 06 abr 2026 · 09:14</span>
            </div>
            {['Este mês','Trimestre','Ano'].map((l, i) => (
              <button key={l} className={`chip${activePeriod === String(i) ? ' active' : ''}`} onClick={() => setActivePeriod(String(i))}>{l}</button>
            ))}
            <div className="divider" />
            {/* SINO COM CONTADOR */}
            <button className="ib" title="Ver mudanças recentes" onClick={() => setFeedOpen(o => !o)} style={{ position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5 5 0 00-5 5v3L1 11h14l-2-2V6a5 5 0 00-5-5zm0 14a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>
              {naoLidos > 0 && <span className="notif-count">{naoLidos}</span>}
            </button>
            <button className="ib" title="Informações">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 12V8M8 5v-.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* BODY SPLIT */}
          <div className="body-split">

            {/* CONTEÚDO PRINCIPAL */}
            <div className="content">

              {/* FILTROS */}
              <div className="fcard">
                <div className="fgrid">
                  <div>
                    <div className="flabel">Data início</div>
                    <input className="finput" type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                  </div>
                  <div>
                    <div className="flabel">Data fim</div>
                    <input className="finput" type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                  </div>
                  <div>
                    <div className="flabel">Filtrar por score</div>
                    <select className="finput" value={filterScore} onChange={e => setFilterScore(e.target.value)}>
                      <option value="all">Todos ({ALL_PROJECTS.length})</option>
                      <option value="excellent">Excelentes 80+ ({ALL_PROJECTS.filter(p=>p.score>=80).length})</option>
                      <option value="good">Bons 60–79 ({ALL_PROJECTS.filter(p=>p.score>=60&&p.score<80).length})</option>
                      <option value="poor">Problemáticos &lt;60 ({ALL_PROJECTS.filter(p=>p.score<60).length})</option>
                    </select>
                  </div>
                  <div>
                    <button className="fbtn" onClick={applyFilter}>Aplicar</button>
                  </div>
                </div>
                <div className="fmeta">
                  Período: <strong>{applied.ds}</strong> até <strong>{applied.de}</strong> · Projetos exibidos: <strong>{applied.count}</strong>
                </div>
              </div>

              {/* KPIs */}
              <div className="krow">
                <div className="kcard k1">
                  <div className="klabel">Total de cards</div>
                  <div className="kval"><b>{totalCards}</b></div>
                  <div className="kdelta up">{filtered.length} projetos ativos</div>
                </div>
                <div className="kcard k2">
                  <div className="klabel">Bugs pendentes</div>
                  <div className="kval"><b>{totalBugs}</b></div>
                  <div className="kdelta dn">bugs abertos</div>
                </div>
                <div className="kcard k3">
                  <div className="klabel">Health score</div>
                  <div className="kval"><b>{avgScore}</b></div>
                  <div className={`kdelta ${avgScore >= 80 ? 'up' : avgScore >= 60 ? 'neu' : 'dn'}`}>score médio</div>
                </div>
                <div className="kcard k4">
                  <div className="klabel">Riscos abertos</div>
                  <div className="kval"><b>{totalRiscos}</b></div>
                  <div className="kdelta dn">riscos em aberto</div>
                </div>
              </div>

              {/* CHARTS */}
              <div className="crow">
                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ct">Distribuição de cards por projeto</div>
                      <div className="cs">Pend · Ref · Dev · Done</div>
                    </div>
                  </div>
                  <div className="lgrow">
                    <div className="lgi"><div className="lgd" style={{background:'#E24B4A'}}></div>Pendente</div>
                    <div className="lgi"><div className="lgd" style={{background:'#EF9F27'}}></div>Refinamento</div>
                    <div className="lgi"><div className="lgd" style={{background:'#378ADD'}}></div>Dev</div>
                    <div className="lgi"><div className="lgd" style={{background:'#1D9E75'}}></div>Done</div>
                  </div>
                  <div style={{position:'relative',width:'100%',height:'210px'}}>
                    <Bar data={barData} options={barOptions} />
                  </div>
                </div>
                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ct">Health score por projeto</div>
                      <div className="cs">Score agregado de saúde</div>
                    </div>
                  </div>
                  <div style={{position:'relative',width:'100%',height:'180px'}}>
                    <Bar data={hbarData} options={hbarOptions} />
                  </div>
                  <div className="lgrow" style={{justifyContent:'center',marginTop:'10px'}}>
                    <div className="lgi"><div className="lgd" style={{background:'#1A9E75'}}></div>Excelente 80+</div>
                    <div className="lgi"><div className="lgd" style={{background:'#C9A84C'}}></div>Bom 60–79</div>
                    <div className="lgi"><div className="lgd" style={{background:'#D85A30'}}></div>Crítico &lt;60</div>
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="tcard">
                <div className="thead2">
                  <div>
                    <div className="ct">Análise detalhada por projeto</div>
                    <div className="cs">Todas as dimensões · filtro ativo</div>
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Projeto</th>
                        <th className="c">Pend</th><th className="c">Ref</th><th className="c">Dev</th><th className="c">Done</th>
                        <th className="c">Bugs</th><th className="c">Riscos</th><th className="c">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => (
                        <tr key={i}>
                          <td className="pname">{p.name}</td>
                          <td className="c"><span className="pill p-pend">{p.pend}</span></td>
                          <td className="c"><span className="pill p-ref">{p.ref}</span></td>
                          <td className="c"><span className="pill p-dev">{p.dev}</span></td>
                          <td className="c"><span className="pill p-done">{p.done}</span></td>
                          <td className="c"><span className={`pill ${p.bugs > 3 ? 'p-bad' : 'p-ok'}`}>{p.bugs}</span></td>
                          <td className="c"><span className={`pill ${p.riscos > 3 ? 'p-bad' : 'p-ok'}`}>{p.riscos}</span></td>
                          <td className="c"><div className={`score-circle ${scoreClass(p.score)}`}>{p.score}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>{/* /content */}

            {/* ══ FEED DE MUDANÇAS ══════════════════════ */}
            <div className={`feed-panel${feedOpen ? '' : ' collapsed'}`}>

              <div className="feed-header">
                <div className="feed-title-row">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#0B1F3A" strokeWidth="1.6">
                    <path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round"/>
                  </svg>
                  <span className="feed-title">O que mudou</span>
                  {naoLidos > 0 && <span className="feed-unread">{naoLidos} novo{naoLidos > 1 ? 's' : ''}</span>}
                  {naoLidos > 0 && (
                    <button className="feed-clear" onClick={marcarTodosLidos}>marcar todos lidos</button>
                  )}
                  <button
                    onClick={() => setFeedOpen(false)}
                    style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--tx3)',fontSize:'16px',lineHeight:1,padding:'0 2px'}}
                    title="Fechar"
                  >×</button>
                </div>
                <div className="feed-tabs">
                  {(['todos','nao_lidos','urgentes'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`feed-tab${feedFilter === tab ? ' active' : ''}`}
                      onClick={() => setFeedFilter(tab)}
                    >
                      {tab === 'todos' ? 'Todos' : tab === 'nao_lidos' ? 'Não lidos' : '⚠ Urgentes'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="feed-body">
                {feedItems.length === 0 ? (
                  <div className="feed-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round"/></svg>
                    Nenhuma mudança{feedFilter === 'nao_lidos' ? ' não lida' : feedFilter === 'urgentes' ? ' urgente' : ''} no período.
                  </div>
                ) : feedItems.map(c => {
                  const meta = CHANGE_META[c.type];
                  const paradoClass = c.paradoDias === 0 ? '' : c.paradoDias >= 14 ? 'crit' : c.paradoDias >= 5 ? 'warn' : 'ok';
                  return (
                    <div
                      key={c.id}
                      className={`feed-item${!c.lido ? ' unread' : ''}${c.urgente ? ' urgente' : ''}`}
                      onClick={() => marcarLido(c.id)}
                    >
                      <div className="fi-icon" style={{background: meta.bg, color: meta.color}}>
                        {meta.icon}
                      </div>
                      <div className="fi-body">
                        <div className="fi-projeto">{c.projeto}</div>
                        <div className="fi-top">
                          <span className="fi-type" style={{background: meta.bg, color: meta.color}}>{meta.label}</span>
                          {c.urgente && <span className="fi-urgente">Urgente</span>}
                        </div>
                        <div className="fi-desc">{c.descricao}</div>
                        {c.detalhe && <div className="fi-detalhe">{c.detalhe}</div>}
                        <div className="fi-meta">
                          <span>{c.usuario}</span>
                          <span className="fi-dot">·</span>
                          <span>{c.tempo}</span>
                        </div>

                        {/* ── PARADO + ÚLTIMO COMENTÁRIO ── */}
                        <div className="fi-footer">
                          {c.paradoDias > 0 ? (
                            <span className={`fi-parado ${paradoClass}`}>
                              ⏱ parado há {c.paradoDias}d
                            </span>
                          ) : (
                            <span className="fi-parado ok">⏱ movimentado agora</span>
                          )}
                          {c.ultimoComentario ? (
                            <span className="fi-comentario" title={`"${c.ultimoComentario.texto}" — ${c.ultimoComentario.autor}`}>
                              💬 <span className="autor">{c.ultimoComentario.autor}</span>&nbsp;·&nbsp;{c.ultimoComentario.data}
                            </span>
                          ) : (
                            <span className="fi-sem-comentario">sem comentários</span>
                          )}
                        </div>

                      </div>
                      {!c.lido && <div className={`fi-unread-dot${c.urgente ? ' urgente' : ''}`} />}
                    </div>
                  );
                })}
              </div>
            </div>{/* /feed-panel */}

          </div>{/* /body-split */}
        </div>{/* /main */}
      </div>
    </>
  );
}
