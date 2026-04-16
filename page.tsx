'use client';

import { useState, useEffect, useCallback } from 'react';

interface JiraIssue {
  key: string; summary: string; status: string;
  statusCat: 'todo'|'doing'|'blocked'|'done'|'other'|'cancelled'|'analysis';
  tipo: string; isBug: boolean; assignee: string; assigneeEmail: string;
  priority: string; updated: string; created: string; diasParado: number;
  sprint: string|null; epicLink: string|null; storyPoints: number|null;
  labels: string[]; drop: string|null; parceiro: string|null;
  ultimoComentario?: { autor:string; data:string; texto:string }|null;
}

interface ParceiroDrop {
  parceiro: string; papel: string; drops: string[];
  total: number; concluido: number; emAndamento: number;
  bloqueado: number; backlog: number; cancelado: number; analise: number;
  pct: number; health: number;
}

interface DropData {
  drop: string; total: number; concluido: number; emAndamento: number;
  bloqueado: number; backlog: number; cancelado: number; analise: number;
  pct: number; parceiros: string[];
}

interface DashboardData {
  projectKey: string; geradoEm: string;
  summary: {
    total:number; concluido:number; concluidoNoPrazo:number; concluidoForaPrazo:number;
    emAndamento:number; emAnalise:number; bloqueado:number; backlog:number;
    cancelado:number; bugs:number; emRevisao:number; parados:number;
  };
  porDrop: DropData[];
  porParceiro: ParceiroDrop[];
  porSprint: { nome:string; total:number; concluido:number; emAndamento:number; bloqueado:number; backlog:number }[];
  parados: JiraIssue[]; bugs: JiraIssue[]; emRevisao: JiraIssue[];
  totalIssues: number;
}

function pct(a:number,b:number){return b>0?Math.round((a/b)*100):0;}
function fmt(iso:string){if(!iso)return'—';return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});}
function paradoCls(d:number){if(d<5)return'pd-ok';if(d<14)return'pd-warn';return'pd-crit';}
function paradoLabel(d:number){if(d===0)return'hoje';if(d===1)return'1 dia';return`${d}d`;}
function hColor(h:number){return h>=70?'#16A34A':h>=40?'#D97706':'#DC2626';}
function hBg(h:number){return h>=70?'#DCFCE7':h>=40?'#FEF3C7':'#FEE2E2';}

function KpiCard({label,value,sub,color,bgColor}:{label:string;value:number|string;sub?:string;color:string;bgColor:string}){
  return(
    <div style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:12,padding:'14px 18px',borderTop:`3px solid ${color}`,minWidth:0}}>
      <div style={{fontSize:10,fontWeight:600,color:'#64748B',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,color:'#0F172A',fontFamily:'monospace',lineHeight:1,letterSpacing:'-1px'}}>{value}</div>
      {sub&&<div style={{display:'inline-flex',alignItems:'center',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:4,marginTop:7,background:bgColor,color}}>{sub}</div>}
    </div>
  );
}

function Bar({value,color='#1B6EC2',height=6}:{value:number;color?:string;height?:number}){
  return(
    <div style={{background:'#F1F5F9',borderRadius:4,height,overflow:'hidden',width:'100%'}}>
      <div style={{height:'100%',width:`${Math.min(value,100)}%`,background:color,borderRadius:4,transition:'width .5s'}}/>
    </div>
  );
}

function SPill({label,count,color,bg}:{label:string;count:number;color:string;bg:string}){
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 12px',borderRadius:8,background:bg,border:`1px solid ${color}22`}}>
      <span style={{fontSize:12,fontWeight:500,color}}>{label}</span>
      <span style={{fontSize:16,fontWeight:700,color,fontFamily:'monospace'}}>{count}</span>
    </div>
  );
}

export default function GestaoProjetoDashboard(){
  const [data,setData]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [subAba,setSubAba]=useState<'visaoGeral'|'parceiros'|'drops'|'parados'|'sprints'>('visaoGeral');
  const [dropFiltro,setDropFiltro]=useState('Todos');
  const [lastRefresh,setLastRefresh]=useState('');
  const [auto,setAuto]=useState(false);

  const fetchData=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/jira?action=dashboard&project=MDB');
      const json=await res.json();
      if(json.error)throw new Error(json.error);
      setData(json);
      setLastRefresh(new Date().toLocaleTimeString('pt-BR'));
    }catch(e:any){setError(e.message??'Erro ao buscar dados');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchData();},[fetchData]);
  useEffect(()=>{if(!auto)return;const t=setInterval(fetchData,120000);return()=>clearInterval(t);},[auto,fetchData]);

  const drops=data?.porDrop?.map(d=>d.drop)??['D0','D1','D2','D3','D4'];
  const pfilt=dropFiltro==='Todos'?(data?.porParceiro??[]):(data?.porParceiro??[]).filter(p=>p.drops.includes(dropFiltro));

  const TABS=[
    {key:'visaoGeral',label:'📊 Visão Geral'},
    {key:'parceiros', label:'🤝 Parceiros'},
    {key:'drops',     label:'📦 DROPs'},
    {key:'parados',   label:'⏱ Parados',badge:data?.summary.parados},
    {key:'sprints',   label:'▶ Sprints'},
  ] as const;

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{height:100%;font-family:'IBM Plex Sans',sans-serif;background:#F8FAFC;color:#0F172A;font-size:13px;}
    .page{display:flex;flex-direction:column;height:100vh;overflow:hidden;}
    .topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:0 24px;height:56px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
    .sub-nav{background:#fff;border-bottom:1px solid #E2E8F0;padding:0 24px;display:flex;gap:2px;flex-shrink:0;overflow-x:auto;}
    .sub-tab{padding:10px 16px;font-size:12px;font-weight:500;color:#64748B;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;display:flex;align-items:center;gap:6px;background:none;border-left:none;border-right:none;border-top:none;font-family:'IBM Plex Sans',sans-serif;}
    .sub-tab:hover{color:#0F172A;}
    .sub-tab.active{color:#003087;border-bottom-color:#003087;font-weight:600;}
    .tab-badge{background:#DC2626;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;}
    .content{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;}
    .content::-webkit-scrollbar{width:4px;}
    .content::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:2px;}
    .card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;}
    .card-head{padding:14px 18px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .card-title{font-size:13px;font-weight:600;color:#0F172A;flex:1;}
    .card-sub{font-size:11px;color:#64748B;}
    .g6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
    .g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
    .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .g21{display:grid;grid-template-columns:2fr 1fr;gap:14px;}
    .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 18px;}
    .fgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:14px 18px;}
    .fcell{background:#F8FAFC;border-radius:8px;padding:10px 12px;text-align:center;}
    .tbl{width:100%;border-collapse:collapse;font-size:12px;}
    .tbl thead th{font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:#64748B;padding:8px 14px;text-align:left;border-bottom:1px solid #E2E8F0;background:#F8FAFC;white-space:nowrap;}
    .tbl thead th.c{text-align:center;}
    .tbl tbody tr{border-bottom:1px solid #F1F5F9;transition:background .1s;}
    .tbl tbody tr:hover{background:#F8FAFC;}
    .tbl tbody tr:last-child{border-bottom:none;}
    .tbl td{padding:9px 14px;vertical-align:middle;}
    .tbl td.c{text-align:center;}
    .pill{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap;}
    .p-done{background:#DCFCE7;color:#16A34A;}
    .p-doing{background:#DBEAFE;color:#1B6EC2;}
    .p-blocked{background:#FEE2E2;color:#DC2626;}
    .p-todo{background:#F1F5F9;color:#94A3B8;}
    .p-analysis{background:#F3E8FF;color:#7C3AED;}
    .p-cancelled{background:#F1F5F9;color:#CBD5E1;}
    .pd-ok{background:#DCFCE7;color:#16A34A;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px;}
    .pd-warn{background:#FEF3C7;color:#D97706;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px;}
    .pd-crit{background:#FEE2E2;color:#DC2626;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px;animation:pulsar 1.5s ease-in-out infinite;}
    @keyframes pulsar{0%,100%{opacity:1}50%{opacity:.6}}
    .ikey{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#1B6EC2;text-decoration:none;}
    .ikey:hover{text-decoration:underline;}
    .isum{font-size:12px;color:#0F172A;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}
    .dbadge{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;}
    .dD0{background:#E0E7FF;color:#3730A3;} .dD1{background:#DBEAFE;color:#1E40AF;}
    .dD2{background:#D1FAE5;color:#065F46;} .dD3{background:#FEF3C7;color:#92400E;}
    .dD4{background:#FCE7F3;color:#9D174D;} .dD5{background:#F3E8FF;color:#6B21A8;}
    .hc{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;font-family:'IBM Plex Mono',monospace;}
    .btn{padding:5px 14px;border-radius:7px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid #E2E8F0;color:#334155;background:#fff;font-family:'IBM Plex Sans',sans-serif;transition:all .15s;display:inline-flex;align-items:center;gap:5px;}
    .btn:hover{background:#F1F5F9;}
    .btn.primary{background:#003087;color:#fff;border-color:#003087;}
    .btn.primary:hover{background:#00409A;}
    .fbtn{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid #E2E8F0;color:#64748B;background:#fff;font-family:'IBM Plex Sans',sans-serif;transition:all .15s;}
    .fbtn:hover{background:#F1F5F9;}
    .fbtn.active{background:#003087;color:#fff;border-color:#003087;}
    .loader{width:36px;height:36px;border:3px solid #E2E8F0;border-top-color:#1B6EC2;border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .s-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:14px;color:#64748B;}
    .s-error{background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;padding:14px 18px;color:#DC2626;font-size:12px;}
    .s-empty{padding:40px;text-align:center;color:#64748B;font-size:13px;}
    .dcard{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px 18px;}
    .mpills{display:flex;gap:4px;flex-wrap:wrap;margin-top:10px;}
    .autolabel{font-size:11px;color:#64748B;display:flex;align-items:center;gap:5px;cursor:pointer;}
  `;

  return(
    <>
      <style>{CSS}</style>
      <div className="page">

        {/* TOPBAR */}
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,background:'#F59E0B',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#003087',fontSize:15}}>B</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#003087'}}>BASA PMO</div>
              <div style={{fontSize:10,color:'#64748B'}}>Greenfield MVP-1 · MDB</div>
            </div>
          </div>
          <div style={{width:1,height:28,background:'#E2E8F0'}}/>
          <div style={{fontSize:14,fontWeight:600,color:'#0F172A',flex:1}}>Gestão do Projeto</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
            {data&&<span style={{fontSize:11,color:'#64748B'}}>Atualizado às {lastRefresh}</span>}
            <label className="autolabel"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Auto (2min)</label>
            <button className="btn primary" onClick={fetchData} disabled={loading}>{loading?'⏳':'↻'} Atualizar</button>
          </div>
        </div>

        {/* SUB ABAS */}
        <div className="sub-nav">
          {TABS.map(t=>(
            <button key={t.key} className={`sub-tab${subAba===t.key?' active':''}`} onClick={()=>setSubAba(t.key)}>
              {t.label}
              {'badge' in t&&t.badge?<span className="tab-badge">{t.badge}</span>:null}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="content">
          {error&&<div className="s-error">⚠ {error}</div>}
          {loading&&<div className="s-loading"><div className="loader"/><div>Buscando dados do Jira MDB...</div></div>}

          {!loading&&data&&<>

            {/* ═══ VISÃO GERAL ═══ */}
            {subAba==='visaoGeral'&&<>
              <div className="g6">
                <KpiCard label="Total de Cards"  value={data.summary.total}        color="#64748B" bgColor="#F1F5F9" sub="no projeto"/>
                <KpiCard label="Concluídos"      value={data.summary.concluido}    color="#16A34A" bgColor="#DCFCE7" sub={`${pct(data.summary.concluido,data.summary.total)}% do total`}/>
                <KpiCard label="Em Andamento"    value={data.summary.emAndamento}  color="#1B6EC2" bgColor="#DBEAFE" sub="em execução"/>
                <KpiCard label="Em Análise"      value={data.summary.emAnalise}    color="#7C3AED" bgColor="#F3E8FF" sub="refinamento"/>
                <KpiCard label="Bloqueados"      value={data.summary.bloqueado}    color="#DC2626" bgColor="#FEE2E2" sub="impedidos"/>
                <KpiCard label="Backlog"         value={data.summary.backlog}      color="#94A3B8" bgColor="#F1F5F9" sub="a fazer"/>
              </div>

              {/* Barra de progresso */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Progresso Geral do Projeto</div>
                  <div className="card-sub">{data.summary.concluido} de {data.summary.total} · {pct(data.summary.concluido,data.summary.total)}%</div>
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',gap:2,height:28,borderRadius:6,overflow:'hidden',marginBottom:10}}>
                    {data.summary.concluido>0&&<div style={{width:`${pct(data.summary.concluido,data.summary.total)}%`,background:'#16A34A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{pct(data.summary.concluido,data.summary.total)}%</div>}
                    {data.summary.emAndamento>0&&<div style={{width:`${pct(data.summary.emAndamento,data.summary.total)}%`,background:'#1B6EC2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{pct(data.summary.emAndamento,data.summary.total)}%</div>}
                    {data.summary.emAnalise>0&&<div style={{width:`${pct(data.summary.emAnalise,data.summary.total)}%`,background:'#7C3AED',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{pct(data.summary.emAnalise,data.summary.total)}%</div>}
                    {data.summary.bloqueado>0&&<div style={{width:`${pct(data.summary.bloqueado,data.summary.total)}%`,background:'#DC2626'}}/>}
                    {data.summary.backlog>0&&<div style={{flex:1,background:'#E2E8F0'}}/>}
                  </div>
                  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                    {[['#16A34A','Concluído',data.summary.concluido],['#1B6EC2','Em Andamento',data.summary.emAndamento],['#7C3AED','Em Análise',data.summary.emAnalise],['#DC2626','Bloqueado',data.summary.bloqueado],['#94A3B8','Backlog',data.summary.backlog],['#CBD5E1','Cancelado',data.summary.cancelado]].map(([c,l,v])=>(
                      <div key={String(l)} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
                        <div style={{width:10,height:10,borderRadius:2,background:String(c),flexShrink:0}}/>
                        <span style={{color:'#64748B'}}>{l}</span>
                        <span style={{fontWeight:700,color:'#0F172A',fontFamily:'monospace'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="g2">
                {/* Status detalhado */}
                <div className="card">
                  <div className="card-head"><div className="card-title">Distribuição por Status</div></div>
                  <div className="sgrid">
                    <SPill label="Concluído"    count={data.summary.concluido}   color="#16A34A" bg="#DCFCE7"/>
                    <SPill label="Em Andamento" count={data.summary.emAndamento} color="#1B6EC2" bg="#DBEAFE"/>
                    <SPill label="Em Análise"   count={data.summary.emAnalise}   color="#7C3AED" bg="#F3E8FF"/>
                    <SPill label="Bloqueado"    count={data.summary.bloqueado}   color="#DC2626" bg="#FEE2E2"/>
                    <SPill label="Backlog"      count={data.summary.backlog}     color="#94A3B8" bg="#F1F5F9"/>
                    <SPill label="Cancelado"    count={data.summary.cancelado}   color="#CBD5E1" bg="#F8FAFC"/>
                    <SPill label="Bugs abertos" count={data.summary.bugs}        color="#991B1B" bg="#FFF0F0"/>
                    <SPill label="Em Revisão"   count={data.summary.emRevisao}   color="#0E7490" bg="#CFFAFE"/>
                  </div>
                </div>

                {/* Concluídos no/fora prazo */}
                <div className="card">
                  <div className="card-head"><div className="card-title">Concluídos: No Prazo vs Fora</div></div>
                  <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:12,color:'#16A34A',fontWeight:600}}>✓ No prazo</span>
                        <span style={{fontSize:14,fontWeight:700,fontFamily:'monospace'}}>{data.summary.concluidoNoPrazo}</span>
                      </div>
                      <Bar value={pct(data.summary.concluidoNoPrazo,data.summary.concluido)} color="#16A34A" height={8}/>
                      <div style={{fontSize:10,color:'#64748B',marginTop:3}}>{pct(data.summary.concluidoNoPrazo,data.summary.concluido)}% dos concluídos</div>
                    </div>
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:12,color:'#DC2626',fontWeight:600}}>✗ Fora do prazo</span>
                        <span style={{fontSize:14,fontWeight:700,fontFamily:'monospace'}}>{data.summary.concluidoForaPrazo}</span>
                      </div>
                      <Bar value={pct(data.summary.concluidoForaPrazo,data.summary.concluido)} color="#DC2626" height={8}/>
                      <div style={{fontSize:10,color:'#64748B',marginTop:3}}>{pct(data.summary.concluidoForaPrazo,data.summary.concluido)}% dos concluídos</div>
                    </div>
                    <div style={{borderTop:'1px solid #E2E8F0',paddingTop:12,fontSize:11,color:'#64748B'}}>
                      Total concluídos: <b style={{color:'#0F172A'}}>{data.summary.concluido}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quadro por fase */}
              <div className="g21">
                <div className="card">
                  <div className="card-head"><div className="card-title">Quadro de Cards por Fase</div></div>
                  <div className="fgrid">
                    {[['Backlog','#94A3B8','#F1F5F9',data.summary.backlog],['Em Análise','#7C3AED','#F3E8FF',data.summary.emAnalise],['Em Andamento','#1B6EC2','#DBEAFE',data.summary.emAndamento],['Em Revisão','#0E7490','#CFFAFE',data.summary.emRevisao],['Bloqueado','#DC2626','#FEE2E2',data.summary.bloqueado],['Concluído','#16A34A','#DCFCE7',data.summary.concluido]].map(([l,c,bg,v])=>(
                      <div key={String(l)} className="fcell" style={{background:String(bg),border:`1px solid ${c as string}22`}}>
                        <div style={{fontSize:22,fontWeight:700,fontFamily:'monospace',color:String(c)}}>{v}</div>
                        <div style={{fontSize:10,color:'#64748B',marginTop:3}}>{l}</div>
                        <div style={{fontSize:11,fontWeight:600,marginTop:2,color:String(c)}}>{pct(Number(v),data.summary.total)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><div className="card-title">⚠ Alertas</div></div>
                  <div style={{padding:'4px 0'}}>
                    {[['🚫','Bloqueados',data.summary.bloqueado,'#DC2626','#FEE2E2'],['⏱','Parados 7d+',data.summary.parados,'#D97706','#FEF3C7'],['🐛','Bugs abertos',data.summary.bugs,'#991B1B','#FFF0F0'],['🔍','Em revisão',data.summary.emRevisao,'#0E7490','#CFFAFE']].map(([ic,l,v,c,bg])=>(
                      <div key={String(l)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 18px',borderBottom:'1px solid #F1F5F9',cursor:'pointer'}} onClick={()=>setSubAba('parados')}>
                        <span style={{fontSize:16}}>{ic}</span>
                        <span style={{flex:1,fontSize:12,color:'#334155'}}>{l}</span>
                        <span style={{fontSize:16,fontWeight:700,fontFamily:'monospace',background:String(bg),color:String(c),padding:'2px 10px',borderRadius:6}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* DROPs resumo */}
              <div className="card">
                <div className="card-head"><div className="card-title">Progresso por DROP</div></div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>DROP</th><th className="c">Total</th><th className="c">Concluído</th>
                      <th className="c">Andamento</th><th className="c">Análise</th>
                      <th className="c">Bloqueado</th><th className="c">Backlog</th>
                      <th>Progresso</th><th className="c">%</th>
                    </tr></thead>
                    <tbody>
                      {(data.porDrop??[]).map(d=>{
                        const p=pct(d.concluido,d.total);
                        return(
                          <tr key={d.drop}>
                            <td><span className={`dbadge d${d.drop}`}>{d.drop}</span></td>
                            <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{d.total}</td>
                            <td className="c"><span className="pill p-done">{d.concluido}</span></td>
                            <td className="c"><span className="pill p-doing">{d.emAndamento}</span></td>
                            <td className="c"><span className="pill p-analysis">{d.analise}</span></td>
                            <td className="c"><span className="pill p-blocked">{d.bloqueado}</span></td>
                            <td className="c"><span className="pill p-todo">{d.backlog}</span></td>
                            <td style={{minWidth:120}}><Bar value={p} color={p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'}/></td>
                            <td className="c" style={{fontFamily:'monospace',fontWeight:700,color:p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'}}>{p}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}

            {/* ═══ PARCEIROS ═══ */}
            {subAba==='parceiros'&&<>
              <div className="g4">
                <KpiCard label="Parceiros ativos" value={data.porParceiro?.length??0} color="#1B6EC2" bgColor="#DBEAFE"/>
                <KpiCard label="Melhor health" value={`${Math.max(...(data.porParceiro?.map(p=>p.health)??[0]))}%`} color="#16A34A" bgColor="#DCFCE7" sub="maior score"/>
                <KpiCard label="Mais bloqueados" value={[...(data.porParceiro??[])].sort((a,b)=>b.bloqueado-a.bloqueado)[0]?.parceiro??'—'} color="#DC2626" bgColor="#FEE2E2"/>
                <KpiCard label="Maior % entrega" value={[...(data.porParceiro??[])].sort((a,b)=>b.pct-a.pct)[0]?.parceiro??'—'} color="#16A34A" bgColor="#DCFCE7"/>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">🤝 Visão Geral por Parceiro</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {['Todos',...drops].map(d=>(
                      <button key={d} className={`fbtn${dropFiltro===d?' active':''}`} onClick={()=>setDropFiltro(d)}>{d}</button>
                    ))}
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>Parceiro</th><th>Papel</th>
                      <th className="c">Total</th><th className="c">Conc.</th>
                      <th className="c">And.</th><th className="c">Análise</th>
                      <th className="c">Bloq.</th><th className="c">Backlog</th>
                      <th className="c">Canc.</th><th>Progresso</th>
                      <th className="c">%</th><th className="c">Health</th><th>DROPs</th>
                    </tr></thead>
                    <tbody>
                      {pfilt.map(p=>(
                        <tr key={p.parceiro}>
                          <td style={{fontWeight:600,color:'#0F172A'}}>{p.parceiro}</td>
                          <td style={{fontSize:11,color:'#64748B',maxWidth:120}}>{p.papel}</td>
                          <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{p.total}</td>
                          <td className="c"><span className="pill p-done">{p.concluido}</span></td>
                          <td className="c"><span className="pill p-doing">{p.emAndamento}</span></td>
                          <td className="c"><span className="pill p-analysis">{p.analise}</span></td>
                          <td className="c"><span className="pill p-blocked">{p.bloqueado}</span></td>
                          <td className="c"><span className="pill p-todo">{p.backlog}</span></td>
                          <td className="c"><span className="pill p-cancelled">{p.cancelado}</span></td>
                          <td style={{minWidth:100}}><Bar value={p.pct} color={hColor(p.health)}/></td>
                          <td className="c" style={{fontFamily:'monospace',fontWeight:700,color:hColor(p.health)}}>{p.pct}%</td>
                          <td className="c"><div className="hc" style={{background:hColor(p.health),margin:'0 auto'}}>{p.health}</div></td>
                          <td><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{p.drops.map(d=><span key={d} className={`dbadge d${d}`}>{d}</span>)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="g3">
                {pfilt.slice(0,6).map(p=>(
                  <div key={p.parceiro} className="dcard">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>{p.parceiro}</div>
                        <div style={{fontSize:11,color:'#64748B'}}>{p.papel}</div>
                      </div>
                      <div className="hc" style={{background:hColor(p.health)}}>{p.health}</div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:11,color:'#64748B'}}>Progresso</span>
                        <span style={{fontSize:11,fontWeight:700,color:hColor(p.health)}}>{p.pct}%</span>
                      </div>
                      <Bar value={p.pct} color={hColor(p.health)} height={6}/>
                    </div>
                    <div className="mpills">
                      <span className="pill p-done" style={{fontSize:10}}>✓ {p.concluido}</span>
                      <span className="pill p-doing" style={{fontSize:10}}>▶ {p.emAndamento}</span>
                      {p.bloqueado>0&&<span className="pill p-blocked" style={{fontSize:10}}>⚡ {p.bloqueado}</span>}
                      <span className="pill p-todo" style={{fontSize:10}}>○ {p.backlog}</span>
                    </div>
                    <div style={{marginTop:8,display:'flex',gap:3}}>{p.drops.map(d=><span key={d} className={`dbadge d${d}`}>{d}</span>)}</div>
                  </div>
                ))}
              </div>
            </>}

            {/* ═══ DROPS ═══ */}
            {subAba==='drops'&&<>
              <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                {['todos',...(data.porDrop??[]).map(d=>d.drop)].map(d=>(
                  <button key={d} className={`fbtn${dropFiltro===(d==='todos'?'Todos':d)?' active':''}`} onClick={()=>setDropFiltro(d==='todos'?'Todos':d)}>
                    {d==='todos'?'Todos os DROPs':d}
                  </button>
                ))}
              </div>

              <div className="g3">
                {(dropFiltro==='Todos'?data.porDrop??[]:( data.porDrop??[]).filter(d=>d.drop===dropFiltro)).map(d=>{
                  const p=pct(d.concluido,d.total);
                  return(
                    <div key={d.drop} className="dcard" style={{borderTop:`3px solid ${p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <span className={`dbadge d${d.drop}`} style={{fontSize:13,padding:'4px 10px'}}>{d.drop}</span>
                        <span style={{fontSize:28,fontWeight:700,fontFamily:'monospace',color:'#0F172A'}}>{p}<span style={{fontSize:14,fontWeight:400}}>%</span></span>
                      </div>
                      <Bar value={p} color={p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'} height={8}/>
                      <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                        {[['Concluído',d.concluido,'#16A34A','#DCFCE7'],['Andamento',d.emAndamento,'#1B6EC2','#DBEAFE'],['Análise',d.analise,'#7C3AED','#F3E8FF'],['Bloqueado',d.bloqueado,'#DC2626','#FEE2E2'],['Backlog',d.backlog,'#94A3B8','#F1F5F9'],['Cancelado',d.cancelado,'#CBD5E1','#F8FAFC']].map(([l,v,c,bg])=>(
                          <div key={String(l)} style={{background:String(bg),borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
                            <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:String(c)}}>{v}</div>
                            <div style={{fontSize:9,color:'#64748B',marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:10,fontSize:11,color:'#64748B'}}>Parceiros: {d.parceiros.join(', ')}</div>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Comparativo entre DROPs</div></div>
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th>DROP</th><th className="c">Total</th><th className="c">Concluído</th>
                      <th className="c">Andamento</th><th className="c">Análise</th>
                      <th className="c">Bloqueado</th><th className="c">Backlog</th>
                      <th className="c">Cancelado</th><th>Progresso</th><th className="c">%</th><th>Parceiros</th>
                    </tr></thead>
                    <tbody>
                      {(data.porDrop??[]).map(d=>{
                        const p=pct(d.concluido,d.total);
                        return(
                          <tr key={d.drop}>
                            <td><span className={`dbadge d${d.drop}`} style={{fontSize:12,padding:'3px 10px'}}>{d.drop}</span></td>
                            <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{d.total}</td>
                            <td className="c"><span className="pill p-done">{d.concluido}</span></td>
                            <td className="c"><span className="pill p-doing">{d.emAndamento}</span></td>
                            <td className="c"><span className="pill p-analysis">{d.analise}</span></td>
                            <td className="c"><span className="pill p-blocked">{d.bloqueado}</span></td>
                            <td className="c"><span className="pill p-todo">{d.backlog}</span></td>
                            <td className="c"><span className="pill p-cancelled">{d.cancelado}</span></td>
                            <td style={{minWidth:120}}><Bar value={p} color={p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'}/></td>
                            <td className="c" style={{fontFamily:'monospace',fontWeight:700,color:p>=70?'#16A34A':p>=40?'#D97706':'#DC2626'}}>{p}%</td>
                            <td style={{fontSize:11,color:'#64748B'}}>{d.parceiros.join(' · ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}

            {/* ═══ PARADOS ═══ */}
            {subAba==='parados'&&<>
              <div className="g4">
                <KpiCard label="Parados 7d+"  value={data.parados?.length??0}  color="#D97706" bgColor="#FEF3C7" sub="sem movimentação"/>
                <KpiCard label="Bloqueados"   value={data.summary.bloqueado}   color="#DC2626" bgColor="#FEE2E2" sub="impedidos"/>
                <KpiCard label="Bugs abertos" value={data.summary.bugs}        color="#991B1B" bgColor="#FFF0F0" sub="to fix"/>
                <KpiCard label="Em Revisão"   value={data.summary.emRevisao}   color="#0E7490" bgColor="#CFFAFE" sub="aguardando"/>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">⏱ Cards parados há 7+ dias</div>
                  <div className="card-sub">{data.parados?.length??0} cards · mais crítico primeiro</div>
                </div>
                {!data.parados?.length?<div className="s-empty">✓ Nenhum card parado há mais de 7 dias!</div>:(
                  <div style={{overflowX:'auto'}}>
                    <table className="tbl">
                      <thead><tr>
                        <th>Card</th><th>Resumo</th><th>Status</th><th>Responsável</th>
                        <th className="c">Parado há</th><th>Último comentário</th><th>Atualizado</th>
                      </tr></thead>
                      <tbody>
                        {data.parados.map(i=>(
                          <tr key={i.key}>
                            <td><a className="ikey" href={`https://deskcorp.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer">{i.key} ↗</a></td>
                            <td><span className="isum" title={i.summary}>{i.summary}</span></td>
                            <td><span className={`pill p-${i.statusCat}`}>{i.status}</span></td>
                            <td style={{fontSize:11,color:'#334155',whiteSpace:'nowrap'}}>{i.assignee}</td>
                            <td className="c"><span className={paradoCls(i.diasParado)}>⏱ {paradoLabel(i.diasParado)}</span></td>
                            <td>{i.ultimoComentario
                              ?<span style={{fontSize:10,color:'#64748B',background:'#F1F5F9',padding:'2px 7px',borderRadius:4,display:'inline-block',maxWidth:200,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={i.ultimoComentario.texto}><b style={{color:'#334155'}}>{i.ultimoComentario.autor}</b> · {i.ultimoComentario.data}</span>
                              :<span style={{fontSize:10,color:'#94A3B8',fontStyle:'italic'}}>sem comentários</span>}
                            </td>
                            <td style={{fontSize:10,color:'#64748B',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmt(i.updated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">🐛 Bugs em aberto</div>
                  <div className="card-sub">{data.bugs?.length??0} bugs</div>
                </div>
                {!data.bugs?.length?<div className="s-empty">✓ Nenhum bug em aberto!</div>:(
                  <div style={{overflowX:'auto'}}>
                    <table className="tbl">
                      <thead><tr>
                        <th>Card</th><th>Resumo</th><th>Status</th><th>Responsável</th>
                        <th>Prioridade</th><th className="c">Parado há</th><th>Criado em</th>
                      </tr></thead>
                      <tbody>
                        {data.bugs.map(i=>(
                          <tr key={i.key}>
                            <td><a className="ikey" href={`https://deskcorp.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer">{i.key} ↗</a></td>
                            <td><span className="isum" title={i.summary}>{i.summary}</span></td>
                            <td><span className={`pill p-${i.statusCat}`}>{i.status}</span></td>
                            <td style={{fontSize:11,color:'#334155'}}>{i.assignee}</td>
                            <td style={{fontSize:11,fontWeight:600,color:['High','Highest','Critical'].includes(i.priority)?'#DC2626':'#D97706'}}>{i.priority}</td>
                            <td className="c"><span className={paradoCls(i.diasParado)}>⏱ {paradoLabel(i.diasParado)}</span></td>
                            <td style={{fontSize:10,color:'#64748B',fontFamily:'monospace'}}>{fmt(i.created)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>}

            {/* ═══ SPRINTS ═══ */}
            {subAba==='sprints'&&<>
              {(()=>{
                const sprints=data.porSprint??[];
                const ultima=sprints[sprints.length-1];
                return(
                  <>
                    {ultima&&(
                      <div className="g4">
                        <KpiCard label="Sprint atual"    value={ultima.nome}                                        color="#1B6EC2" bgColor="#DBEAFE"/>
                        <KpiCard label="Total na sprint" value={ultima.total}                                       color="#64748B" bgColor="#F1F5F9"/>
                        <KpiCard label="Concluídos"      value={ultima.concluido}                                   color="#16A34A" bgColor="#DCFCE7" sub={`${pct(ultima.concluido,ultima.total)}%`}/>
                        <KpiCard label="Bloqueados"      value={ultima.bloqueado}                                   color="#DC2626" bgColor="#FEE2E2" sub="impedidos"/>
                      </div>
                    )}
                    <div className="card">
                      <div className="card-head"><div className="card-title">Progresso por Sprint</div></div>
                      <div style={{overflowX:'auto'}}>
                        <table className="tbl">
                          <thead><tr>
                            <th>Sprint</th><th className="c">Total</th><th className="c">Concluído</th>
                            <th className="c">Andamento</th><th className="c">Bloqueado</th>
                            <th className="c">Backlog</th><th>Progresso</th><th className="c">%</th>
                          </tr></thead>
                          <tbody>
                            {sprints.map((s,i)=>{
                              const p=pct(s.concluido,s.total);
                              const isAtual=i===sprints.length-1;
                              return(
                                <tr key={s.nome} style={isAtual?{background:'#F0F9FF'}:{}}>
                                  <td>
                                    <span style={{fontFamily:'monospace',fontWeight:600,fontSize:12,color:'#1B6EC2'}}>{s.nome}</span>
                                    {isAtual&&<span style={{marginLeft:8,fontSize:9,fontWeight:700,background:'#F59E0B',color:'#003087',padding:'2px 6px',borderRadius:4}}>ATUAL</span>}
                                  </td>
                                  <td className="c" style={{fontFamily:'monospace',fontWeight:700}}>{s.total}</td>
                                  <td className="c"><span className="pill p-done">{s.concluido}</span></td>
                                  <td className="c"><span className="pill p-doing">{s.emAndamento}</span></td>
                                  <td className="c"><span className="pill p-blocked">{s.bloqueado}</span></td>
                                  <td className="c"><span className="pill p-todo">{s.backlog}</span></td>
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

          </>}
        </div>
      </div>
    </>
  );
}
