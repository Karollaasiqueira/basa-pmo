'use client';

import { useState, useEffect, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════

interface Risco {
  key: string; titulo: string; modulo: string; drop: string;
  probabilidade: 'Alta'|'Média'|'Baixa';
  impacto: 'Alto'|'Médio'|'Baixo';
  status: 'Aberto'|'Em Mitigação'|'Mitigado'|'Encerrado';
  prioridade: 'Crítico'|'Alto'|'Médio'|'Baixo';
  responsavel: string; prazo: string|null; criado: string; atualizado: string;
  labels: string[]; url: string; mitigacao: string;
}

interface Mudanca {
  key: string; titulo: string; modulo: string; drop: string;
  status: 'Aprovada'|'Em Análise'|'Rejeitada'|'Implementada';
  impacto: 'Alto'|'Médio'|'Baixo';
  responsavel: string; prazo: string|null; criado: string; atualizado: string;
  labels: string[]; url: string; descricao: string; parceiro?: string;
}

interface ParceiroDash {
  nome: string; sigla: string; cor: string; bg: string; papel: string;
  riscos: number; mudancas: number; bloqueados: number; total: number;
  drops: string[];
}

interface IssueCritica {
  key: string; titulo: string; status: string;
  prioridade: 'Crítico'|'Alto'|'Médio'|'Baixo';
  responsavel: string; drop: string; url: string; labels: string[];
}

interface MatrizModulo {
  modulo: string; total: number; criticos: number; abertos: number; mitigados: number; score: number;
}

interface ResumoDropGov {
  drop: string; riscos: number; riscosAltos: number;
  mudancas: number; mudancasPendentes: number; criticas: number;
}

interface GovData {
  geradoEm: string;
  summary: {
    totalRiscos: number; riscosAbertos: number; riscosCriticos: number; riscosAltos: number;
    emMitigacao: number; mitigados: number; totalMudancas: number; mudancasAnalise: number;
    mudancasAprovadas: number; mudancasImpl: number; totalCriticas: number;
  };
  riscos: Risco[];
  mudancas: Mudanca[];
  criticas: IssueCritica[];
  matrizModulos: MatrizModulo[];
  resumoDrops: ResumoDropGov[];
}

// ════════════════════════════════════════════════════════════════
//  MOCK DATA — usado quando Jira não retorna dados suficientes
// ════════════════════════════════════════════════════════════════

const MOCK_RISCOS: Risco[] = [
  { key:'PDR-001', titulo:'Falha na autenticação biométrica em dispositivos legados', modulo:'Segurança', drop:'D1', probabilidade:'Alta', impacto:'Alto', status:'Em Mitigação', prioridade:'Crítico', responsavel:'Carlos M.', prazo:'15/04/2026', criado:'2026-01-10', atualizado:'2026-04-01', labels:['segurança','d1'], url:'#', mitigacao:'Implementar fallback com PIN e OTP para dispositivos sem biometria.' },
  { key:'PDR-002', titulo:'Latência elevada no processamento de PIX em horário de pico', modulo:'Transações', drop:'D2', probabilidade:'Média', impacto:'Alto', status:'Aberto', prioridade:'Alto', responsavel:'Ana P.', prazo:'30/04/2026', criado:'2026-02-05', atualizado:'2026-03-28', labels:['pix','d2'], url:'#', mitigacao:'Escalonamento horizontal do serviço de mensageria.' },
  { key:'PDR-003', titulo:'Inconsistência no cálculo de taxas de crédito rotativo', modulo:'Crédito', drop:'D2', probabilidade:'Baixa', impacto:'Alto', status:'Aberto', prioridade:'Alto', responsavel:'Rodrigo S.', prazo:'20/04/2026', criado:'2026-02-15', atualizado:'2026-04-02', labels:['credito','d2'], url:'#', mitigacao:'Revisão do motor de cálculo e testes de regressão.' },
  { key:'PDR-004', titulo:'Exposição de dados sensíveis nos logs de auditoria', modulo:'Segurança', drop:'D1', probabilidade:'Média', impacto:'Alto', status:'Em Mitigação', prioridade:'Crítico', responsavel:'Carolina S.', prazo:'10/04/2026', criado:'2026-01-20', atualizado:'2026-04-05', labels:['segurança','lgpd','d1'], url:'#', mitigacao:'Mascaramento de PII nos logs antes de persistência.' },
  { key:'PDR-005', titulo:'Indisponibilidade da API de investimentos em fins de semana', modulo:'Investimentos', drop:'D3', probabilidade:'Alta', impacto:'Médio', status:'Aberto', prioridade:'Médio', responsavel:'Beatriz L.', prazo:'05/05/2026', criado:'2026-03-01', atualizado:'2026-04-01', labels:['investimentos','d3'], url:'#', mitigacao:'Implementar janela de manutenção programada com fallback.' },
  { key:'PDR-006', titulo:'Falha na validação de documentos no onboarding digital', modulo:'Onboarding', drop:'D1', probabilidade:'Média', impacto:'Médio', status:'Mitigado', prioridade:'Médio', responsavel:'Lucas F.', prazo:'01/04/2026', criado:'2026-01-15', atualizado:'2026-04-03', labels:['onboarding','kyc','d1'], url:'#', mitigacao:'OCR com dupla validação e revisão manual para casos ambíguos.' },
  { key:'PDR-007', titulo:'Risco de indisponibilidade da infraestrutura em migração cloud', modulo:'Infraestrutura', drop:'D4', probabilidade:'Alta', impacto:'Alto', status:'Aberto', prioridade:'Crítico', responsavel:'Pedro A.', prazo:'30/05/2026', criado:'2026-03-10', atualizado:'2026-04-04', labels:['infraestrutura','cloud','d4'], url:'#', mitigacao:'Plano de rollback e ambiente de DR ativo.' },
  { key:'PDR-008', titulo:'Não conformidade com regulamentação BACEN 4.893', modulo:'Crédito', drop:'D3', probabilidade:'Média', impacto:'Alto', status:'Em Mitigação', prioridade:'Alto', responsavel:'Carolina S.', prazo:'30/04/2026', criado:'2026-02-20', atualizado:'2026-04-02', labels:['compliance','credito','d3'], url:'#', mitigacao:'Adequação dos relatórios conforme normativa vigente.' },
  { key:'PDR-009', titulo:'Timeout em transações de alto valor acima de R$ 50k', modulo:'Transações', drop:'D2', probabilidade:'Baixa', impacto:'Alto', status:'Aberto', prioridade:'Alto', responsavel:'Marcos T.', prazo:'15/05/2026', criado:'2026-03-05', atualizado:'2026-04-01', labels:['transacoes','d2'], url:'#', mitigacao:'Aumento do timeout e implementação de confirmação assíncrona.' },
  { key:'PDR-010', titulo:'Vulnerabilidade de SQL Injection no módulo de consultas', modulo:'Segurança', drop:'D1', probabilidade:'Baixa', impacto:'Alto', status:'Mitigado', prioridade:'Crítico', responsavel:'Felipe R.', prazo:'15/03/2026', criado:'2026-01-05', atualizado:'2026-03-15', labels:['segurança','d1'], url:'#', mitigacao:'Parametrização de queries e revisão de código.' },
];

const MOCK_MUDANCAS: Mudanca[] = [
  { key:'MUD-001', titulo:'Migração do ambiente de produção AWS → Azure', modulo:'Infraestrutura', drop:'D4', status:'Em Análise', impacto:'Alto', responsavel:'Ana P.', prazo:'30/04/2026', criado:'2026-03-01', atualizado:'2026-04-05', labels:['infraestrutura','d4'], url:'#', descricao:'Migração completa do ambiente produtivo para Azure com zero downtime.' },
  { key:'MUD-002', titulo:'Alteração no fluxo de aprovação de crédito rotativo', modulo:'Crédito', drop:'D2', status:'Aprovada', impacto:'Alto', responsavel:'Carlos M.', prazo:'15/04/2026', criado:'2026-02-15', atualizado:'2026-04-01', labels:['credito','d2'], url:'#', descricao:'Novo fluxo de 3 etapas com aprovação automática até R$ 5k.' },
  { key:'MUD-003', titulo:'Atualização do SDK de biometria para versão 3.2', modulo:'Segurança', drop:'D1', status:'Implementada', impacto:'Médio', responsavel:'Carolina S.', prazo:'01/04/2026', criado:'2026-01-20', atualizado:'2026-04-01', labels:['segurança','d1'], url:'#', descricao:'Upgrade do SDK com suporte a novos dispositivos Android 14+.' },
  { key:'MUD-004', titulo:'Novo endpoint de consulta de posição de investimentos', modulo:'Investimentos', drop:'D3', status:'Em Análise', impacto:'Médio', responsavel:'Beatriz L.', prazo:'20/05/2026', criado:'2026-03-10', atualizado:'2026-04-03', labels:['investimentos','d3'], url:'#', descricao:'API RESTful com cache de 5 minutos para posição consolidada.' },
  { key:'MUD-005', titulo:'Integração com sistema de notificação push (Firebase)', modulo:'Onboarding', drop:'D2', status:'Aprovada', impacto:'Baixo', responsavel:'Lucas F.', prazo:'10/04/2026', criado:'2026-02-28', atualizado:'2026-04-02', labels:['onboarding','d2'], url:'#', descricao:'Push notifications para alertas de segurança e transações.' },
  { key:'MUD-006', titulo:'Refatoração do motor de cálculo de juros compostos', modulo:'Crédito', drop:'D3', status:'Em Análise', impacto:'Alto', responsavel:'Rodrigo S.', prazo:'30/04/2026', criado:'2026-03-15', atualizado:'2026-04-04', labels:['credito','d3'], url:'#', descricao:'Reescrita em Kotlin com precisão de 8 casas decimais.' },
  { key:'MUD-007', titulo:'Mudança no provider de processamento de PIX', modulo:'Transações', drop:'D2', status:'Rejeitada', impacto:'Alto', responsavel:'Pedro A.', prazo:'—', criado:'2026-02-10', atualizado:'2026-03-20', labels:['pix','d2'], url:'#', descricao:'Proposta de troca de provider rejeitada por risco operacional.' },
];

const MOCK_CRITICAS: IssueCritica[] = [
  { key:'MDB-217', titulo:'Bloqueio crítico: API PIX retornando erro 503 intermitente', status:'Bloqueado', prioridade:'Crítico', responsavel:'Carlos M.', drop:'D2', url:'https://deskcorp.atlassian.net/browse/MDB-217', labels:['bloqueador','pix'] },
  { key:'MDB-189', titulo:'Dependência externa: certificado SSL vence em 12 dias', status:'Em Andamento', prioridade:'Crítico', responsavel:'Ana P.', drop:'D1', url:'https://deskcorp.atlassian.net/browse/MDB-189', labels:['segurança','d1'] },
  { key:'MDB-245', titulo:'Performance degradada no módulo de consulta de saldo', status:'Em Análise', prioridade:'Alto', responsavel:'Rodrigo S.', drop:'D2', url:'https://deskcorp.atlassian.net/browse/MDB-245', labels:['performance','d2'] },
];

// ════════════════════════════════════════════════════════════════
//  COMPLIANCE CHECKLIST (estático por DROP)
// ════════════════════════════════════════════════════════════════

const COMPLIANCE_CHECKS: Record<string, { titulo: string; descricao: string; obrigatorio: boolean; status: 'ok'|'pendente'|'alerta' }[]> = {
  D1: [
    { titulo: 'Validação KYC', descricao: 'Verificação de identidade conforme BACEN 4.966', obrigatorio: true, status: 'ok' },
    { titulo: 'LGPD — Consentimento', descricao: 'Termo de consentimento de dados pessoais coletado', obrigatorio: true, status: 'ok' },
    { titulo: 'Teste de Segurança (SAST)', descricao: 'Análise estática de código antes do deploy', obrigatorio: true, status: 'alerta' },
    { titulo: 'Certificação SSL/TLS', descricao: 'Certificados válidos e atualizados', obrigatorio: true, status: 'alerta' },
    { titulo: 'Backup e Recovery', descricao: 'Plano de DR testado e documentado', obrigatorio: true, status: 'ok' },
    { titulo: 'Monitoramento APM', descricao: 'Alertas configurados para anomalias', obrigatorio: false, status: 'ok' },
  ],
  D2: [
    { titulo: 'Testes de Performance (PIX)', descricao: 'SLA de 10s para transações PIX validado', obrigatorio: true, status: 'pendente' },
    { titulo: 'Validação BACEN — PIX', descricao: 'Conformidade com regulamentação BACEN PIX', obrigatorio: true, status: 'ok' },
    { titulo: 'Auditoria de Transações', descricao: 'Log completo de todas as operações financeiras', obrigatorio: true, status: 'ok' },
    { titulo: 'Teste de Carga', descricao: 'Sistema validado para 10x volume normal', obrigatorio: true, status: 'alerta' },
    { titulo: 'Certificação PCI-DSS', descricao: 'Conformidade com padrão de segurança de pagamentos', obrigatorio: true, status: 'pendente' },
    { titulo: 'Plano de Rollback', descricao: 'Procedimento de rollback testado', obrigatorio: true, status: 'ok' },
  ],
  D3: [
    { titulo: 'Validação CVM — Investimentos', descricao: 'Conformidade com regulação CVM', obrigatorio: true, status: 'pendente' },
    { titulo: 'Suitability de Produtos', descricao: 'Adequação de perfil do investidor validada', obrigatorio: true, status: 'pendente' },
    { titulo: 'Relatório de Risco de Crédito', descricao: 'Relatório BACEN 4.893 adequado', obrigatorio: true, status: 'alerta' },
    { titulo: 'Testes de Regressão', descricao: 'Suite de testes completa executada', obrigatorio: true, status: 'ok' },
    { titulo: 'Revisão Jurídica', descricao: 'Contratos e termos revisados pelo jurídico', obrigatorio: true, status: 'pendente' },
  ],
  D4: [
    { titulo: 'Plano de Migração Cloud', descricao: 'Plano detalhado com janelas de manutenção', obrigatorio: true, status: 'ok' },
    { titulo: 'Teste de DR', descricao: 'Disaster Recovery testado em ambiente produtivo', obrigatorio: true, status: 'pendente' },
    { titulo: 'Inventário de Ativos', descricao: 'Mapeamento completo dos recursos migrados', obrigatorio: true, status: 'alerta' },
    { titulo: 'Aprovação de Arquitetura', descricao: 'Review de arquitetura pelo comitê técnico', obrigatorio: true, status: 'ok' },
    { titulo: 'Monitoramento Multi-cloud', descricao: 'Observabilidade configurada no novo ambiente', obrigatorio: false, status: 'pendente' },
  ],
  D5: [
    { titulo: 'Testes E2E Completos', descricao: 'Suite completa de testes end-to-end', obrigatorio: true, status: 'pendente' },
    { titulo: 'UAT Aprovado', descricao: 'User Acceptance Testing com stakeholders', obrigatorio: true, status: 'pendente' },
    { titulo: 'Documentação Atualizada', descricao: 'Toda documentação técnica e de negócio', obrigatorio: true, status: 'pendente' },
    { titulo: 'Treinamento Concluído', descricao: 'Time treinado nas novas funcionalidades', obrigatorio: true, status: 'pendente' },
    { titulo: 'Go-live Aprovado', descricao: 'Aprovação formal do comitê de steering', obrigatorio: true, status: 'pendente' },
  ],
};

// ════════════════════════════════════════════════════════════════
//  GUIAS RÁPIDOS
// ════════════════════════════════════════════════════════════════

const GUIAS = [
  {
    modulo: 'Segurança',
    icone: '🔐',
    cor: '#DC2626',
    bg: '#FEE2E2',
    descricao: 'Autenticação, biometria, criptografia e gestão de acessos.',
    topicos: ['Fluxo de autenticação JWT + OAuth2', 'Configuração de biometria iOS/Android', 'Rotação de chaves criptográficas', 'Matriz de permissões por perfil', 'Resposta a incidentes de segurança'],
    responsavel: 'Carolina S.',
    versao: 'v2.3',
    atualizado: '02/04/2026',
  },
  {
    modulo: 'Transações',
    icone: '💸',
    cor: '#1B6EC2',
    bg: '#DBEAFE',
    descricao: 'PIX, TED, DOC, pagamentos e conciliação financeira.',
    topicos: ['Integração com SPI (Sistema de Pagamentos Instantâneos)', 'Fluxo completo de PIX (QR Code, Copia e Cola, Agendado)', 'Tratamento de erros e reversões', 'Limites e restrições por tipo de transação', 'Monitoramento de fraudes em tempo real'],
    responsavel: 'Carlos M.',
    versao: 'v1.8',
    atualizado: '01/04/2026',
  },
  {
    modulo: 'Crédito',
    icone: '💳',
    cor: '#7C3AED',
    bg: '#F3E8FF',
    descricao: 'Crédito rotativo, financiamento, limite e score.',
    topicos: ['Motor de score de crédito (Neurotech)', 'Fluxo de aprovação automática x manual', 'Cálculo de juros compostos e IOF', 'Integração com bureaus (Serasa, SPC)', 'Relatórios regulatórios BACEN'],
    responsavel: 'Rodrigo S.',
    versao: 'v1.5',
    atualizado: '03/04/2026',
  },
  {
    modulo: 'Investimentos',
    icone: '📈',
    cor: '#16A34A',
    bg: '#DCFCE7',
    descricao: 'Renda fixa, fundos, ações e posição consolidada.',
    topicos: ['Integração com custódia (SELIC, B3)', 'API de cotações em tempo real', 'Suitability e perfil de investidor', 'Cálculo de rentabilidade e IR', 'Relatório de posição consolidada'],
    responsavel: 'Beatriz L.',
    versao: 'v1.2',
    atualizado: '28/03/2026',
  },
  {
    modulo: 'Onboarding',
    icone: '👤',
    cor: '#D97706',
    bg: '#FEF3C7',
    descricao: 'Abertura de conta, KYC, validação documental.',
    topicos: ['Fluxo de abertura de conta PF/PJ', 'Validação de documentos com OCR', 'Integração com Serpro (CPF/CNPJ)', 'Compliance KYC e PLD', 'Jornada de onboarding mobile'],
    responsavel: 'Lucas F.',
    versao: 'v2.1',
    atualizado: '04/04/2026',
  },
  {
    modulo: 'Infraestrutura',
    icone: '⚙️',
    cor: '#0E7490',
    bg: '#CFFAFE',
    descricao: 'Cloud, CI/CD, monitoramento e deploy.',
    topicos: ['Arquitetura multi-cloud (Azure + AWS)', 'Pipeline CI/CD (GitHub Actions)', 'Estratégia de deploy (Blue-Green)', 'Observabilidade (Datadog + Grafana)', 'Gestão de incidentes e SLA'],
    responsavel: 'Pedro A.',
    versao: 'v3.0',
    atualizado: '05/04/2026',
  },
];

// ════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════

function fmt(iso: string|null) {
  if (!iso || iso === '—') return '—';
  if (iso.includes('/')) return iso;
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function matrizCor(prob: string, imp: string): { bg: string; color: string; label: string } {
  const p = prob === 'Alta' ? 2 : prob === 'Média' ? 1 : 0;
  const i = imp  === 'Alto' ? 2 : imp  === 'Médio' ? 1 : 0;
  const score = p + i;
  if (score >= 4) return { bg: '#FEE2E2', color: '#991B1B', label: 'Crítico' };
  if (score === 3) return { bg: '#FFEDD5', color: '#9A3412', label: 'Alto' };
  if (score === 2) return { bg: '#FEF9C3', color: '#854D0E', label: 'Médio' };
  return { bg: '#DCFCE7', color: '#166534', label: 'Baixo' };
}

function scoreCor(s: number) {
  if (s >= 80) return '#16A34A';
  if (s >= 60) return '#D97706';
  return '#DC2626';
}

const STATUS_RISCO_STYLE: Record<string, { bg: string; color: string }> = {
  'Aberto':       { bg: '#FEE2E2', color: '#991B1B' },
  'Em Mitigação': { bg: '#FEF3C7', color: '#92400E' },
  'Mitigado':     { bg: '#D1FAE5', color: '#065F46' },
  'Encerrado':    { bg: '#F1F5F9', color: '#475569' },
};

const STATUS_MUD_STYLE: Record<string, { bg: string; color: string }> = {
  'Em Análise':  { bg: '#FEF3C7', color: '#92400E' },
  'Aprovada':    { bg: '#D1FAE5', color: '#065F46' },
  'Rejeitada':   { bg: '#FEE2E2', color: '#991B1B' },
  'Implementada':{ bg: '#DBEAFE', color: '#1E40AF' },
};

const COMPLIANCE_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  'ok':      { bg: '#DCFCE7', color: '#16A34A', icon: '✓' },
  'alerta':  { bg: '#FEF3C7', color: '#D97706', icon: '⚠' },
  'pendente':{ bg: '#FEE2E2', color: '#DC2626', icon: '○' },
};

function KpiCard({ label, value, sub, color, bgColor }: { label:string; value:number|string; sub?:string; color:string; bgColor:string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 18px', borderTop:`3px solid ${color}`, minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, color:'#0F172A', fontFamily:'monospace', lineHeight:1, letterSpacing:'-1px' }}>{value}</div>
      {sub && <div style={{ display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, marginTop:7, background:bgColor, color }}>{sub}</div>}
    </div>
  );
}

function Bar({ value, color='#1B6EC2', height=6 }: { value:number; color?:string; height?:number }) {
  return (
    <div style={{ background:'#F1F5F9', borderRadius:4, height, overflow:'hidden', width:'100%' }}>
      <div style={{ height:'100%', width:`${Math.min(value,100)}%`, background:color, borderRadius:4, transition:'width .5s' }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════



// ── Ciclo de vida do risco ────────────────────────────────────────────────
const CICLO_VIDA = ['Identificado','Avaliado','Mitigação em Curso','Contingência Ativada','Monitorado','Done'] as const;
type CicloVida = typeof CICLO_VIDA[number];

const CICLO_STYLE: Record<CicloVida,{bg:string;color:string;icon:string}> = {
  'Identificado':        {bg:'#F1F5F9',color:'#475569',icon:'○'},
  'Avaliado':            {bg:'#DBEAFE',color:'#1D4ED8',icon:'◎'},
  'Mitigação em Curso':  {bg:'#FEF3C7',color:'#92400E',icon:'⟳'},
  'Contingência Ativada':{bg:'#FEE2E2',color:'#991B1B',icon:'⚡'},
  'Monitorado':          {bg:'#D1FAE5',color:'#065F46',icon:'👁'},
  'Done':                {bg:'#DCFCE7',color:'#15803D',icon:'✓'},
};

// Cronograma mensal de auditoria
const AUDITORIA_MENSAL = [
  { mes:'Jan', data:'2026-01-28', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Realizada', ata:'#' },
  { mes:'Fev', data:'2026-02-25', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Realizada', ata:'#' },
  { mes:'Mar', data:'2026-03-26', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Realizada', ata:'#' },
  { mes:'Abr', data:'2026-04-22', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Mai', data:'2026-05-27', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Jun', data:'2026-06-24', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Jul', data:'2026-07-22', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Ago', data:'2026-08-26', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Set', data:'2026-09-23', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Out', data:'2026-10-28', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Nov', data:'2026-11-25', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
  { mes:'Dez', data:'2026-12-16', drops:['D1','D2','D3','D4','D5'], parceiros:['Tailwind','Corebanx','ITSS','Neurotech','Deskcorp'], status:'Agendada', ata:'' },
];

// ── Exportação Excel (CSV) ────────────────────────────────────────────────
function exportarPlanoMitigacao(riscos: any[], mudancas: any[]) {
  const BOM = '\uFEFF';
  const sep = ';';

  const linhas: string[] = [];

  // Cabeçalho Riscos
  linhas.push('PLANO DE MITIGAÇÃO DE RISCOS - BASA PMO · Greenfield MVP-1');
  linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('');
  linhas.push('=== RISCOS (PDR) ===');
  linhas.push(['ID','Título','Módulo','DROP','Parceiro','Prioridade','Impacto','Probabilidade','Status','Responsável','Prazo','Plano de Mitigação','Link'].join(sep));

  riscos.forEach(r => {
    linhas.push([
      r.key,
      `"${(r.titulo||'').replace(/"/g,'""')}"`,
      r.modulo||'',
      r.dropLabel||r.drop||'',
      r.parceiro||'',
      r.prioridade||'',
      r.impacto||'',
      r.probabilidade||'',
      r.status||'',
      r.responsavel||'',
      r.prazo||'',
      `"${(r.mitigacao||'').replace(/"/g,'""')}"`,
      r.url||'',
    ].join(sep));
  });

  linhas.push('');
  linhas.push('=== MUDANÇAS (MUD) ===');
  linhas.push(['ID','Título','Módulo','DROP','Parceiro','Status','Impacto','Responsável','Prazo','Descrição / Pendência','Link'].join(sep));

  mudancas.forEach(m => {
    linhas.push([
      m.key,
      `"${(m.titulo||'').replace(/"/g,'""')}"`,
      m.modulo||'',
      m.dropLabel||m.drop||'',
      m.parceiro||'',
      m.status||'',
      m.impacto||'',
      m.responsavel||'',
      m.prazo||'',
      `"${(m.descricao||'').replace(/"/g,'""')}"`,
      m.url||'',
    ].join(sep));
  });

  const blob = new Blob([BOM + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `PlanoMitigacao_BASA_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


async function atualizarCicloVida(issueKey: string, cicloVida: CicloVida, onSuccess?: ()=>void) {
  try {
    const res = await fetch('/api/jira-gov', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueKey, cicloVida }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✓ ${issueKey} atualizado para "${cicloVida}" no Jira`);
      onSuccess?.();
    } else {
      alert(`Erro: ${data.error}
Transições disponíveis: ${data.available?.join(', ')}`);
    }
  } catch (e) {
    alert('Erro ao conectar com o Jira');
  }
}

export default function GovernancaDashboard() {
  const [data, setData]       = useState<GovData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [aba, setAba]         = useState<'overview'|'riscos'|'mudancas'|'parceiros'|'auditoria'|'jira'|'compliance'|'auditoria-legal'|'guias'>('overview');
  const [dropFiltro, setDropFiltro]   = useState('Todos');
  const [moduloFiltro, setModuloFiltro] = useState('Todos');
  const [complianceDrop, setComplianceDrop] = useState('D1');
  const [guiaAberto, setGuiaAberto]   = useState<string|null>(null);
  const [lastRefresh, setLastRefresh] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/jira-gov');
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Dados reais do Jira
      const riscos   = json.riscos   ?? [];
      const mudancas = json.mudancas ?? [];
      const criticas = json.criticas ?? [];

      // Recalcula summary com dados reais ou mock
      const summary = {
        totalRiscos:      riscos.length,
        riscosAbertos:    riscos.filter((r:Risco) => r.status === 'Aberto').length,
        riscosCriticos:   riscos.filter((r:Risco) => r.prioridade === 'Crítico').length,
        riscosAltos:      riscos.filter((r:Risco) => r.prioridade === 'Alto').length,
        emMitigacao:      riscos.filter((r:Risco) => r.status === 'Em Mitigação').length,
        mitigados:        riscos.filter((r:Risco) => r.status === 'Mitigado' || r.status === 'Encerrado').length,
        totalMudancas:    mudancas.length,
        mudancasAnalise:  mudancas.filter((m:Mudanca) => m.status === 'Em Análise').length,
        mudancasAprovadas:mudancas.filter((m:Mudanca) => m.status === 'Aprovada').length,
        mudancasImpl:     mudancas.filter((m:Mudanca) => m.status === 'Implementada').length,
        totalCriticas:    criticas.length,
      };

      const MODULOS = ['Segurança','Transações','Investimentos','Crédito','Onboarding','Infraestrutura'];
      const matrizModulos = MODULOS.map(mod => {
        const rm = riscos.filter((r:Risco) => r.modulo === mod);
        const criticos = rm.filter((r:Risco) => r.prioridade === 'Crítico' || r.impacto === 'Alto');
        const abertos  = rm.filter((r:Risco) => r.status === 'Aberto' || r.status === 'Em Mitigação');
        return {
          modulo: mod, total: rm.length, criticos: criticos.length, abertos: abertos.length,
          mitigados: rm.filter((r:Risco) => r.status === 'Mitigado' || r.status === 'Encerrado').length,
          score: rm.length > 0 ? Math.max(0, Math.round(100 - ((criticos.length * 30 + abertos.length * 10) / rm.length))) : 100,
        };
      });

      const drops = ['D1','D2','D3','D4','D5'];
      const resumoDrops = drops.map(drop => ({
        drop,
        riscos:      riscos.filter((r:Risco) => r.drop === drop).length,
        riscosAltos: riscos.filter((r:Risco) => r.drop === drop && (r.impacto === 'Alto' || r.prioridade === 'Crítico')).length,
        mudancas:    mudancas.filter((m:Mudanca) => m.drop === drop).length,
        mudancasPendentes: mudancas.filter((m:Mudanca) => m.drop === drop && m.status === 'Em Análise').length,
        criticas:    criticas.filter((c:IssueCritica) => c.drop === drop).length,
      }));

      setData({ ...json, summary, riscos, mudancas, criticas, matrizModulos, resumoDrops });
      setLastRefresh(new Date().toLocaleTimeString('pt-BR'));
    } catch (e: any) {
      // Se API falhar, dados vazios
      const riscos: any[]   = [];
      const mudancas: any[] = [];
      const criticas: any[] = [];
      const MODULOS  = ['Segurança','Transações','Investimentos','Crédito','Onboarding','Infraestrutura'];
      const matrizModulos = MODULOS.map(mod => {
        const rm = riscos.filter(r => r.modulo === mod);
        const crit = rm.filter(r => r.prioridade === 'Crítico' || r.impacto === 'Alto');
        const ab   = rm.filter(r => r.status === 'Aberto' || r.status === 'Em Mitigação');
        return { modulo:mod, total:rm.length, criticos:crit.length, abertos:ab.length, mitigados:rm.filter(r=>r.status==='Mitigado'||r.status==='Encerrado').length, score:rm.length>0?Math.max(0,Math.round(100-((crit.length*30+ab.length*10)/rm.length))):100 };
      });
      const resumoDrops = ['D1','D2','D3','D4','D5'].map(drop => ({
        drop, riscos:riscos.filter(r=>r.drop===drop).length, riscosAltos:riscos.filter(r=>r.drop===drop&&(r.impacto==='Alto'||r.prioridade==='Crítico')).length, mudancas:mudancas.filter(m=>m.drop===drop).length, mudancasPendentes:mudancas.filter(m=>m.drop===drop&&m.status==='Em Análise').length, criticas:criticas.filter(c=>c.drop===drop).length,
      }));
      setError('Não foi possível carregar dados do Jira. Verifique a conexão.');
      setData({ geradoEm:new Date().toISOString(), summary:{ totalRiscos:riscos.length, riscosAbertos:riscos.filter(r=>r.status==='Aberto').length, riscosCriticos:riscos.filter(r=>r.prioridade==='Crítico').length, riscosAltos:riscos.filter(r=>r.prioridade==='Alto').length, emMitigacao:riscos.filter(r=>r.status==='Em Mitigação').length, mitigados:riscos.filter(r=>r.status==='Mitigado'||r.status==='Encerrado').length, totalMudancas:mudancas.length, mudancasAnalise:mudancas.filter(m=>m.status==='Em Análise').length, mudancasAprovadas:mudancas.filter(m=>m.status==='Aprovada').length, mudancasImpl:mudancas.filter(m=>m.status==='Implementada').length, totalCriticas:criticas.length }, riscos, mudancas, criticas, matrizModulos, resumoDrops });
      setLastRefresh(new Date().toLocaleTimeString('pt-BR') + ' (mock)');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const MODULOS_LIST = ['Todos','Segurança','Transações','Investimentos','Crédito','Onboarding','Infraestrutura'];
  const DROPS_LIST   = ['Todos','D1','D2','D3','D4','D5'];

  const riscosFiltrados = (data?.riscos ?? []).filter(r =>
    (dropFiltro   === 'Todos' || r.drop   === dropFiltro) &&
    (moduloFiltro === 'Todos' || r.modulo === moduloFiltro)
  );
  const mudancasFiltradas = (data?.mudancas ?? []).filter(m =>
    (dropFiltro === 'Todos' || m.drop === dropFiltro)
  );

  const ABAS = [
    { key:'overview',   label:'🏠 Visão Geral',      badge: null },
    { key:'riscos',     label:'⚠ Riscos',            badge: data?.summary.riscosAbertos },
    { key:'mudancas',   label:'↺ Mudanças',          badge: data?.summary.mudancasAnalise },
    { key:'parceiros',  label:'🤝 Parceiros',        badge: null },
    { key:'jira',       label:'🔗 Issues Críticas',  badge: data?.summary.totalCriticas },
    { key:'auditoria',  label:'📅 Auditoria',        badge: null },
    { key:'compliance', label:'✓ Compliance',        badge: null },
    { key:'auditoria-legal', label:'⚖ Auditoria Legal', badge: null },
    { key:'guias',      label:'📘 Guias Rápidos',    badge: null },
  ] as const;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{height:100%;font-family:'IBM Plex Sans',sans-serif;background:#F8FAFC;color:#0F172A;font-size:13px;}
    .page{display:flex;flex-direction:column;height:100vh;overflow:hidden;}
    .topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:0 24px;height:56px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
    .sub-nav{background:#fff;border-bottom:1px solid #E2E8F0;padding:0 24px;display:flex;gap:2px;flex-shrink:0;overflow-x:auto;}
    .sub-tab{padding:10px 16px;font-size:12px;font-weight:500;color:#64748B;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;display:flex;align-items:center;gap:6px;background:none;border-left:none;border-right:none;border-top:none;font-family:'IBM Plex Sans',sans-serif;}
    .sub-tab:hover{color:#0F172A;}
    .sub-tab.active{color:#003087;border-bottom-color:#003087;font-weight:600;}
    .tab-badge{font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;}
    .tab-badge.danger{background:#DC2626;color:#fff;animation:pulsar 1.5s ease-in-out infinite;}
    .tab-badge.warn{background:#D97706;color:#fff;}
    .content{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;}
    .content::-webkit-scrollbar{width:4px;}
    .content::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:2px;}
    .card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;}
    .card-head{padding:14px 18px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .card-title{font-size:13px;font-weight:600;color:#0F172A;flex:1;}
    .card-sub{font-size:11px;color:#64748B;}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
    .g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
    .g5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}
    .g6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
    .g12{display:grid;grid-template-columns:1fr 2fr;gap:14px;}
    .g21{display:grid;grid-template-columns:2fr 1fr;gap:14px;}
    .tbl{width:100%;border-collapse:collapse;font-size:12px;}
    .tbl thead th{font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:#64748B;padding:8px 14px;text-align:left;border-bottom:1px solid #E2E8F0;background:#F8FAFC;white-space:nowrap;}
    .tbl thead th.c{text-align:center;}
    .tbl tbody tr{border-bottom:1px solid #F1F5F9;transition:background .1s;}
    .tbl tbody tr:hover{background:#F8FAFC;}
    .tbl tbody tr:last-child{border-bottom:none;}
    .tbl td{padding:9px 14px;vertical-align:middle;}
    .tbl td.c{text-align:center;}
    .pill{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap;}
    .ikey{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#1B6EC2;text-decoration:none;}
    .ikey:hover{text-decoration:underline;}
    .isum{font-size:12px;color:#0F172A;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}
    .dbadge{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;}
    .dD1{background:#DBEAFE;color:#1E40AF;} .dD2{background:#D1FAE5;color:#065F46;}
    .dD3{background:#FEF3C7;color:#92400E;} .dD4{background:#FCE7F3;color:#9D174D;}
    .dD5{background:#F3E8FF;color:#6B21A8;} .dGeral{background:#F1F5F9;color:#475569;}
    .btn{padding:5px 14px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid #E2E8F0;color:#334155;background:#fff;font-family:'IBM Plex Sans',sans-serif;transition:all .15s;}
    .btn:hover{background:#F1F5F9;}
    .btn.primary{background:#003087;color:#fff;border-color:#003087;}
    .btn.primary:hover{background:#00409A;}
    .fbtn{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid #E2E8F0;color:#64748B;background:#fff;font-family:'IBM Plex Sans',sans-serif;transition:all .15s;}
    .fbtn:hover{background:#F1F5F9;}
    .fbtn.active{background:#003087;color:#fff;border-color:#003087;}
    .loader{width:36px;height:36px;border:3px solid #E2E8F0;border-top-color:#1B6EC2;border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes pulsar{0%,100%{opacity:1}50%{opacity:.5}}
    .s-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:14px;color:#64748B;}
    .s-empty{padding:40px;text-align:center;color:#64748B;font-size:13px;}
    .filter-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
    .autolabel{font-size:11px;color:#64748B;display:flex;align-items:center;gap:5px;cursor:pointer;}
    .matriz-cell{border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;min-height:52px;flex-direction:column;gap:2px;}
    .guia-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;cursor:pointer;transition:box-shadow .15s;}
    .guia-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);}
    .guia-topico{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:12px;color:#334155;}
    .guia-topico:last-child{border-bottom:none;}
    .comp-row{display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid #F1F5F9;}
    .comp-row:last-child{border-bottom:none;}
    .timeline-item{display:flex;gap:16px;padding:12px 0;border-bottom:1px solid #F1F5F9;}
    .timeline-item:last-child{border-bottom:none;}
    .timeline-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;margin-top:3px;}
    .timeline-line{width:1px;background:#E2E8F0;margin:0 5px;}
  `;

  return (
    <>
      <style>{CSS}</style>
      <div className="page">

        {/* ── TOPBAR ── */}
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,background:'#F59E0B',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#003087',fontSize:15}}>B</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#003087'}}>BASA PMO</div>
              <div style={{fontSize:10,color:'#64748B'}}>Greenfield MVP-1 · Governança</div>
            </div>
          </div>
          <div style={{width:1,height:28,background:'#E2E8F0'}}/>
          <div style={{fontSize:14,fontWeight:600,color:'#0F172A',flex:1}}>Dashboard de Governança</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
            {lastRefresh && <span style={{fontSize:11,color:'#64748B'}}>Atualizado às {lastRefresh}</span>}
            <button
              onClick={() => exportarPlanoMitigacao(data?.riscos??[], data?.mudancas??[])}
              disabled={!data}
              style={{background:'#16A34A',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:700,fontSize:12,cursor:'pointer',opacity:data?1:0.5}}
            >⬇ Exportar Excel</button>
            <button className="btn primary" onClick={fetchData} disabled={loading}>{loading?'⏳':'↻'} Atualizar</button>
          </div>
        </div>

        {/* ── ABAS ── */}
        <div className="sub-nav">
          {ABAS.map(t => (
            <button key={t.key} className={`sub-tab${aba===t.key?' active':''}`} onClick={()=>setAba(t.key)}>
              {t.label}
              {t.badge !== null && t.badge !== undefined && t.badge > 0 && (
                <span className={`tab-badge ${t.key==='riscos'||t.key==='jira'?'danger':'warn'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div className="content">
          {loading && <div className="s-loading"><div className="loader"/><div>Buscando dados de Governança (PDR + MUD + MDB)...</div></div>}

          {!loading && data && <>

            {/* ══════════════════════════════════════
                VISÃO GERAL
            ══════════════════════════════════════ */}
            {aba === 'overview' && <>
              {/* KPIs */}
              <div className="g4">
                <KpiCard label="Riscos Abertos"     value={data.summary.riscosAbertos}  color="#DC2626" bgColor="#FEE2E2" sub={`${data.summary.riscosCriticos} críticos`}/>
                <KpiCard label="Em Mitigação"        value={data.summary.emMitigacao}    color="#D97706" bgColor="#FEF3C7" sub="em tratamento"/>
                <KpiCard label="Mudanças em Análise" value={data.summary.mudancasAnalise}color="#7C3AED" bgColor="#F3E8FF" sub="aguardando"/>
                <KpiCard label="Issues Críticas MDB" value={data.summary.totalCriticas}  color="#991B1B" bgColor="#FFF0F0" sub="bloqueadores"/>
              </div>

              {/* Resumo por DROP */}
              <div className="card">
                <div className="card-head"><div className="card-title">Visão Consolidada por DROP</div></div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>DROP</th><th>Tema</th>
                      <th className="c">Riscos</th><th className="c">Riscos Altos</th>
                      <th className="c">Mudanças</th><th className="c">Em Análise</th>
                      <th className="c">Aprovadas</th><th className="c">Issues Bloq.</th><th>Saúde</th>
                    </tr></thead>
                    <tbody>
                      {data.resumoDrops.map(d => {
                        const saude = Math.max(0, 100 - (d.riscosAltos * 20 + d.mudancasPendentes * 10 + d.criticas * 30));
                        return (
                          <tr key={d.drop}>
                            <td><span className={`dbadge d${d.drop}`} style={{fontSize:12,padding:'3px 10px'}}>{d.drop}</span></td>
                            <td style={{fontSize:11,color:'#64748B'}}>{(d as any).label ?? ''}</td>
                            <td className="c"><span className="pill" style={{background:'#FEE2E2',color:'#991B1B'}}>{d.riscos}</span></td>
                            <td className="c"><span className="pill" style={{background:d.riscosAltos>0?'#FEE2E2':'#DCFCE7',color:d.riscosAltos>0?'#DC2626':'#16A34A'}}>{d.riscosAltos}</span></td>
                            <td className="c"><span className="pill" style={{background:'#F3E8FF',color:'#7C3AED'}}>{d.mudancas}</span></td>
                            <td className="c"><span className="pill" style={{background:d.mudancasPendentes>0?'#FEF3C7':'#DCFCE7',color:d.mudancasPendentes>0?'#D97706':'#16A34A'}}>{d.mudancasPendentes}</span></td>
                            <td className="c"><span className="pill" style={{background:(d as any).mudancasAprovadas>0?'#DCFCE7':'#F1F5F9',color:(d as any).mudancasAprovadas>0?'#16A34A':'#94A3B8'}}>{(d as any).mudancasAprovadas ?? 0}</span></td>
                            <td className="c"><span className="pill" style={{background:d.criticas>0?'#FFF0F0':'#DCFCE7',color:d.criticas>0?'#991B1B':'#16A34A'}}>{d.criticas}</span></td>
                            <td style={{minWidth:160}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{flex:1}}><Bar value={saude} color={saude>=70?'#16A34A':saude>=50?'#D97706':'#DC2626'} height={8}/></div>
                                <span style={{fontSize:11,fontWeight:700,color:saude>=70?'#16A34A':saude>=50?'#D97706':'#DC2626',fontFamily:'monospace',width:32}}>{saude}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matriz por módulo + issues críticas */}
              <div className="g21">
                <div className="card">
                  <div className="card-head"><div className="card-title">Score de Risco por Módulo</div></div>
                  <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}}>
                    {data.matrizModulos.map(m => (
                      <div key={m.modulo} style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:120,fontSize:12,fontWeight:500,color:'#334155',flexShrink:0}}>{m.modulo}</div>
                        <div style={{flex:1}}><Bar value={m.score} color={scoreCor(m.score)} height={8}/></div>
                        <span style={{fontSize:11,fontWeight:700,color:scoreCor(m.score),fontFamily:'monospace',width:32,textAlign:'right'}}>{m.score}</span>
                        {m.criticos > 0 && <span className="pill" style={{background:'#FEE2E2',color:'#DC2626',fontSize:9}}>{m.criticos} crítico{m.criticos>1?'s':''}</span>}
                        {m.abertos  > 0 && <span className="pill" style={{background:'#FEF3C7',color:'#D97706',fontSize:9}}>{m.abertos} aberto{m.abertos>1?'s':''}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><div className="card-title">🚨 Issues Críticas MDB</div></div>
                  <div>
                    {data.criticas.slice(0,6).map(c => (
                      <div key={c.key} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 16px',borderBottom:'1px solid #F1F5F9'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:c.prioridade==='Crítico'?'#DC2626':'#D97706',flexShrink:0,marginTop:4}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <a href={c.url} target="_blank" rel="noreferrer" className="ikey">{c.key}</a>
                          <div className="isum" style={{maxWidth:180,fontSize:11,marginTop:2}}>{c.titulo}</div>
                          <div style={{fontSize:10,color:'#64748B',marginTop:2}}>{c.responsavel}</div>
                        </div>
                        <span className={`dbadge d${c.drop}`}>{c.drop}</span>
                      </div>
                    ))}
                    {!data.criticas.length && <div className="s-empty">✓ Nenhuma issue crítica!</div>}
                  </div>
                </div>
              </div>
            </>}

            {/* ══════════════════════════════════════
                RISCOS
            ══════════════════════════════════════ */}
            {aba === 'riscos' && <>
              <div className="g4">
                <KpiCard label="Total de Riscos"  value={data.summary.totalRiscos}    color="#64748B" bgColor="#F1F5F9"/>
                <KpiCard label="Abertos"          value={data.summary.riscosAbertos}  color="#DC2626" bgColor="#FEE2E2" sub={`${data.summary.riscosCriticos} críticos`}/>
                <KpiCard label="Em Mitigação"     value={data.summary.emMitigacao}    color="#D97706" bgColor="#FEF3C7"/>
                <KpiCard label="Mitigados"        value={data.summary.mitigados}      color="#16A34A" bgColor="#DCFCE7" sub="encerrados"/>
              </div>

              {/* Matriz Probabilidade x Impacto */}
              <div className="g12">
                <div className="card">
                  <div className="card-head"><div className="card-title">Matriz Probabilidade × Impacto</div><div className="card-sub">Riscos ativos</div></div>
                  <div style={{padding:'16px 18px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'60px repeat(3,1fr)',gap:4}}>
                      <div/>
                      {['Baixo','Médio','Alto'].map(i => (
                        <div key={i} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'#64748B',padding:'4px'}}>{i}</div>
                      ))}
                      {(['Alta','Média','Baixa'] as const).map(prob => (
                        <div key={`row-${prob}`} style={{display:'contents'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8,fontSize:10,fontWeight:600,color:'#64748B'}}>{prob}</div>
                          {(['Baixo','Médio','Alto'] as const).map(imp => {
                            const style = matrizCor(prob, imp);
                            const count = riscosFiltrados.filter(r =>
                              r.probabilidade === prob && r.impacto === imp &&
                              r.status !== 'Mitigado' && r.status !== 'Encerrado'
                            ).length;
                            return (
                              <div key={`${prob}-${imp}`} className="matriz-cell" style={{background:style.bg,color:style.color,border:`1px solid ${style.color}22`}}>
                                {count > 0 && <span style={{fontSize:20,fontWeight:700,fontFamily:'monospace'}}>{count}</span>}
                                {count > 0 && <span style={{fontSize:8}}>{style.label}</span>}
                                {count === 0 && <span style={{opacity:.3,fontSize:14}}>—</span>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap'}}>
                      {[['#DCFCE7','#166534','Baixo'],['#FEF9C3','#854D0E','Médio'],['#FFEDD5','#9A3412','Alto'],['#FEE2E2','#991B1B','Crítico']].map(([bg,c,l])=>(
                        <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#64748B'}}>
                          <div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${c}33`}}/>
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><div className="card-title">Score por Módulo</div></div>
                  <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}}>
                    {data.matrizModulos.map(m => (
                      <div key={m.modulo} style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:110,fontSize:12,fontWeight:500,flexShrink:0}}>{m.modulo}</div>
                        <div style={{flex:1}}><Bar value={m.score} color={scoreCor(m.score)} height={8}/></div>
                        <span style={{fontSize:12,fontWeight:700,color:scoreCor(m.score),fontFamily:'monospace',width:28,textAlign:'right'}}>{m.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabela de riscos */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Mapeamento de Riscos</div>
                  <div className="filter-row">
                    {DROPS_LIST.map(d=><button key={d} className={`fbtn${dropFiltro===d?' active':''}`} onClick={()=>setDropFiltro(d)}>{d}</button>)}
                    <div style={{width:1,height:20,background:'#E2E8F0'}}/>
                    {MODULOS_LIST.map(m=><button key={m} className={`fbtn${moduloFiltro===m?' active':''}`} onClick={()=>setModuloFiltro(m)}>{m}</button>)}
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>ID</th><th>Risco</th><th>Módulo</th><th>DROP</th>
                      <th>Parceiro</th>
                      <th className="c">Prob.</th><th className="c">Impacto</th>
                      <th>Ciclo de Vida</th>
                      <th>Responsável</th>
                      <th>Prazo</th><th>Mitigação</th>
                    </tr></thead>
                    <tbody>
                      {riscosFiltrados.map(r => {
                        const mc = matrizCor(r.probabilidade, r.impacto);
                        const ss = STATUS_RISCO_STYLE[r.status] ?? { bg:'#F1F5F9', color:'#475569' };
                        return (
                          <tr key={r.key}>
                            <td><a href={r.url} target="_blank" rel="noreferrer" className="ikey">{r.key}</a></td>
                            <td><span className="isum" style={{maxWidth:200}} title={r.titulo}>{r.titulo}</span></td>
                            <td style={{fontSize:11,color:'#64748B',whiteSpace:'nowrap'}}>{r.modulo}</td>
                            <td><span className={`dbadge d${r.drop}`}>{r.drop}</span></td>
                            <td className="c"><span className="pill" style={{background:r.probabilidade==='Alta'?'#FEE2E2':r.probabilidade==='Média'?'#FEF3C7':'#DCFCE7',color:r.probabilidade==='Alta'?'#DC2626':r.probabilidade==='Média'?'#D97706':'#16A34A'}}>{r.probabilidade}</span></td>
                            <td className="c"><span className="pill" style={{background:mc.bg,color:mc.color}}>{r.impacto}</span></td>
                            <td className="c"><span className="pill" style={{background:ss.bg,color:ss.color}}>{r.status}</span></td>
                            <td><span style={{fontSize:9,fontWeight:600,background:'#F1F5F9',color:'#475569',padding:'2px 6px',borderRadius:4}}>{(r as any).parceiro??'—'}</span></td>
                            <td style={{fontSize:11,color:'#334155',whiteSpace:'nowrap'}}>{r.responsavel}</td>
                            <td style={{fontSize:10,color:'#64748B',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmt(r.prazo)}</td>
                            <td><span style={{fontSize:10,color:'#64748B',display:'block',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.mitigacao}>{r.mitigacao||'—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}

            {/* ══════════════════════════════════════
                MUDANÇAS
            ══════════════════════════════════════ */}
            {aba === 'mudancas' && <>
              <div className="g4">
                <KpiCard label="Total Mudanças"   value={data.summary.totalMudancas}    color="#64748B" bgColor="#F1F5F9"/>
                <KpiCard label="Em Análise"       value={data.summary.mudancasAnalise}  color="#D97706" bgColor="#FEF3C7" sub="aguardando"/>
                <KpiCard label="Aprovadas"        value={data.summary.mudancasAprovadas}color="#16A34A" bgColor="#DCFCE7" sub="liberadas"/>
                <KpiCard label="Implementadas"    value={data.summary.mudancasImpl}     color="#1B6EC2" bgColor="#DBEAFE" sub="entregues"/>
              </div>

              {/* Timeline por DROP */}
              <div className="card">
                <div className="card-head"><div className="card-title">Timeline de Mudanças por DROP</div></div>
                <div style={{padding:'16px 18px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                  {['D1','D2','D3','D4','D5'].map(drop => {
                    const mds = data.mudancas.filter(m => m.drop === drop);
                    return (
                      <div key={drop}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                          <span className={`dbadge d${drop}`} style={{fontSize:12,padding:'3px 10px'}}>{drop}</span>
                          <span style={{fontSize:10,color:'#64748B'}}>{mds.length} mudança{mds.length!==1?'s':''}</span>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {mds.length === 0 && <div style={{fontSize:11,color:'#94A3B8',fontStyle:'italic'}}>Sem mudanças</div>}
                          {mds.map(m => {
                            const ss = STATUS_MUD_STYLE[m.status] ?? { bg:'#F1F5F9', color:'#475569' };
                            return (
                              <div key={m.key} style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:8,padding:'8px 10px',borderLeft:`3px solid ${ss.color}`}}>
                                <div style={{fontSize:10,fontFamily:'monospace',fontWeight:600,color:'#1B6EC2',marginBottom:3}}>{m.key}</div>
                                <div style={{fontSize:11,color:'#0F172A',lineHeight:1.3,marginBottom:4}}>{m.titulo}</div>
                                <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
                                  <span className="pill" style={{background:ss.bg,color:ss.color,fontSize:9}}>{m.status}</span>
                                  <span className="pill" style={{background:m.impacto==='Alto'?'#FEE2E2':m.impacto==='Médio'?'#FEF3C7':'#DCFCE7',color:m.impacto==='Alto'?'#DC2626':m.impacto==='Médio'?'#D97706':'#16A34A',fontSize:9}}>{m.impacto}</span>
                                </div>
                                <div style={{fontSize:10,color:'#64748B',marginTop:4}}>{m.responsavel} · {fmt(m.prazo)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela detalhada */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Plano de Gestão de Mudanças</div>
                  <div className="filter-row">
                    {DROPS_LIST.map(d=><button key={d} className={`fbtn${dropFiltro===d?' active':''}`} onClick={()=>setDropFiltro(d)}>{d}</button>)}
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>ID</th><th>Mudança</th><th>Módulo</th><th>DROP</th>
                      <th>Parceiro</th>
                      <th className="c">Status</th><th className="c">Impacto</th>
                      <th>Responsável</th><th>Prazo</th><th>Descrição</th>
                    </tr></thead>
                    <tbody>
                      {mudancasFiltradas.map(m => {
                        const ss = STATUS_MUD_STYLE[m.status] ?? { bg:'#F1F5F9', color:'#475569' };
                        return (
                          <tr key={m.key}>
                            <td><a href={m.url} target="_blank" rel="noreferrer" className="ikey">{m.key}</a></td>
                            <td><span className="isum" style={{maxWidth:220}} title={m.titulo}>{m.titulo}</span></td>
                            <td style={{fontSize:11,color:'#64748B'}}>{m.modulo}</td>
                            <td><span className={`dbadge d${m.drop}`}>{m.drop}</span></td>
                            <td className="c"><span className="pill" style={{background:ss.bg,color:ss.color}}>{m.status}</span></td>
                            <td className="c"><span className="pill" style={{background:m.impacto==='Alto'?'#FEE2E2':m.impacto==='Médio'?'#FEF3C7':'#DCFCE7',color:m.impacto==='Alto'?'#DC2626':m.impacto==='Médio'?'#D97706':'#16A34A'}}>{m.impacto}</span></td>
                            <td><span style={{fontSize:9,fontWeight:600,background:'#F1F5F9',color:'#475569',padding:'2px 6px',borderRadius:4}}>{(m as any).parceiro??'—'}</span></td>
                            <td style={{fontSize:11,whiteSpace:'nowrap'}}>{m.responsavel}</td>
                            <td style={{fontSize:10,color:'#64748B',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmt(m.prazo)}</td>
                            <td><span style={{fontSize:10,color:'#64748B',display:'block',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={m.descricao}>{m.descricao||'—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}

            {/* ══════════════════════════════════════
                PARCEIROS
            ══════════════════════════════════════ */}
            {aba === 'parceiros' && (() => {
              const resumoParceiros: any[] = (data as any)?.resumoParceiros ?? [];
              const totalNaoAvaliados = resumoParceiros.reduce((s:number,p:any)=>s+p.naoAvaliados,0);
              const totalEmAvaliacao  = resumoParceiros.reduce((s:number,p:any)=>s+p.emAvaliacao,0);
              const totalAvaliados    = resumoParceiros.reduce((s:number,p:any)=>s+p.avaliados,0);

              const CORES: Record<string,{cor:string;bg:string;sigla:string}> = {
                'Tailwind':    {cor:'#1B6EC2',bg:'#DBEAFE',sigla:'TW'},
                'Corebanx':   {cor:'#7C3AED',bg:'#F3E8FF',sigla:'CB'},
                'ITSS':        {cor:'#0E7490',bg:'#CFFAFE',sigla:'ITSS'},
                'Neurotech':   {cor:'#D97706',bg:'#FEF3C7',sigla:'NT'},
                'Temenos':     {cor:'#16A34A',bg:'#DCFCE7',sigla:'TEM'},
                'Tecban':      {cor:'#94A3B8',bg:'#F1F5F9',sigla:'TCB'},
                'ASAPTech':    {cor:'#DC2626',bg:'#FEE2E2',sigla:'AT'},
                'Deskcorp':    {cor:'#003087',bg:'#EFF6FF',sigla:'DC'},
                'Não definido':{cor:'#CBD5E1',bg:'#F8FAFC',sigla:'?'},
              };

              return (
                <>
                  {/* KPIs de avaliação */}
                  <div className="g4">
                    <KpiCard label="Não Avaliados"  value={totalNaoAvaliados} color="#DC2626" bgColor="#FEE2E2" sub="sem responsável"/>
                    <KpiCard label="Em Avaliação"   value={totalEmAvaliacao}  color="#D97706" bgColor="#FEF3C7" sub="em andamento"/>
                    <KpiCard label="Avaliados"       value={totalAvaliados}   color="#16A34A" bgColor="#DCFCE7" sub="concluídos"/>
                    <KpiCard label="Parceiros ativos"value={resumoParceiros.filter((p:any)=>p.nome!=='Não definido').length} color="#1B6EC2" bgColor="#DBEAFE"/>
                  </div>

                  {/* Barra de progresso geral de avaliação */}
                  <div className="card">
                    <div className="card-head">
                      <div className="card-title">Status de Avaliação de Riscos e Mudanças por Parceiro</div>
                      <div className="card-sub">{totalAvaliados} avaliados · {totalEmAvaliacao} em avaliação · {totalNaoAvaliados} não avaliados</div>
                    </div>
                    <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:12}}>
                      {resumoParceiros.map((p:any) => {
                        const c = CORES[p.nome] ?? CORES['Não definido'];
                        const pctAval = p.total > 0 ? Math.round((p.avaliados/p.total)*100) : 0;
                        const pctEmAval = p.total > 0 ? Math.round((p.emAvaliacao/p.total)*100) : 0;
                        return (
                          <div key={p.nome} style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:36,height:36,borderRadius:8,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:c.cor,fontSize:10,flexShrink:0}}>{c.sigla}</div>
                            <div style={{width:120,flexShrink:0}}>
                              <div style={{fontSize:12,fontWeight:600,color:'#0F172A'}}>{p.nome}</div>
                              <div style={{fontSize:10,color:'#64748B'}}>{p.total} itens</div>
                            </div>
                            <div style={{flex:1,display:'flex',height:20,borderRadius:4,overflow:'hidden',gap:1}}>
                              {p.avaliados>0&&<div style={{width:`${pctAval}%`,background:'#16A34A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',minWidth:p.avaliados>0?20:0}}>{pctAval>15?`${pctAval}%`:''}</div>}
                              {p.emAvaliacao>0&&<div style={{width:`${pctEmAval}%`,background:'#D97706',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',minWidth:p.emAvaliacao>0?20:0}}>{pctEmAval>15?`${pctEmAval}%`:''}</div>}
                              {p.naoAvaliados>0&&<div style={{flex:1,background:'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#DC2626'}}>{p.naoAvaliados} s/ aval.</div>}
                            </div>
                            <div style={{display:'flex',gap:6,flexShrink:0}}>
                              <span style={{fontSize:10,background:'#DCFCE7',color:'#16A34A',padding:'2px 6px',borderRadius:4,fontWeight:600}}>✓ {p.avaliados}</span>
                              <span style={{fontSize:10,background:'#FEF3C7',color:'#D97706',padding:'2px 6px',borderRadius:4,fontWeight:600}}>⟳ {p.emAvaliacao}</span>
                              <span style={{fontSize:10,background:'#FEE2E2',color:'#DC2626',padding:'2px 6px',borderRadius:4,fontWeight:600}}>○ {p.naoAvaliados}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{padding:'10px 18px',borderTop:'1px solid #F1F5F9',display:'flex',gap:16}}>
                      {[['#16A34A','#DCFCE7','✓ Avaliado'],['#D97706','#FEF3C7','⟳ Em Avaliação'],['#DC2626','#FEE2E2','○ Não Avaliado']].map(([c,bg,l])=>(
                        <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                          <div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${c}44`}}/>
                          <span style={{color:'#64748B'}}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabela detalhada de avaliação */}
                  <div className="card">
                    <div className="card-head"><div className="card-title">Detalhamento por Parceiro</div></div>
                    <div style={{overflowX:'auto'}}>
                      <table className="tbl">
                        <thead><tr>
                          <th>Parceiro</th>
                          <th className="c">Riscos</th>
                          <th className="c">Mudanças</th>
                          <th className="c">Total</th>
                          <th className="c">✓ Avaliados</th>
                          <th className="c">⟳ Em Avaliação</th>
                          <th className="c">○ Não Avaliados</th>
                          <th>% Avaliado</th>
                          <th>DROPs</th>
                        </tr></thead>
                        <tbody>
                          {resumoParceiros.map((p:any) => {
                            const c = CORES[p.nome] ?? CORES['Não definido'];
                            return (
                              <tr key={p.nome} style={p.naoAvaliados>0&&p.nome!=='Não definido'?{background:'#FFFBEB'}:{}}>
                                <td>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{width:28,height:28,borderRadius:6,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:c.cor,fontSize:10,flexShrink:0}}>{c.sigla}</div>
                                    <span style={{fontWeight:600,color:'#0F172A'}}>{p.nome}</span>
                                  </div>
                                </td>
                                <td className="c"><span className="pill" style={{background:'#FEE2E2',color:'#DC2626'}}>{p.totalRiscos}</span></td>
                                <td className="c"><span className="pill" style={{background:'#F3E8FF',color:'#7C3AED'}}>{p.totalMudancas}</span></td>
                                <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{p.total}</td>
                                <td className="c"><span className="pill" style={{background:'#DCFCE7',color:'#16A34A'}}>{p.avaliados}</span></td>
                                <td className="c"><span className="pill" style={{background:'#FEF3C7',color:'#D97706'}}>{p.emAvaliacao}</span></td>
                                <td className="c">
                                  <span className="pill" style={{background:p.naoAvaliados>0?'#FEE2E2':'#DCFCE7',color:p.naoAvaliados>0?'#DC2626':'#16A34A'}}>
                                    {p.naoAvaliados > 0 ? `⚠ ${p.naoAvaliados}` : '✓ 0'}
                                  </span>
                                </td>
                                <td style={{minWidth:120}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{flex:1,background:'#F1F5F9',borderRadius:4,height:8,overflow:'hidden'}}>
                                      <div style={{height:'100%',width:`${p.pctAvaliado}%`,background:p.pctAvaliado>=80?'#16A34A':p.pctAvaliado>=50?'#D97706':'#DC2626',borderRadius:4}}/>
                                    </div>
                                    <span style={{fontSize:11,fontWeight:700,color:p.pctAvaliado>=80?'#16A34A':p.pctAvaliado>=50?'#D97706':'#DC2626',fontFamily:'monospace',width:32}}>{p.pctAvaliado}%</span>
                                  </div>
                                </td>
                                <td><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{(p.drops??[]).map((d:string)=><span key={d} className={`dbadge d${d}`}>{d}</span>)}</div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Riscos NÃO avaliados */}
                  {totalNaoAvaliados > 0 && (
                    <div className="card">
                      <div className="card-head">
                        <div className="card-title">⚠ Riscos e Mudanças Não Avaliados</div>
                        <div className="card-sub">{totalNaoAvaliados} itens sem responsável ou avaliação formal</div>
                      </div>
                      <div style={{overflowX:'auto'}}>
                        <table className="tbl">
                          <thead><tr>
                            <th>ID</th><th>Título</th><th>Tipo</th><th>DROP</th>
                            <th>Parceiro</th><th>Status Jira</th><th>Responsável</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ...(data?.riscos??[]).filter((r:any)=>r.avaliacaoStatus==='Não Avaliado').map((r:any)=>({...r,tipo:'Risco'})),
                              ...(data?.mudancas??[]).filter((m:any)=>m.avaliacaoStatus==='Não Avaliado').map((m:any)=>({...m,tipo:'Mudança'})),
                            ].slice(0,30).map((i:any) => (
                              <tr key={i.key} style={{background:'#FFFBEB'}}>
                                <td><a href={i.url} target="_blank" rel="noreferrer" className="ikey">{i.key} ↗</a></td>
                                <td><span className="isum" style={{maxWidth:260}} title={i.titulo}>{i.titulo}</span></td>
                                <td><span className="pill" style={{background:i.tipo==='Risco'?'#FEE2E2':'#F3E8FF',color:i.tipo==='Risco'?'#DC2626':'#7C3AED'}}>{i.tipo}</span></td>
                                <td><span className={`dbadge d${i.drop}`}>{i.drop}</span></td>
                                <td><span style={{fontSize:10,background:'#F1F5F9',color:'#475569',padding:'2px 6px',borderRadius:4,fontWeight:600}}>{i.parceiro}</span></td>
                                <td style={{fontSize:11,color:'#64748B'}}>{i.statusJira}</td>
                                <td style={{fontSize:11,color:i.responsavel==='Não atribuído'?'#DC2626':'#334155',fontWeight:i.responsavel==='Não atribuído'?600:400}}>
                                  {i.responsavel==='Não atribuído'?'⚠ Sem responsável':i.responsavel}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ══════════════════════════════════════
                ISSUES CRÍTICAS JIRA
                        {/* ══════════════════════════════════════
                ISSUES CRÍTICAS JIRA
            ══════════════════════════════════════ */}
            {aba === 'jira' && <>
              <div className="g3">
                <KpiCard label="Issues Críticas"  value={data.criticas.filter(c=>c.prioridade==='Crítico').length} color="#DC2626" bgColor="#FEE2E2" sub="nível crítico"/>
                <KpiCard label="Nível Alto"        value={data.criticas.filter(c=>c.prioridade==='Alto').length}   color="#D97706" bgColor="#FEF3C7" sub="atenção"/>
                <KpiCard label="Total Mapeadas"   value={data.criticas.length}                                     color="#64748B" bgColor="#F1F5F9"/>
              </div>

              {/* Por DROP */}
              <div className="g5">
                {['D1','D2','D3','D4','D5'].map(drop => {
                  const issues = data.criticas.filter(c => c.drop === drop);
                  const criticas = issues.filter(c => c.prioridade === 'Crítico');
                  return (
                    <div key={drop} style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:12,padding:'14px 16px',borderTop:`3px solid ${criticas.length>0?'#DC2626':'#E2E8F0'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <span className={`dbadge d${drop}`} style={{fontSize:12,padding:'3px 10px'}}>{drop}</span>
                        <span style={{fontSize:20,fontWeight:700,fontFamily:'monospace',color:issues.length>0?'#DC2626':'#94A3B8'}}>{issues.length}</span>
                      </div>
                      {issues.length === 0 ? (
                        <div style={{fontSize:11,color:'#94A3B8',textAlign:'center',padding:'10px 0'}}>✓ Sem issues críticas</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {issues.map(i => (
                            <div key={i.key} style={{background:'#F8FAFC',borderRadius:6,padding:'6px 8px',borderLeft:`2px solid ${i.prioridade==='Crítico'?'#DC2626':'#D97706'}`}}>
                              <a href={i.url} target="_blank" rel="noreferrer" className="ikey" style={{fontSize:10}}>{i.key}</a>
                              <div style={{fontSize:10,color:'#334155',marginTop:2,lineHeight:1.3}}>{i.titulo}</div>
                              <div style={{fontSize:9,color:'#64748B',marginTop:3}}>{i.responsavel}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tabela completa */}
              <div className="card">
                <div className="card-head"><div className="card-title">Issues Críticas, Bloqueadores e Dependências — MDB</div></div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>Issue</th><th>Título</th><th className="c">Prioridade</th>
                      <th>Status</th><th>Responsável</th><th>DROP</th><th>Labels</th>
                    </tr></thead>
                    <tbody>
                      {data.criticas.map(c => (
                        <tr key={c.key}>
                          <td><a href={c.url} target="_blank" rel="noreferrer" className="ikey">{c.key} ↗</a></td>
                          <td><span className="isum" title={c.titulo}>{c.titulo}</span></td>
                          <td className="c">
                            <span className="pill" style={{background:c.prioridade==='Crítico'?'#FEE2E2':c.prioridade==='Alto'?'#FEF3C7':'#F1F5F9',color:c.prioridade==='Crítico'?'#DC2626':c.prioridade==='Alto'?'#D97706':'#64748B'}}>{c.prioridade}</span>
                          </td>
                          <td><span className="pill" style={{background:'#F1F5F9',color:'#475569'}}>{c.status}</span></td>
                          <td style={{fontSize:11,color:'#334155'}}>{c.responsavel}</td>
                          <td><span className={`dbadge d${c.drop}`}>{c.drop}</span></td>
                          <td><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{c.labels.map(l=><span key={l} style={{fontSize:9,background:'#F1F5F9',color:'#64748B',padding:'1px 5px',borderRadius:4}}>{l}</span>)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}

            {/* ══════════════════════════════════════
                AUDITORIA DE RISCOS
            ══════════════════════════════════════ */}
            {aba === 'auditoria' && (
              <>
                <div className="g4">
                  <KpiCard label="Realizadas"  value={AUDITORIA_MENSAL.filter(a=>a.status==='Realizada').length}  color="#16A34A" bgColor="#DCFCE7" sub="em 2026"/>
                  <KpiCard label="Agendadas"   value={AUDITORIA_MENSAL.filter(a=>a.status==='Agendada').length}   color="#1B6EC2" bgColor="#DBEAFE" sub="próximas"/>
                  <KpiCard label="Parceiros"   value={5}  color="#7C3AED" bgColor="#F3E8FF" sub="por sessão"/>
                  <KpiCard label="Próxima"     value={'22/04'} color="#D97706" bgColor="#FEF3C7" sub="Abr 2026"/>
                </div>

                {/* Ciclo de Vida - Legenda */}
                <div className="card">
                  <div className="card-head"><div className="card-title">Ciclo de Vida dos Riscos</div></div>
                  <div style={{padding:'16px 18px',display:'flex',gap:8,flexWrap:'wrap'}}>
                    {CICLO_VIDA.map((c,i) => {
                      const st = CICLO_STYLE[c];
                      const qtd = (data?.riscos??[]).filter((r:any)=>(r.cicloVida??'Identificado')===c).length;
                      return (
                        <div key={c} style={{background:st.bg,border:`1px solid ${st.color}33`,borderRadius:8,padding:'12px 16px',textAlign:'center',minWidth:130}}>
                          <div style={{fontSize:20,marginBottom:4}}>{st.icon}</div>
                          <div style={{fontSize:11,fontWeight:700,color:st.color}}>{c}</div>
                          <div style={{fontSize:22,fontWeight:800,fontFamily:'monospace',color:st.color,marginTop:4}}>{qtd}</div>
                          <div style={{fontSize:9,color:'#94A3B8'}}>riscos</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{padding:'12px 18px',borderTop:'1px solid #F1F5F9',fontSize:11,color:'#64748B'}}>
                    💡 Para atualizar o ciclo de vida de um risco, vá até a aba <strong>⚠ Riscos</strong> e use o seletor na coluna "Ciclo de Vida" — a alteração é salva automaticamente no Jira.
                  </div>
                </div>

                {/* Cronograma mensal */}
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Cronograma Mensal de Auditoria de Riscos 2026</div>
                    <div className="card-sub">Sessão mensal com todos os parceiros — última quarta-feira do mês</div>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table className="tbl">
                      <thead><tr>
                        <th>Mês</th><th>Data</th><th>DROPs</th><th>Parceiros</th>
                        <th className="c">Status</th><th>ATA</th>
                      </tr></thead>
                      <tbody>
                        {AUDITORIA_MENSAL.map(a => {
                          const isProxima = a.status==='Agendada' && new Date(a.data) >= new Date();
                          const isPast    = new Date(a.data) < new Date();
                          return (
                            <tr key={a.mes} style={isProxima&&AUDITORIA_MENSAL.filter(x=>x.status==='Agendada'&&new Date(x.data)>=new Date()).indexOf(a)===0?{background:'#FFFBEB',fontWeight:600}:{}}>
                              <td style={{fontWeight:700,color:'#0F172A'}}>{a.mes}</td>
                              <td style={{fontFamily:'monospace',fontSize:12}}>{new Date(a.data).toLocaleDateString('pt-BR')}</td>
                              <td><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{a.drops.map(d=><span key={d} className={`dbadge d${d}`}>{d}</span>)}</div></td>
                              <td style={{fontSize:10,color:'#475569'}}>{a.parceiros.join(' · ')}</td>
                              <td className="c">
                                <span style={{
                                  fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:4,
                                  background:a.status==='Realizada'?'#DCFCE7':isProxima&&!isPast?'#FEF3C7':'#F1F5F9',
                                  color:a.status==='Realizada'?'#15803D':isProxima&&!isPast?'#92400E':'#94A3B8'
                                }}>
                                  {a.status==='Realizada'?'✓ Realizada':isProxima&&AUDITORIA_MENSAL.filter(x=>x.status==='Agendada'&&new Date(x.data)>=new Date()).indexOf(a)===0?'⏰ Próxima':'📅 Agendada'}
                                </span>
                              </td>
                              <td>
                                {a.ata && a.ata!=='#' ? <a href={a.ata} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#1B6EC2'}}>Ver ATA ↗</a> : <span style={{fontSize:11,color:'#CBD5E1'}}>—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Riscos por ciclo de vida - tabela */}
                <div className="card">
                  <div className="card-head"><div className="card-title">Riscos por Fase do Ciclo de Vida</div></div>
                  <div style={{overflowX:'auto'}}>
                    <table className="tbl">
                      <thead><tr>
                        <th>ID</th><th>Risco</th><th>DROP</th><th>Ciclo de Vida</th><th>Responsável</th><th>Última Atualização</th>
                      </tr></thead>
                      <tbody>
                        {[...CICLO_VIDA].reverse().flatMap(ciclo =>
                          (data?.riscos??[])
                            .filter((r:any)=>(r.cicloVida??'Identificado')===ciclo)
                            .slice(0,5)
                            .map((r:any) => {
                              const st = CICLO_STYLE[ciclo as CicloVida];
                              return (
                                <tr key={r.key}>
                                  <td><a href={r.url} target="_blank" rel="noreferrer" className="ikey">{r.key} ↗</a></td>
                                  <td><span className="isum" style={{maxWidth:300}} title={r.titulo}>{r.titulo}</span></td>
                                  <td><span className={`dbadge d${r.drop}`}>{r.drop}</span></td>
                                  <td>
                                    <span style={{background:st.bg,color:st.color,padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700}}>
                                      {st.icon} {ciclo}
                                    </span>
                                  </td>
                                  <td style={{fontSize:11}}>{r.responsavel}</td>
                                  <td style={{fontSize:10,color:'#94A3B8'}}>{r.atualizado?new Date(r.atualizado).toLocaleDateString('pt-BR'):'-'}</td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════
                COMPLIANCE
            ══════════════════════════════════════ */}
            {aba === 'compliance' && <>
              {/* Seletor de DROP */}
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:12,color:'#64748B',fontWeight:500}}>Validar DROP:</span>
                {['D1','D2','D3','D4','D5'].map(d => (
                  <button key={d} className={`fbtn${complianceDrop===d?' active':''}`} onClick={()=>setComplianceDrop(d)} style={{fontSize:12,fontWeight:600}}>{d}</button>
                ))}
              </div>

              {/* KPIs do DROP selecionado */}
              {(() => {
                const checks = COMPLIANCE_CHECKS[complianceDrop] ?? [];
                const ok  = checks.filter(c=>c.status==='ok').length;
                const alerta  = checks.filter(c=>c.status==='alerta').length;
                const pendente = checks.filter(c=>c.status==='pendente').length;
                const obrig = checks.filter(c=>c.obrigatorio);
                const obrigOk = obrig.filter(c=>c.status==='ok').length;
                return (
                  <>
                    <div className="g4">
                      <KpiCard label={`Checklist ${complianceDrop}`} value={`${ok}/${checks.length}`} color="#16A34A" bgColor="#DCFCE7" sub="validações ok"/>
                      <KpiCard label="Alertas"   value={alerta}  color="#D97706" bgColor="#FEF3C7" sub="verificar"/>
                      <KpiCard label="Pendentes" value={pendente} color="#DC2626" bgColor="#FEE2E2" sub="ação necessária"/>
                      <KpiCard label="Obrigatórios" value={`${obrigOk}/${obrig.length}`} color="#1B6EC2" bgColor="#DBEAFE" sub="concluídos"/>
                    </div>

                    <div className="card">
                      <div className="card-head">
                        <div className="card-title">✓ Checklist de Compliance — {complianceDrop}</div>
                        <div className="card-sub">Validações obrigatórias para entrega do DROP</div>
                      </div>
                      <div>
                        {checks.map((c,i) => {
                          const st = COMPLIANCE_STYLE[c.status];
                          return (
                            <div key={i} className="comp-row">
                              <div style={{width:28,height:28,borderRadius:'50%',background:st.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:st.color,flexShrink:0}}>{st.icon}</div>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                                  <span style={{fontSize:12,fontWeight:600,color:'#0F172A'}}>{c.titulo}</span>
                                  {c.obrigatorio && <span style={{fontSize:9,fontWeight:700,background:'#FEE2E2',color:'#DC2626',padding:'1px 5px',borderRadius:4}}>OBRIGATÓRIO</span>}
                                </div>
                                <div style={{fontSize:11,color:'#64748B'}}>{c.descricao}</div>
                              </div>
                              <span className="pill" style={{background:st.bg,color:st.color,flexShrink:0}}>{c.status==='ok'?'Concluído':c.status==='alerta'?'Alerta':'Pendente'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumo geral todos os drops */}
                    <div className="card">
                      <div className="card-head"><div className="card-title">Resumo de Compliance por DROP</div></div>
                      <div style={{overflowX:'auto'}}>
                        <table className="tbl">
                          <thead><tr>
                            <th>DROP</th><th className="c">Total</th><th className="c">✓ OK</th>
                            <th className="c">⚠ Alerta</th><th className="c">○ Pendente</th>
                            <th>Progresso</th><th className="c">%</th>
                          </tr></thead>
                          <tbody>
                            {Object.entries(COMPLIANCE_CHECKS).map(([drop, cks]) => {
                              const okC = cks.filter(c=>c.status==='ok').length;
                              const p   = Math.round((okC/cks.length)*100);
                              return (
                                <tr key={drop} style={drop===complianceDrop?{background:'#F0F9FF'}:{}}>
                                  <td><span className={`dbadge d${drop}`} style={{fontSize:12,padding:'3px 10px'}}>{drop}</span></td>
                                  <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{cks.length}</td>
                                  <td className="c"><span className="pill" style={{background:'#DCFCE7',color:'#16A34A'}}>{okC}</span></td>
                                  <td className="c"><span className="pill" style={{background:'#FEF3C7',color:'#D97706'}}>{cks.filter(c=>c.status==='alerta').length}</span></td>
                                  <td className="c"><span className="pill" style={{background:'#FEE2E2',color:'#DC2626'}}>{cks.filter(c=>c.status==='pendente').length}</span></td>
                                  <td style={{minWidth:140}}><Bar value={p} color={p>=80?'#16A34A':p>=50?'#D97706':'#DC2626'} height={8}/></td>
                                  <td className="c" style={{fontFamily:'monospace',fontWeight:700,color:p>=80?'#16A34A':p>=50?'#D97706':'#DC2626'}}>{p}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>}


            {/* ══════════════════════════════════════
                AUDITORIA LEGAL
            ══════════════════════════════════════ */}
            {aba === 'auditoria-legal' && (() => {
              const normas = [
                { bloco:'Cibersegurança', nome:'Res. CMN 5.274/2025 + Res. BCB 538/2025', orgao:'Banco Central', status:'vencido', prazo:'VENCIDO 01/03/2026', desc:'14 controles mínimos para RSFN/PIX/STR: MFA, criptografia, isolamento em nuvem, pentest anual, trilhas de auditoria. Prazo venceu em 01/03/2026.', tags:['MFA','Pentest','Criptografia','RSFN'], pdrs:['PDR-21','PDR-76','PDR-112'] },
                { bloco:'PSTIs', nome:'Res. BCB 498/2025 (alt. 547/2026)', orgao:'Banco Central', status:'atencao', prazo:'Adequação até mai/2026', desc:'Credenciamento obrigatório de fornecedores de TI. Temenos, Tailwind, Corebanx e Neurotech precisam de due diligence formal com cláusulas de auditabilidade.', tags:['Temenos','Tailwind','Corebanx'], pdrs:['PDR-85','PDR-72'] },
                { bloco:'PIX / SPB', nome:'Res. BCB 1/2020 + Reg. Pix + BCB 103/2021', orgao:'Banco Central', status:'critico', prazo:'Vigente — operação contínua', desc:'SLA 10s, disponibilidade 24/7, DICT, MED, antifraude obrigatório. 60+ MDB bloqueados por APIs Corebanx não entregues.', tags:['PIX','SPI','DICT','MED','SLA'], pdrs:['PDR-48','PDR-78','PDR-62'] },
                { bloco:'LGPD', nome:'Lei 13.709/2018 + Res. CD/ANPD 15/2024', orgao:'ANPD', status:'critico', prazo:'Vigente — fiscalização ativa', desc:'DPO, DPIA, consentimento, notificação em 72h. Dados reais em QA/UAT (PDR-37) = violação ativa. Privacy by design obrigatório.', tags:['DPO','DPIA','Consentimento','Incidente'], pdrs:['PDR-37','PDR-13','PDR-63'] },
                { bloco:'PLD/FT', nome:'Circ. BCB 3.978/2020 + Lei 9.613/1998', orgao:'COAF / BACEN', status:'critico', prazo:'Vigente — aplicação contínua', desc:'KYC reforçado: biometria, prova de vida, listas PEP e sanções ONU. Monitoramento transacional e comunicação ao COAF.', tags:['KYC','COAF','AML','PEP'], pdrs:['PDR-10','PDR-65','PDR-83'] },
                { bloco:'PCI-DSS', nome:'PCI-DSS v4.0', orgao:'PCI Security Council', status:'critico', prazo:'Bloqueador go-live D4', desc:'Certificação obrigatória para Visa Electron/ATM D4 via ISO 8583/TecBan. PDR-36 registra não conformidade. Bloqueador direto do Drop D4.', tags:['Cartão','ATM','ISO 8583'], pdrs:['PDR-36'] },
                { bloco:'Governança', nome:'Res. CMN 4.557/2017 — GIR', orgao:'CMN / BACEN', status:'atencao', prazo:'Vigente', desc:'CRO obrigatório. Todo produto digital precisa de gate de aprovação com evidências documentadas antes do go-live.', tags:['CRO','GIR','Gate go-live'], pdrs:['PDR-86','PDR-44'] },
                { bloco:'Open Finance', nome:'Res. Conjunta CMN/BCB 1/2020', orgao:'Banco Central', status:'atencao', prazo:'Participação obrigatória', desc:'BASA é participante obrigatório. APIs padronizadas, consentimento granular, SLAs de disponibilidade, portabilidade com TPPs.', tags:['APIs','Consentimento','TPP'], pdrs:['PDR-76'] },
                { bloco:'Estatais / FNO', nome:'Lei 13.303/2016 + Lei 7.827/1989', orgao:'TCU / CGU', status:'atencao', prazo:'Vigente', desc:'Contratações precisam de licitação ou dispensa fundamentada. FNO: digitalização do Pronaf exige formalização integral do MCR para evitar glosa TCU.', tags:['TCU','FNO','Pronaf','MCR'], pdrs:['PDR-85','PDR-68'] },
              ];
              const matriz = [
                { bloco:'Cibersegurança', norma:'Res. BCB 538/2025', risco:'14 controles RSFN/PIX não atendidos — prazo vencido 01/03/2026', pdrs:'PDR-21, PDR-76', impacto:'Multa BACEN + suspensão PIX', crit:'CRÍTICA', cor:'#FEE2E2', tc:'#DC2626' },
                { bloco:'PLD/FT', norma:'Circ. 3.978/2020', risco:'KYC frágil, biometria não formalizada, listas incompletas', pdrs:'PDR-65, PDR-83', impacto:'PAS BACEN + COAF', crit:'CRÍTICA', cor:'#FEE2E2', tc:'#DC2626' },
                { bloco:'LGPD', norma:'Lei 13.709/2018', risco:'Dados reais em QA/UAT sem mascaramento (violação ativa)', pdrs:'PDR-37, PDR-13', impacto:'Até 2% faturamento — ANPD', crit:'CRÍTICA', cor:'#FEE2E2', tc:'#DC2626' },
                { bloco:'PIX / SPB', norma:'Res. BCB 1/2020', risco:'60+ MDB bloqueados, APIs não entregues, SLA não validado', pdrs:'PDR-48, PDR-78', impacto:'Sanção BACEN + perda clientes', crit:'CRÍTICA', cor:'#FEE2E2', tc:'#DC2626' },
                { bloco:'PCI-DSS', norma:'PCI-DSS v4.0', risco:'Ambiente não certificado para Visa Electron / ATM D4', pdrs:'PDR-36', impacto:'Bloqueio go-live D4', crit:'CRÍTICA', cor:'#FEE2E2', tc:'#DC2626' },
                { bloco:'PSTIs', norma:'Res. BCB 498/2025', risco:'Fornecedores TI sem due diligence regulatória', pdrs:'PDR-85, PDR-72', impacto:'Auditoria BACEN', crit:'ALTA', cor:'#FEF3C7', tc:'#D97706' },
                { bloco:'Governança', norma:'Res. CMN 4.557/2017', risco:'Produtos sem gate de aprovação do CRO', pdrs:'PDR-44, PDR-86', impacto:'Descumprimento prudencial', crit:'ALTA', cor:'#FEF3C7', tc:'#D97706' },
                { bloco:'Estatais', norma:'Lei 13.303/2016', risco:'Contratos sem conformidade com regime de estatais', pdrs:'PDR-85', impacto:'Anulação TCU', crit:'ALTA', cor:'#FEF3C7', tc:'#D97706' },
                { bloco:'FNO / MCR', norma:'Lei 7.827/1989', risco:'Digitalização crédito rural sem preservar formalização MCR', pdrs:'PDR-68', impacto:'Glosa TCU + devolução FNO', crit:'MÉDIA-ALTA', cor:'#FED7AA', tc:'#C2410C' },
                { bloco:'Open Finance', norma:'Res. CMN/BCB 1/2020', risco:'APIs OF fora das especificações do ecossistema', pdrs:'PDR-76', impacto:'Sanção BACEN', crit:'MÉDIA', cor:'#FEF9C3', tc:'#A16207' },
              ];
              const prog = [
                { l:'Cibersegurança (BCB 538)', p:5, c:'#DC2626' },
                { l:'LGPD / ANPD', p:15, c:'#DC2626' },
                { l:'PIX / SPB', p:25, c:'#D97706' },
                { l:'PCI-DSS v4.0 (D4)', p:10, c:'#DC2626' },
                { l:'PSTIs (BCB 498/2025)', p:20, c:'#DC2626' },
                { l:'PLD/FT (KYC/COAF)', p:30, c:'#D97706' },
                { l:'Governança / GIR', p:40, c:'#D97706' },
                { l:'SISBAJUD / Judicial', p:45, c:'#D97706' },
                { l:'Open Finance', p:35, c:'#D97706' },
                { l:'Estatais / FNO / MCR', p:50, c:'#16A34A' },
              ];
              const sColor: Record<string,{bg:string,c:string,l:string}> = {
                vencido:  {bg:'#FEE2E2',c:'#DC2626',l:'VENCIDO'},
                critico:  {bg:'#FEE2E2',c:'#DC2626',l:'Crítico'},
                atencao:  {bg:'#FEF3C7',c:'#D97706',l:'Atenção'},
                adequado: {bg:'#DCFCE7',c:'#16A34A',l:'Adequado'},
              };
              return (
                <>
                  {/* Alertas */}
                  <div style={{background:'#FEE2E2',border:'1px solid #FCA5A5',borderRadius:8,padding:'10px 16px',fontSize:12,color:'#DC2626',marginBottom:8}}>
                    <strong>VENCIDO 01/03/2026</strong> — Res. CMN 5.274/2025 + Res. BCB 538/2025: 14 controles mínimos de cibersegurança para RSFN/PIX/STR. O BASA já opera em situação de não conformidade com risco de suspensão do acesso ao SPI.
                  </div>
                  <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 16px',fontSize:12,color:'#D97706',marginBottom:8}}>
                    <strong>PRAZO MAI/2026</strong> — Res. BCB 498/2025 (PSTIs): due diligence regulatória obrigatória para Temenos, Tailwind, Corebanx e Neurotech com cláusulas de auditabilidade e portabilidade de dados.
                  </div>
                  <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,padding:'10px 16px',fontSize:12,color:'#1D4ED8',marginBottom:16}}>
                    <strong>RISCO PATRIMONIAL</strong> — FNO/MCR: digitalização de crédito rural sem preservar formalização exigida gera risco de glosa pelo TCU e devolução de recursos ao Fundo Constitucional do Norte.
                  </div>

                  {/* Métricas */}
                  <div className="g4" style={{marginBottom:16}}>
                    <KpiCard label="Normas mapeadas"   value={28}      color="#1B6EC2" bgColor="#DBEAFE" sub="Federais + BACEN + ANPD"/>
                    <KpiCard label="Riscos com impacto legal" value={31} color="#DC2626" bgColor="#FEE2E2" sub="de 111 PDRs abertos"/>
                    <KpiCard label="Penalidade máx."   value="R$50M+"   color="#D97706" bgColor="#FEF3C7" sub="BACEN + ANPD + TCU"/>
                    <KpiCard label="Adequação geral"   value="26%"      color="#DC2626" bgColor="#FEE2E2" sub="7 de 28 normas atendidas"/>
                  </div>

                  {/* Normas */}
                  <div className="card">
                    <div className="card-head"><div className="card-title">Requisitos normativos — clique para expandir</div></div>
                    <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:10}}>
                      {normas.map((n,i) => {
                        const sc = sColor[n.status] ?? sColor.atencao;
                        return (
                          <details key={i} style={{border:'1px solid #E2E8F0',borderRadius:10,padding:'12px 14px',background:'#fff'}}>
                            <summary style={{cursor:'pointer',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'#0F172A',lineHeight:1.4}}>{n.nome}</div>
                                <div style={{fontSize:10,color:'#64748B',marginTop:2}}>{n.orgao} · {n.prazo}</div>
                              </div>
                              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:999,background:sc.bg,color:sc.c,flexShrink:0}}>{sc.l}</span>
                            </summary>
                            <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #F1F5F9',fontSize:11,color:'#475569',lineHeight:1.6}}>
                              {n.desc}
                              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                                {n.tags.map(t=><span key={t} style={{fontSize:10,padding:'2px 7px',borderRadius:999,background:'#F1F5F9',color:'#64748B'}}>{t}</span>)}
                              </div>
                              {n.pdrs.length>0 && <div style={{marginTop:6,fontSize:10,color:'#94A3B8'}}>PDRs: {n.pdrs.map(p=><span key={p} style={{fontFamily:'monospace',color:'#1B6EC2',marginRight:4}}>{p}</span>)}</div>}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matriz */}
                  <div className="card">
                    <div className="card-head"><div className="card-title">Matriz de riscos regulatórios</div></div>
                    <div style={{overflowX:'auto'}}>
                      <table className="tbl">
                        <thead><tr>
                          <th>Bloco</th><th>Norma</th><th>Risco no MVP-1</th><th>PDRs</th><th>Impacto</th><th className="c">Criticidade</th>
                        </tr></thead>
                        <tbody>
                          {matriz.map((m,i)=>(
                            <tr key={i}>
                              <td><span style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:'#F1F5F9',color:'#475569'}}>{m.bloco}</span></td>
                              <td style={{fontSize:10,color:'#64748B',maxWidth:160}}>{m.norma}</td>
                              <td style={{maxWidth:220,fontSize:11}}>{m.risco}</td>
                              <td style={{fontFamily:'monospace',fontSize:10,color:'#1B6EC2'}}>{m.pdrs}</td>
                              <td style={{fontSize:10,color:'#64748B'}}>{m.impacto}</td>
                              <td className="c"><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:m.cor,color:m.tc}}>{m.crit}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Progresso */}
                  <div className="card">
                    <div className="card-head"><div className="card-title">Progresso de adequação por bloco regulatório</div></div>
                    <div style={{padding:'12px 16px'}}>
                      {prog.map(p=>(
                        <div key={p.l} style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                          <span style={{fontSize:11,color:'#64748B',minWidth:200}}>{p.l}</span>
                          <div style={{flex:1,height:6,background:'#E2E8F0',borderRadius:3}}>
                            <div style={{height:6,borderRadius:3,background:p.c,width:`${p.p}%`}}/>
                          </div>
                          <span style={{fontSize:11,color:'#64748B',minWidth:32,textAlign:'right'}}>{p.p}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Especificidades BASA */}
                  <div className="card">
                    <div className="card-head"><div className="card-title">Especificidades do BASA — empresa estatal federal</div></div>
                    <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
                      {[
                        {t:'Lei 13.303/2016 — Estatais', d:'Contratos com Temenos, Tailwind e Corebanx precisam de licitação ou dispensa fundamentada. TCU pode anular contratos e responsabilizar gestores individualmente.'},
                        {t:'FNO + Manual de Crédito Rural', d:'BASA é administrador do FNO. Digitalização do Pronaf exige preservar garantias, laudos e fiscalização física. Desvio gera glosa e devolução ao fundo.'},
                        {t:'BAZA3 — Companhia Aberta', d:'Deveres informacionais à CVM. Atrasos relevantes no go-live ou incidentes cibernéticos podem configurar fato relevante de divulgação obrigatória.'},
                        {t:'LAI + Lei Anticorrupção', d:'Leis 12.527/2011 e 12.846/2013 exigem transparência ativa e programa de integridade. Logs rastreáveis são obrigatórios para LGPD e fiscalização TCU/CGU.'},
                      ].map(e=>(
                        <div key={e.t} style={{background:'#F8FAFC',borderRadius:8,padding:'12px 14px'}}>
                          <div style={{fontSize:12,fontWeight:700,color:'#0F172A',marginBottom:6}}>{e.t}</div>
                          <div style={{fontSize:11,color:'#64748B',lineHeight:1.6}}>{e.d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ══════════════════════════════════════
                GUIAS RÁPIDOS
            ══════════════════════════════════════ */}
            {aba === 'guias' && <>
              <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 18px',fontSize:12,color:'#1E40AF'}}>
                📘 <strong>Guias de Onboarding</strong> — Documentação técnica de cada módulo para facilitar a entrada de novos membros no time. Clique em um módulo para expandir.
              </div>

              <div className="g3">
                {GUIAS.map(g => (
                  <div key={g.modulo} className="guia-card" onClick={()=>setGuiaAberto(guiaAberto===g.modulo?null:g.modulo)}>
                    <div style={{padding:'16px 18px',borderBottom:guiaAberto===g.modulo?'1px solid #E2E8F0':'none'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <div style={{width:40,height:40,borderRadius:10,background:g.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{g.icone}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>{g.modulo}</div>
                          <div style={{fontSize:10,color:'#64748B',marginTop:1}}>{g.descricao}</div>
                        </div>
                        <span style={{fontSize:16,color:'#94A3B8'}}>{guiaAberto===g.modulo?'▲':'▼'}</span>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,background:'#F1F5F9',color:'#64748B',padding:'2px 7px',borderRadius:4}}>👤 {g.responsavel}</span>
                        <span style={{fontSize:10,background:'#F1F5F9',color:'#64748B',padding:'2px 7px',borderRadius:4}}>📌 {g.versao}</span>
                        <span style={{fontSize:10,background:'#F1F5F9',color:'#64748B',padding:'2px 7px',borderRadius:4}}>🗓 {g.atualizado}</span>
                      </div>
                    </div>

                    {guiaAberto === g.modulo && (
                      <div style={{padding:'14px 18px'}}>
                        <div style={{fontSize:11,fontWeight:600,color:'#64748B',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:10}}>Tópicos principais</div>
                        {g.topicos.map((t,i) => (
                          <div key={i} className="guia-topico">
                            <div style={{width:20,height:20,borderRadius:'50%',background:g.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:g.cor,flexShrink:0}}>{i+1}</div>
                            {t}
                          </div>
                        ))}
                        <button className="btn primary" style={{marginTop:14,fontSize:11}} onClick={e=>{e.stopPropagation();}}>
                          📄 Ver documentação completa
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>}

          </>}
        </div>
      </div>
    </>
  );
}
