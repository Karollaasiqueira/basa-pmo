'use client';
import { useState } from 'react';

type Status = 'critico' | 'atencao' | 'adequado' | 'vencido';

interface Norma {
  bloco: string;
  nome: string;
  orgao: string;
  status: Status;
  prazo: string;
  descricao: string;
  tags: string[];
  pdrs: string[];
}

interface RiscoLegal {
  bloco: string;
  norma: string;
  risco: string;
  pdrs: string[];
  impacto: string;
  criticidade: 'CRÍTICA' | 'ALTA' | 'MÉDIA-ALTA' | 'MÉDIA';
}

const NORMAS: Norma[] = [
  { bloco:'Cibersegurança', nome:'Res. CMN 5.274/2025 + Res. BCB 538/2025', orgao:'Banco Central do Brasil', status:'vencido', prazo:'VENCIDO 01/03/2026', descricao:'14 controles mínimos mandatórios para ambientes RSFN/PIX/STR: MFA, criptografia em trânsito e repouso, isolamento físico/lógico em nuvem, gestão de certificados, pentest anual independente documentado por 5 anos, trilhas de auditoria e monitoramento contínuo. Vedação de acesso de terceiros às chaves privadas. Prazo venceu em 01/03/2026.', tags:['MFA','Pentest','Criptografia','Nuvem','Auditoria','RSFN'], pdrs:['PDR-21','PDR-76','PDR-107','PDR-112'] },
  { bloco:'Cibersegurança', nome:'Res. CMN 4.893/2021 (atualizada pela 5.274/2025)', orgao:'CMN / Banco Central', status:'atencao', prazo:'Vigente', descricao:'Política de cibersegurança aprovada pelo Conselho, diretor estatutário responsável, plano de resposta a incidentes com reporte obrigatório ao BACEN, due diligence de provedores em nuvem (inclusive no exterior), cláusulas obrigatórias nos contratos: acesso BACEN, segregação lógica, localização de dados, portabilidade.', tags:['CISO','Nuvem','Incidente','Fornecedores'], pdrs:['PDR-21','PDR-96'] },
  { bloco:'PSTIs', nome:'Res. BCB 498/2025 (alt. Res. BCB 547/2026)', orgao:'Banco Central do Brasil', status:'atencao', prazo:'Adequação até mai/2026', descricao:'Regulamenta Provedores de Serviços de TI no SFN. Credenciamento, capital social mínimo, reputação dos administradores, governança e controles internos obrigatórios. Temenos, Tailwind, Corebanx e Neurotech precisam de due diligence formal. Risco de indisponibilidade em cascata se fornecedores não adequados.', tags:['Temenos','Tailwind','Corebanx','Due diligence'], pdrs:['PDR-85','PDR-72','PDR-104'] },
  { bloco:'PIX / SPB', nome:'Res. BCB 1/2020 + Reg. Pix + BCB 103/2021 + BCB 343/2023', orgao:'Banco Central do Brasil', status:'critico', prazo:'Vigente — operação contínua', descricao:'SLA de liquidação em até 10s (efetivação em 3s), disponibilidade 24/7, integração DICT, MED para contestação e devolução (BCB 343/2023), bloqueio cautelar, antifraude calibrado (BCB 103/2021). O MVP-1 possui 60+ items MDB bloqueados por APIs não entregues pela Corebanx/ITSS para PIX, TED e DDA.', tags:['PIX','SPI','DICT','MED','Antifraude','SLA'], pdrs:['PDR-48','PDR-78','PDR-62'] },
  { bloco:'LGPD', nome:'Lei 13.709/2018 + Res. CD/ANPD 15/2024', orgao:'ANPD / Governo Federal', status:'critico', prazo:'Vigente — fiscalização ativa', descricao:'Base legal para tratamento, DPO, ROPA, DPIA para operações de alto risco. Decisões automatizadas de crédito exigem revisão humana disponível. Notificação de incidente à ANPD em 72h (Res. 15/2024). Dados reais em QA/UAT sem mascaramento (PDR-37) constituem violação ativa. Privacy by design obrigatório na arquitetura.', tags:['DPO','DPIA','Consentimento','Scoring','Incidente','Anonimização'], pdrs:['PDR-37','PDR-13','PDR-63','PDR-65'] },
  { bloco:'PLD/FT', nome:'Circ. BCB 3.978/2020 + Lei 9.613/1998 + Lei 13.810/2019', orgao:'COAF / Banco Central', status:'critico', prazo:'Vigente — aplicação contínua', descricao:'Política PLD/FT com ABR, KYC reforçado para conta digital: biometria, prova de vida, validação documental, checagem em listas PEP e sanções ONU. Monitoramento transacional automatizado calibrado. Comunicação obrigatória ao COAF. Lei 13.810 exige bloqueio imediato de sancionados pela ONU.', tags:['KYC','COAF','AML','PEP','Sanções ONU'], pdrs:['PDR-10','PDR-65','PDR-83'] },
  { bloco:'Governança', nome:'Res. CMN 4.557/2017 — GIR', orgao:'CMN / Banco Central', status:'atencao', prazo:'Vigente', descricao:'GIR obrigatório: políticas aprovadas pelo Conselho, CRO como figura obrigatória, tratamento integrado de risco operacional, crédito, mercado, liquidez e socioambiental. Todo novo produto digital precisa de gate de aprovação do CRO com evidências documentadas antes do go-live.', tags:['CRO','GIR','Capital','Gate go-live'], pdrs:['PDR-86','PDR-44'] },
  { bloco:'Governança', nome:'Res. CMN 4.595/2017 + Res. CMN 4.879/2020', orgao:'CMN / Banco Central', status:'atencao', prazo:'Vigente', descricao:'Política de compliance independente com aprovação do Conselho (CMN 4.595). Auditoria interna com escopo, metodologia e reporte ao Conselho (CMN 4.879). PDR-44 registra ausência de plano de gestão de mudanças — sinal direto de fragilidade nestas normas.', tags:['Compliance','Auditoria interna','Conselho'], pdrs:['PDR-44','PDR-46'] },
  { bloco:'Basileia III', nome:'Res. CMN 4.955/2021 + Res. BCB 229/2022', orgao:'CMN / Banco Central', status:'atencao', prazo:'Vigente', descricao:'Patrimônio de Referência e cálculo de capital para risco operacional. A digitalização expande a superfície de risco operacional (fraude digital, indisponibilidade, ciberataques) e tende a impactar o capital regulatório. Modelagem do impacto é tarefa obrigatória na análise do projeto.', tags:['Capital','Risco operacional','Basileia III'], pdrs:['PDR-49','PDR-9'] },
  { bloco:'Open Finance', nome:'Res. Conjunta CMN/BCB 1/2020 + Circ. BCB 4.015/2020', orgao:'Banco Central do Brasil', status:'atencao', prazo:'Vigente — participação obrigatória', descricao:'BASA é participante obrigatório do Open Finance Brasil. Conformidade com especificações técnicas, consentimento granular e revogável, SLAs de disponibilidade das APIs, portabilidade de crédito com TPPs, guia de experiência do usuário. Evolução contínua deve compor o roadmap.', tags:['APIs','Consentimento','Portabilidade','TPP','SLA'], pdrs:['PDR-76'] },
  { bloco:'PCI-DSS', nome:'PCI-DSS v4.0', orgao:'PCI Security Standards Council', status:'critico', prazo:'Bloqueador go-live D4', descricao:'Certificação obrigatória para transmissão e armazenamento de dados de cartão. Cartões Visa Electron (D4) via ISO 8583/TecBan precisam de ambiente PCI-DSS compliant. PDR-36 registra explicitamente esta não conformidade. Bloqueador direto do go-live do Drop D4.', tags:['Cartão','Visa Electron','ISO 8583','ATM','TecBan'], pdrs:['PDR-36'] },
  { bloco:'Estatais / FNO', nome:'Lei 13.303/2016 + Decreto 8.945/2016', orgao:'TCU / CGU', status:'atencao', prazo:'Vigente', descricao:'Regime de contratação de estatais: licitação ou dispensa devidamente fundamentada. Contratos com Temenos, Tailwind e Corebanx precisam de regularidade formal. TCU pode anular contratos irregulares e responsabilizar gestores individualmente. LAI e Lei Anticorrupção exigem transparência e programa de integridade.', tags:['TCU','CGU','Licitação','Contratos'], pdrs:['PDR-85'] },
  { bloco:'Estatais / FNO', nome:'Lei 7.827/1989 — FNO + MCR BACEN', orgao:'BACEN / TCU', status:'atencao', prazo:'Vigente', descricao:'BASA é administrador do FNO. Digitalização de Pronaf/crédito rural exige preservação integral da formalização do MCR: garantias, laudos, fiscalização física onde exigida. Qualquer desvio gera glosa de operações, devolução de recursos ao fundo e ressalva do TCU.', tags:['FNO','Pronaf','Crédito rural','MCR','Glosa'], pdrs:['PDR-68'] },
  { bloco:'Atendimento', nome:'Res. CMN 4.949/2021 + Res. BCB 96/2021 + CDC', orgao:'CMN / BACEN / Senacon', status:'atencao', prazo:'Vigente', descricao:'Conta digital com abertura e encerramento remotos, canais de ouvidoria integrados com SLA, acessibilidade obrigatória (Lei 13.146/2015 — LBI). PDR-70 e PDR-94 registram riscos de usabilidade que também constituem riscos regulatórios.', tags:['Ouvidoria','Acessibilidade','LBI','CDC'], pdrs:['PDR-70','PDR-94'] },
];

const RISCOS_LEGAIS: RiscoLegal[] = [
  { bloco:'Cibersegurança', norma:'Res. BCB 538/2025', risco:'14 controles mínimos RSFN/PIX não atendidos — prazo vencido em 01/03/2026', pdrs:['PDR-21','PDR-76','PDR-112'], impacto:'Multa BACEN + suspensão acesso PIX/STR', criticidade:'CRÍTICA' },
  { bloco:'PLD/FT', norma:'Circ. BCB 3.978/2020', risco:'Onboarding KYC frágil, biometria não formalizada, listas PEP/sanções incompletas', pdrs:['PDR-65','PDR-83','PDR-10'], impacto:'PAS BACEN + comunicação COAF', criticidade:'CRÍTICA' },
  { bloco:'LGPD', norma:'Lei 13.709/2018', risco:'Dados reais em QA/UAT sem mascaramento (violação ativa), ausência de DPIA', pdrs:['PDR-37','PDR-13','PDR-63'], impacto:'Até 2% do faturamento — ANPD', criticidade:'CRÍTICA' },
  { bloco:'PIX / SPB', norma:'Res. BCB 1/2020', risco:'60+ MDB bloqueados, APIs Corebanx/ITSS não entregues, SLA 3s não validado', pdrs:['PDR-48','PDR-78','PDR-62'], impacto:'Sanção BACEN + perda de clientes', criticidade:'CRÍTICA' },
  { bloco:'PCI-DSS', norma:'PCI-DSS v4.0', risco:'Ambiente não certificado para Visa Electron/ATM — Drop D4 bloqueado', pdrs:['PDR-36'], impacto:'Bloqueio total do go-live D4', criticidade:'CRÍTICA' },
  { bloco:'PSTIs', norma:'Res. BCB 498/2025', risco:'Fornecedores de TI sem due diligence regulatória e sem cláusulas obrigatórias', pdrs:['PDR-85','PDR-72'], impacto:'Descumprimento + risco auditoria BACEN', criticidade:'ALTA' },
  { bloco:'Governança/GIR', norma:'Res. CMN 4.557/2017', risco:'Produtos digitais sem gate de aprovação do CRO antes do go-live', pdrs:['PDR-44','PDR-86'], impacto:'Descumprimento prudencial', criticidade:'ALTA' },
  { bloco:'SISBAJUD', norma:'CNJ / STF', risco:'Integração judicial planejada para D5, mas operações D2 precisam de cobertura', pdrs:['PDR-91'], impacto:'Descumprimento de ordem judicial', criticidade:'ALTA' },
  { bloco:'Estatais', norma:'Lei 13.303/2016', risco:'Contratos com fornecedores sem conformidade formal com regime de estatais', pdrs:['PDR-85'], impacto:'Anulação contratual pelo TCU', criticidade:'ALTA' },
  { bloco:'FNO / MCR', norma:'Lei 7.827/1989', risco:'Digitalização do crédito rural sem preservar formalização exigida pelo MCR', pdrs:['PDR-68'], impacto:'Glosa TCU + devolução ao FNO', criticidade:'MÉDIA-ALTA' },
  { bloco:'Open Finance', norma:'Res. CMN/BCB 1/2020', risco:'APIs OF não conformes com especificações técnicas e SLAs do ecossistema', pdrs:['PDR-76'], impacto:'Sanção BACEN', criticidade:'MÉDIA' },
  { bloco:'Atendimento', norma:'Res. CMN 4.949/2021', risco:'Jornada digital sem ouvidoria integrada e sem acessibilidade (LBI)', pdrs:['PDR-70','PDR-94'], impacto:'Sanção BACEN + reclamações Procon', criticidade:'MÉDIA' },
];

const PROGRESSO = [
  { label:'Cibersegurança (BCB 538/2025)', pct:5, cor:'#E24B4A' },
  { label:'PLD/FT (KYC/COAF)', pct:30, cor:'#EF9F27' },
  { label:'LGPD / ANPD', pct:15, cor:'#E24B4A' },
  { label:'PIX / SPB (Res. BCB 1/2020)', pct:25, cor:'#EF9F27' },
  { label:'PCI-DSS v4.0 (Drop D4)', pct:10, cor:'#E24B4A' },
  { label:'PSTIs (Res. BCB 498/2025)', pct:20, cor:'#E24B4A' },
  { label:'Governança / GIR / Compliance', pct:40, cor:'#EF9F27' },
  { label:'SISBAJUD / Judicial', pct:45, cor:'#EF9F27' },
  { label:'Open Finance', pct:35, cor:'#EF9F27' },
  { label:'Estatais / FNO / MCR', pct:50, cor:'#639922' },
  { label:'Atendimento / Ouvidoria / LBI', pct:40, cor:'#EF9F27' },
];

const STATUS_CFG: Record<Status, { label:string; cls:string }> = {
  vencido:  { label:'VENCIDO',  cls:'bg-red-100 text-red-700 border border-red-200' },
  critico:  { label:'Crítico',  cls:'bg-red-100 text-red-700 border border-red-200' },
  atencao:  { label:'Atenção',  cls:'bg-amber-100 text-amber-700 border border-amber-200' },
  adequado: { label:'Adequado', cls:'bg-green-100 text-green-700 border border-green-200' },
};

const CRIT_CLS: Record<string,string> = {
  'CRÍTICA':    'bg-red-100 text-red-700',
  'ALTA':       'bg-amber-100 text-amber-700',
  'MÉDIA-ALTA': 'bg-orange-100 text-orange-700',
  'MÉDIA':      'bg-yellow-100 text-yellow-700',
};

const BLOCOS = ['Todos', ...Array.from(new Set(NORMAS.map(n => n.bloco)))];

export default function AuditoriaLegal() {
  const [blocoAtivo, setBlocoAtivo] = useState('Todos');
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());

  const toggle = (i:number) => setExpandidas(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const filtradas = blocoAtivo === 'Todos' ? NORMAS : NORMAS.filter(n => n.bloco === blocoAtivo);
  const criticos  = NORMAS.filter(n => n.status === 'critico' || n.status === 'vencido').length;
  const atencao   = NORMAS.filter(n => n.status === 'atencao').length;
  const adequados = NORMAS.filter(n => n.status === 'adequado').length;

  return (
    <div className="space-y-0">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 border-b border-gray-200">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Auditoria de Conformidade Legal</h2>
          <p className="text-xs text-gray-500 mt-1">Banco da Amazônia · Core Banking MVP-1 · 16/04/2026</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">{criticos} críticos/vencidos</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{atencao} em atenção</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">{adequados} adequados</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">PSTI: mai/2026</span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-6">
        {[
          { label:'Normas mapeadas',         value:'28',      sub:'Federais + BACEN + ANPD' },
          { label:'Blocos regulatórios',     value:'11',      sub:'Ciberseg · LGPD · PIX · FNO' },
          { label:'Riscos com impacto legal', value:'31',     sub:'de 111 PDRs abertos' },
          { label:'Penalidade máx. estimada', value:'R$50M+', sub:'BACEN + ANPD + TCU' },
          { label:'Adequação geral',          value:'26%',    sub:'7 de 28 normas atendidas' },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="px-6 space-y-2 pb-4">
        <div className="text-xs px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 leading-relaxed">
          <strong>VENCIDO 01/03/2026</strong> — Res. CMN 5.274/2025 + Res. BCB 538/2025: 14 controles mínimos de cibersegurança para RSFN/PIX/STR. O BASA já opera em situação de não conformidade. Risco de suspensão de acesso ao SPI.
        </div>
        <div className="text-xs px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 leading-relaxed">
          <strong>PRAZO MAI/2026</strong> — Res. BCB 498/2025 (PSTIs): due diligence regulatória obrigatória para Temenos, Tailwind, Corebanx e Neurotech com cláusulas de auditabilidade e portabilidade de dados.
        </div>
        <div className="text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 leading-relaxed">
          <strong>RISCO PATRIMONIAL</strong> — FNO/MCR: digitalização de crédito rural sem preservar formalização exigida pelo MCR gera risco de glosa pelo TCU e devolução de recursos ao fundo constitucional.
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Normas por bloco */}
      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Requisitos normativos — clique para expandir</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {BLOCOS.map(b => (
            <button key={b} onClick={() => setBlocoAtivo(b)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                b === blocoAtivo
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}>{b}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtradas.map(n => {
            const idx = NORMAS.indexOf(n);
            const aberta = expandidas.has(idx);
            const sc = STATUS_CFG[n.status];
            return (
              <div key={idx} onClick={() => toggle(idx)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors bg-white ${aberta ? 'border-gray-400' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{n.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.orgao}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                </div>
                <p className="text-xs text-gray-500">{n.prazo}</p>
                {aberta && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600 leading-relaxed">{n.descricao}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {n.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t}</span>)}
                    </div>
                    {n.pdrs.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">PDRs: {n.pdrs.map(p => <span key={p} className="font-mono text-blue-600 mr-1">{p}</span>)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Matriz de riscos */}
      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Matriz de riscos regulatórios</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['Bloco','Norma','Risco no MVP-1','PDRs vinculados','Impacto','Criticidade'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RISCOS_LEGAIS.map((r,i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.bloco}</span></td>
                  <td className="py-2 px-3 text-gray-500 max-w-xs">{r.norma}</td>
                  <td className="py-2 px-3 text-gray-700 max-w-sm">{r.risco}</td>
                  <td className="py-2 px-3">{r.pdrs.map(p => <span key={p} className="font-mono text-blue-600 mr-1">{p}</span>)}</td>
                  <td className="py-2 px-3 text-gray-500">{r.impacto}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full font-medium ${CRIT_CLS[r.criticidade] ?? 'bg-gray-100 text-gray-600'}`}>{r.criticidade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Progresso */}
      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Progresso de adequação por bloco</p>
        <div className="space-y-2">
          {PROGRESSO.map(p => (
            <div key={p.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-52 flex-shrink-0">{p.label}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full" style={{ width:`${p.pct}%`, backgroundColor:p.cor }} />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Especificidades BASA */}
      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Especificidades do BASA — empresa estatal federal</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { titulo:'Lei 13.303/2016 — Estatais', texto:'Contratações (Temenos, Tailwind, Corebanx) precisam de licitação ou dispensa fundamentada. TCU pode anular contratos e responsabilizar gestores individualmente.' },
            { titulo:'FNO + Manual de Crédito Rural', texto:'BASA é administrador do FNO. Digitalização do Pronaf/crédito rural exige preservar garantias, laudos e fiscalização física. Desvio gera glosa e devolução de recursos ao fundo.' },
            { titulo:'BAZA3 — Companhia Aberta', texto:'Deveres informacionais à CVM. Atrasos relevantes no go-live ou incidentes cibernéticos significativos podem configurar fato relevante de divulgação obrigatória.' },
            { titulo:'LAI + Lei Anticorrupção', texto:'Leis 12.527/2011 e 12.846/2013 exigem transparência ativa e programa de integridade. Logs rastreáveis são obrigatórios tanto para LGPD quanto para fiscalização TCU/CGU.' },
          ].map(e => (
            <div key={e.titulo} className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">{e.titulo}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{e.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
