'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from 'recharts';
import Link from 'next/link';

interface Task {
  id: number;
  phase: number;
  parent_id: number | null;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  position: number;
  updated_at: string;
  completed_at: string | null;
}

interface Log {
  id: number;
  task_id: number | null;
  task_title: string | null;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
}

const SC: Record<string, string> = {
  completed:  '#10b981',
  in_progress:'#f59e0b',
  pending:    '#475569',
  blocked:    '#ef4444',
  info:       '#6366f1',
  warning:    '#f59e0b',
  error:      '#ef4444',
};
const PHASE_HUE = ['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#10b981'];

function phaseStatus(tasks: Task[]): string {
  if (!tasks.length) return 'pending';
  if (tasks.every(t => t.status === 'completed')) return 'completed';
  if (tasks.some(t => t.status === 'in_progress' || t.status === 'completed')) return 'in_progress';
  return 'pending';
}

const TT = {
  contentStyle: { background:'#1e293b', border:'1px solid #334155', borderRadius:'10px', color:'#f1f5f9', fontSize:13 },
  cursor: { fill:'#1a2540' },
};

export default function ProgressPage() {
  const [data, setData]       = useState<{ tasks: Task[]; logs: Log[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [ts, setTs]           = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/progress')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d  => { setData(d); setLoading(false); setTs(new Date().toLocaleTimeString()); })
      .catch(e => { setErr(e.message); setLoading(false); });
  };
  useEffect(load, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm">Loading progress...</span>
    </div>
  );
  if (err) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-red-400 text-sm">Error: {err}</p>
      <button onClick={load} className="text-slate-400 border border-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors">Retry</button>
    </div>
  );
  if (!data) return null;

  const phases = data.tasks.filter(t => !t.parent_id);
  const tasks  = data.tasks.filter(t =>  t.parent_id);
  const logs   = data.logs;

  const done   = tasks.filter(t => t.status === 'completed').length;
  const inProg = tasks.filter(t => t.status === 'in_progress').length;
  const pend   = tasks.filter(t => t.status === 'pending').length;
  const errCt  = logs.filter(l => l.level === 'error').length;
  const pct    = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const pieData = [
    { name:'Completed',   value:done,   color:SC.completed   },
    { name:'In Progress', value:inProg, color:SC.in_progress },
    { name:'Pending',     value:pend,   color:SC.pending     },
  ].filter(d => d.value > 0);

  const barData = phases.map(p => {
    const pt = tasks.filter(t => t.parent_id === p.id);
    return {
      name:`P${p.phase}`,
      Completed: pt.filter(t => t.status==='completed').length,
      'In Progress': pt.filter(t => t.status==='in_progress').length,
      Pending: pt.filter(t => t.status==='pending').length,
    };
  });

  const radialData = phases.map((p,i) => {
    const pt = tasks.filter(t => t.parent_id === p.id);
    const d  = pt.filter(t => t.status==='completed').length;
    return { name:`P${p.phase} · ${p.title.replace(/Phase \d+ — /,'')}`, value:pt.length?Math.round((d/pt.length)*100):0, fill:PHASE_HUE[i] };
  });

  return (
    <div className="min-h-screen" style={{background:'#0a0f1e',color:'#f1f5f9'}}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              3P Explorer — Build Progress
            </h1>
            <p className="text-slate-500 text-sm mt-1">Updated {ts} · {tasks.length} tasks across {phases.length} phases</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="text-sm text-slate-500 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">← App</Link>
            <button onClick={load} className="text-sm text-slate-400 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">↻ Refresh</button>
          </div>
        </div>

        {/* Overall bar */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-5">
          <div className="flex justify-between text-sm text-slate-400 mb-3">
            <span>Overall Completion</span>
            <span className="font-bold text-white">{pct}% · {done}/{tasks.length} done</span>
          </div>
          <div className="bg-slate-900 rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{width:`${pct}%`,background:'linear-gradient(90deg,#6366f1,#8b5cf6,#10b981)'}} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            {label:'Total',      value:tasks.length, color:'#818cf8'},
            {label:'Completed',  value:done,          color:SC.completed},
            {label:'In Progress',value:inProg,        color:SC.in_progress},
            {label:'Pending',    value:pend,          color:SC.pending},
            {label:'Errors',     value:errCt,         color:SC.error},
          ].map(s => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-center">
              <div className="text-3xl font-extrabold" style={{color:s.color}}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-2 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pie + Bar */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Status Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value"
                  label={({name,percent}) => percent>0.06?`${(percent*100).toFixed(0)}%`:''} labelLine={false}>
                  {pieData.map((e,i) => <Cell key={i} fill={e.color} strokeWidth={0}/>)}
                </Pie>
                <Tooltip {...TT} formatter={(v,n)=>[`${v} tasks`,n]}/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:12}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tasks per Phase</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{top:0,right:0,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="name" stroke="#334155" tick={{fill:'#64748b',fontSize:12}}/>
                <YAxis stroke="#334155" tick={{fill:'#64748b',fontSize:12}}/>
                <Tooltip {...TT}/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:12}}>{v}</span>}/>
                <Bar dataKey="Completed"   stackId="a" fill={SC.completed}/>
                <Bar dataKey="In Progress" stackId="a" fill={SC.in_progress}/>
                <Bar dataKey="Pending"     stackId="a" fill={SC.pending} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radial */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Per-Phase Completion %</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={160} barSize={12} data={radialData} startAngle={180} endAngle={-180}>
              <RadialBar background={{fill:'#0a0f1e'}} dataKey="value" cornerRadius={6}
                label={{position:'insideStart',fill:'#fff',fontSize:11,fontWeight:700}}/>
              <Tooltip {...TT} formatter={v=>[`${v}%`,'Completion']}/>
              <Legend iconSize={10} formatter={(_,e: unknown)=><span style={{color:'#94a3b8',fontSize:11}}>{((e as {payload:{name:string}})?.payload?.name??'')}</span>}/>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Dependency graph */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Phase Dependencies</div>
          <div className="flex items-center gap-3 flex-wrap">
            {phases.map((p,i) => {
              const pt  = tasks.filter(t => t.parent_id===p.id);
              const st  = phaseStatus(pt);
              const col = SC[st]||'#475569';
              const d   = pt.filter(t=>t.status==='completed').length;
              return (
                <Fragment key={p.id}>
                  {i>0 && <div style={{color:'#334155',fontSize:22}}>→</div>}
                  <div style={{background:'#0a0f1e',border:`2px solid ${col}`,borderRadius:12,padding:'12px 16px',minWidth:110,textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:3,letterSpacing:'.05em'}}>PHASE {p.phase}</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0',marginBottom:8,lineHeight:1.3}}>{p.title.replace(/Phase \d+ — /,'')}</div>
                    <div style={{display:'inline-block',padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:col+'22',color:col}}>
                      {d}/{pt.length} · {st.replace('_',' ')}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
          <p className="text-slate-700 text-xs mt-3">P1→P2→P3→P5 · P1→P4→P5 (P5 requires P3+P4)</p>
        </div>

        {/* Phase accordion */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Phase Details</div>
          {phases.map((p,i) => {
            const pt  = tasks.filter(t=>t.parent_id===p.id);
            const d   = pt.filter(t=>t.status==='completed').length;
            const pp  = pt.length?Math.round((d/pt.length)*100):0;
            const open= expanded===p.id;
            const hue = PHASE_HUE[i%PHASE_HUE.length];
            return (
              <div key={p.id} style={{border:'1px solid #334155',borderRadius:10,overflow:'hidden',marginBottom:8}}>
                <div
                  onClick={()=>setExpanded(open?null:p.id)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer',background:'#0f172a'}}
                  className="hover:bg-slate-900 transition-colors"
                >
                  <div style={{width:34,height:34,borderRadius:'50%',background:hue+'22',border:`2px solid ${hue}`,color:hue,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,flexShrink:0}}>{p.phase}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:'#f1f5f9',marginBottom:2,fontSize:14}}>{p.title}</div>
                    <div style={{color:'#475569',fontSize:12,marginBottom:6}}>{p.description}</div>
                    <div style={{background:'#1e293b',borderRadius:4,height:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pp}%`,background:hue,borderRadius:4,transition:'width .6s'}}/>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginRight:6}}>
                    <div style={{fontWeight:800,color:'#f1f5f9'}}>{pp}%</div>
                    <div style={{color:'#475569',fontSize:11,marginTop:2}}>{d}/{pt.length} done</div>
                  </div>
                  <div style={{color:'#334155',fontSize:14}}>{open?'▲':'▼'}</div>
                </div>
                {open && (
                  <div style={{padding:'8px 16px 12px',background:'#080d1a'}}>
                    {pt.map(t=>(
                      <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:'1px solid #1a2540'}}>
                        <div style={{width:9,height:9,borderRadius:'50%',background:SC[t.status]||'#475569',marginTop:4,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:'#e2e8f0',fontSize:13.5,fontWeight:500}}>{t.title}</div>
                          <div style={{color:'#475569',fontSize:12,marginTop:3}}>{t.description}</div>
                        </div>
                        <div style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0,background:(SC[t.status]||'#475569')+'22',color:SC[t.status]||'#475569'}}>
                          {t.status.replace('_',' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logs */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Logs & Errors ({logs.length})</div>
          {logs.length===0
            ? <p className="text-center text-slate-700 py-10 text-sm">No logs yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {['Time','Level','Task','Message'].map(h=>(
                        <th key={h} className="text-left text-slate-600 font-semibold text-xs uppercase tracking-wider pb-3 px-3 border-b border-slate-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l=>(
                      <tr key={l.id} className="border-b border-slate-800/50">
                        <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:(SC[l.level]||'#475569')+'22',color:SC[l.level]||'#475569',textTransform:'uppercase',letterSpacing:'.06em'}}>{l.level}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-400 text-xs">{l.task_title||'—'}</td>
                        <td className="px-3 py-3 text-slate-200">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

      </div>
    </div>
  );
}
