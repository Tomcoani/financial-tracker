// ══ PORTFOLIO ══
// ══ PORTFOLIO RENDER (multi-portfolio) ══
function renderPortfolio(){
  const container=document.getElementById('portfolios-container');
  if(!container)return;
  container.innerHTML='';
  if(!D.portfolios||!D.portfolios.length){
    D.portfolios=[{id:Date.now(),brokerName:'',items:[{name:'',category:'מניות חו"ל',value:'',targetPct:''}]}];
  }
  D.portfolios.forEach((port,pi)=>{
    const portTotal=(port.items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
    const card=document.createElement('div');card.className='card';card.style.marginBottom='16px';
    let html=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="font-size:16px;font-weight:700;color:var(--white)">תיק השקעות ${D.portfolios.length>1?pi+1:''}</div>
      <input value="${esc(port.brokerName||'')}" placeholder="שם בית ההשקעות (IBI, מיטב, קסם...)"
        data-pi="${pi}" oninput="portBrokerUpdate(this)"
        style="background:var(--s2);border:1.5px solid var(--border);border-radius:9px;padding:8px 14px;
        color:var(--teal);font-family:var(--font);font-size:13px;font-weight:700;outline:none;
        flex:1;min-width:180px;transition:border-color .2s;text-align:right;direction:rtl"
        onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--border)'"/>
      <div id="port-card-total-${pi}" style="font-size:16px;font-weight:800;color:var(--teal)">${portTotal>0?fmt(portTotal):''}</div>
      ${D.portfolios.length>1?`<button class="bdel" onclick="delPortfolio(${pi})" style="font-size:20px" title="מחק תיק">×</button>`:''}
    </div>`;
    // Column headers
    html+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px;gap:8px;
      font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:8px;text-align:right">
      <div>שם ניירות הערך</div><div>קטגוריה</div><div>שווי נוכחי (₪)</div><div>% מהתיק</div><div>% יעד</div><div></div>
    </div>`;
    // Items
    (port.items||[]).forEach((p,ii)=>{
      const curPct=portTotal>0&&parseFloat(p.value)?(parseFloat(p.value)/portTotal*100).toFixed(1):'—';
      const catOpts=PORT_CATS.map(c=>`<option${c===p.category?' selected':''}>${c}</option>`).join('');
      html+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px;gap:8px;margin-bottom:7px;align-items:center">
        <input class="port-input" value="${esc(p.name||'')}" placeholder="שם נייר הערך / קרן" data-pi="${pi}" data-ii="${ii}" data-f="name" oninput="portItemUpdate(this)" style="text-align:right"/>
        <select class="port-input" data-pi="${pi}" data-ii="${ii}" data-f="category" oninput="portItemUpdate(this)" style="color:var(--white)">${catOpts}</select>
        <input class="port-input" type="number" value="${p.value||''}" placeholder="0" data-pi="${pi}" data-ii="${ii}" data-f="value" oninput="portItemUpdate(this)" onblur="validateNum(this.value,'portValue',this)"/>
        <div id="pct-${pi}-${ii}" style="text-align:center;font-size:13px;font-weight:700;color:var(--teal)">${curPct}%</div>
        <input class="port-input" type="number" value="${p.targetPct||''}" placeholder="%" data-pi="${pi}" data-ii="${ii}" data-f="targetPct" oninput="portItemUpdate(this)" onblur="validateNum(this.value,'portTarget',this)"/>
        <button class="bdel" onclick="delPortItem(${pi},${ii})">×</button>
      </div>`;
    });
    html+=`<button class="btnadd" onclick="addPortItem(${pi})" style="margin-top:6px">+ הוספת נייר ערך</button>`;
    card.innerHTML=html;
    container.appendChild(card);
  });
  updatePortStats();
}
function portBrokerUpdate(el){
  const pi=+el.dataset.pi;
  if(!D.portfolios[pi])return;
  D.portfolios[pi].brokerName=el.value;
  markDirty();
}
function portItemUpdate(el){
  const pi=+el.dataset.pi,ii=+el.dataset.ii,f=el.dataset.f;
  if(!D.portfolios[pi]||!D.portfolios[pi].items[ii])return;
  D.portfolios[pi].items[ii][f]=el.value;
  D.portfolio=D.portfolios.flatMap(p=>p.items||[]);
  const portTotal=(D.portfolios[pi].items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
  const headerEl=document.getElementById('port-card-total-'+pi);
  if(headerEl)headerEl.textContent=portTotal>0?fmt(portTotal):'';
  (D.portfolios[pi].items||[]).forEach((_,idx)=>{
    const pctEl=document.getElementById(`pct-${pi}-${idx}`);
    if(pctEl){const v=parseFloat(D.portfolios[pi].items[idx].value)||0;pctEl.textContent=portTotal>0&&v?(v/portTotal*100).toFixed(1)+'%':'—%';}
  });
  updatePortStats();syncNWFromPension();
  if(document.getElementById('nw-investments'))renderNWSection('nw-investments','investments');
  markDirty();
}
function addPortItem(pi){
  if(!D.portfolios[pi])return;
  D.portfolios[pi].items.push({name:'',category:'מניות חו"ל',value:'',targetPct:''});
  D.portfolio=D.portfolios.flatMap(p=>p.items||[]);
  renderPortfolio();markDirty();
}
function delPortItem(pi,ii){
  if(!D.portfolios[pi])return;
  D.portfolios[pi].items.splice(ii,1);
  if(!D.portfolios[pi].items.length)D.portfolios[pi].items=[{name:'',category:'מניות חו"ל',value:'',targetPct:''}];
  D.portfolio=D.portfolios.flatMap(p=>p.items||[]);
  renderPortfolio();markDirty();
}
function addPortfolio(){
  if(!D.portfolios)D.portfolios=[];
  D.portfolios.push({id:Date.now(),brokerName:'',items:[{name:'',category:'מניות חו"ל',value:'',targetPct:''}]});
  D.portfolio=D.portfolios.flatMap(p=>p.items||[]);
  renderPortfolio();markDirty();
}
function delPortfolio(pi){
  if(!confirm('למחוק תיק זה וכל ניירות הערך שבו?'))return;
  D.portfolios.splice(pi,1);
  if(!D.portfolios.length)D.portfolios=[{id:Date.now(),brokerName:'',items:[]}];
  D.portfolio=D.portfolios.flatMap(p=>p.items||[]);
  renderPortfolio();markDirty();
}
// Legacy stubs for backward compat
function portUpdate(el){}
function addPortfolioRow(){addPortItem(0);}
function delPortRow(i){delPortItem(0,i);}
let _selectedPortIdx=0;
function renderPortfolioSelector(){
  const el=document.getElementById('portfolio-selector');
  if(!el)return;
  const ports=D.portfolios||[];
  if(ports.length<=1){el.innerHTML='';return;}
  if(_selectedPortIdx>=ports.length)_selectedPortIdx=0;
  el.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
    <span style="font-size:12px;color:var(--t3);align-self:center;margin-left:4px">תצוגה:</span>
    ${ports.map((p,i)=>`<button onclick="selectPortfolio(${i})"
      style="padding:6px 14px;border-radius:20px;border:1.5px solid ${i===_selectedPortIdx?'var(--teal)':'var(--border)'};
      background:${i===_selectedPortIdx?'rgba(66,235,214,.12)':'transparent'};
      color:${i===_selectedPortIdx?'var(--teal)':'var(--t2)'};
      font-family:var(--font);font-size:13px;font-weight:${i===_selectedPortIdx?'700':'400'};cursor:pointer">
      ${esc(p.brokerName||'תיק '+(i+1))}
    </button>`).join('')}
    <button onclick="selectPortfolio(-1)"
      style="padding:6px 14px;border-radius:20px;border:1.5px solid ${_selectedPortIdx===-1?'var(--teal)':'var(--border)'};
      background:${_selectedPortIdx===-1?'rgba(66,235,214,.12)':'transparent'};
      color:${_selectedPortIdx===-1?'var(--teal)':'var(--t2)'};
      font-family:var(--font);font-size:13px;cursor:pointer">כל התיקים</button>
  </div>`;
}
function selectPortfolio(idx){_selectedPortIdx=idx;renderPortfolioSelector();updatePortStats();}
function updatePortStats(){
  renderPortfolioSelector();
  const ports=D.portfolios||[];
  const allItems=ports.flatMap(p=>p.items||[]);
  // Use selected portfolio or all
  const viewItems=(_selectedPortIdx>=0&&ports[_selectedPortIdx])
    ?ports[_selectedPortIdx].items||[]
    :allItems;
  const total=viewItems.reduce((s,p)=>s+(parseFloat(p.value)||0),0);
  const cats=new Set(viewItems.filter(p=>p.value).map(p=>p.category));
  const el_total=document.getElementById('port-total');
  const el_count=document.getElementById('port-count');
  const el_cats=document.getElementById('port-cats');
  if(el_total)el_total.textContent=fmt(total);
  if(el_count)el_count.textContent=viewItems.filter(p=>p.value).length;
  if(el_cats)el_cats.textContent=cats.size;
  renderPortfolioCharts(viewItems);
  renderRebalance(total,viewItems);
}
let chPort=null;
function renderPortfolioCharts(viewItems){
  const items=(viewItems||(D.portfolios||[]).flatMap(p=>p.items||[])).filter(p=>p.name&&parseFloat(p.value));
  if(chPort)chPort.destroy();
  const ctx=document.getElementById('ch-port');if(!ctx)return;
  const catMap={};
  items.forEach(p=>{catMap[p.category]=(catMap[p.category]||0)+(parseFloat(p.value)||0);});
  const labels=Object.keys(catMap),vals=Object.values(catMap);
  chPort=new Chart(ctx.getContext('2d'),{
    type:'doughnut',
    data:{labels:labels.length?labels:['אין נתונים'],datasets:[{data:vals.length?vals:[1],
      backgroundColor:vals.length?COLS:['#1e2d45'],borderWidth:0,hoverOffset:8}]},
    options:{plugins:{legend:{position:'right',labels:{color:'#94a3b8',font:{family:'Heebo',size:12},boxWidth:12,padding:10}}},
      cutout:'65%',maintainAspectRatio:false}
  });
}
function renderRebalance(total,viewItems){
  const src=viewItems||(D.portfolios||[]).flatMap(p=>p.items||[]);
  const items=src.filter(p=>p.name&&parseFloat(p.value)&&parseFloat(p.targetPct));
  const el=document.getElementById('rebalance-box');
  if(!items.length){
    el.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">הוסף השקעות עם אחוז יעד כדי לקבל המלצה</p>';
    return;
  }
  const totalTarget=items.reduce((s,p)=>s+(parseFloat(p.targetPct)||0),0);
  const enriched=items.map(p=>{
    const cur=parseFloat(p.value)||0;
    const curPct=total>0?(cur/total*100):0;
    const targetPct=parseFloat(p.targetPct)||0;
    return{...p,cur,curPct,targetPct};
  });
  // Correct "add-only" rebalance: solve for total X to add so underweight assets
  // reach their target % of the NEW total (T+X), not just the current total.
  // X = (T·S_u − C_u) / (1 − S_u)  where S_u=Σtarget_i, C_u=Σcurrent_i for underweight
  const underweight=enriched.filter(p=>p.curPct<p.targetPct);
  const S_u=underweight.reduce((s,p)=>s+p.targetPct/100,0);
  const C_u=underweight.reduce((s,p)=>s+p.cur,0);
  const X=S_u>0&&S_u<1?Math.max(0,(total*S_u-C_u)/(1-S_u)):0;
  const newTotal=total+X;
  const withDiff=enriched.map(p=>({...p,diff:p.curPct<p.targetPct?Math.max(0,p.targetPct/100*newTotal-p.cur):0}));
  const toBuy=withDiff.filter(p=>p.diff>100).sort((a,b)=>a.diff-b.diff);
  const balanced=withDiff.filter(p=>p.diff<=100);
  let html=`<div style="font-size:13px;font-weight:700;color:var(--teal);margin-bottom:12px;text-align:right">🎯 סדר פעולות לאיזון (מהקל לקשה):</div>`;
  if(!toBuy.length){
    html+=`<div style="font-size:13px;color:var(--green);text-align:right;margin-bottom:10px">✅ התיק באיזון מלא</div>`;
  } else {
    toBuy.forEach((p,i)=>{
      html+=`<div class="rebalance-item">
        <span style="text-align:right">
          <span style="color:var(--t3);font-size:11px;font-weight:700;margin-left:6px">${i+1}.</span>
          ${esc(p.name)} <span style="color:var(--t3);font-size:11px">(${p.curPct.toFixed(1)}% → ${p.targetPct}%)</span>
        </span>
        <span class="buy">הפקד ${fmt(p.diff)}</span>
      </div>`;
    });
  }
  if(balanced.length){
    html+=`<div style="font-size:11px;color:var(--t3);margin-top:10px;margin-bottom:6px;text-align:right">באיזון:</div>`;
    balanced.forEach(p=>{
      html+=`<div class="rebalance-item">
        <span style="text-align:right">${esc(p.name)}</span>
        <span class="hold">✓ באיזון</span>
      </div>`;
    });
  }
  if(Math.abs(totalTarget-100)>1)
    html+=`<div style="font-size:11px;color:var(--amber);margin-top:10px;text-align:right">⚠️ סך אחוזי היעד: ${totalTarget.toFixed(0)}% (צריך להיות 100%)</div>`;
  html+=`<div style="font-size:11px;color:var(--t3);margin-top:10px;text-align:right">* ההמלצה מבוססת על הפקדות בלבד, לא מכירות</div>`;
  el.innerHTML=html;
}

// ══ SNAPSHOTS ══
function calcCurrent(){
  // Collect all DOM values first
  collectAll();
  const monthlyEl=document.getElementById('monthly');
  if(monthlyEl)D.monthly=monthlyEl.value;
  const monthly=parseFloat(D.monthly)||0;
  const penTotal=(D.pension||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const goalsSaved=(D.goals||[]).filter(g=>!g.done).reduce((s,g)=>s+(parseFloat(g.saved)||0),0);
  const goalsNeeded=(D.goals||[]).filter(g=>!g.done).reduce((s,g)=>s+(parseFloat(g.needed)||0),0);
  const latestCol=getLatestNWCol();
  const nw=sumSec('assets',latestCol)+sumSec('investments',latestCol)+sumSec('savings',latestCol)-sumSec('debts',latestCol);
  const debts=sumSec('debts',latestCol);
  return {monthly,penTotal,goalsSaved,goalsNeeded,netWorth:nw,debts,
    locations:JSON.parse(JSON.stringify(D.locations||[])),
    goals:JSON.parse(JSON.stringify(D.goals||[]))};
}
function openSnapModal(){
  const cur=calcCurrent(),prev=D.snapshots?.length?D.snapshots[D.snapshots.length-1]:null;
  const rows=[
    {label:'שווי נטו',val:cur.netWorth,prev:prev?.netWorth},
    {label:'חיסכון חודשי',val:cur.monthly,prev:prev?.monthly},
    {label:'פנסיה וחסכונות',val:cur.penTotal,prev:prev?.penTotal},
    {label:'חסכון למטרות',val:cur.goalsSaved,prev:prev?.goalsSaved},
  ];
  document.getElementById('snap-preview').innerHTML=rows.map(r=>{
    const d=prev!=null?r.val-(r.prev||0):null;
    return `<div class="snap-row"><span class="sr-label">${r.label}</span><span class="sr-val">${fmt(r.val)}</span>${d!=null?deltaBadge(d):'<span style="font-size:11px;color:var(--t3)">ראשון</span>'}</div>`;
  }).join('');
  document.getElementById('snap-modal').style.display='flex';
}
function closeModal(){document.getElementById('snap-modal').style.display='none';}
async function confirmSnap(){
  const cur=calcCurrent(),now=new Date();
  D.snapshots.push({date:now.toISOString(),label:`${now.getMonth()+1}/${now.getFullYear()}`,...cur});
  await saveDataFS(CU,D);closeModal();renderDash();showToast('תמונת מצב נשמרה ☁️ ✓');
}
let delSnapIdx=null;
function openHistModal(i){
  delSnapIdx=i;
  const s=D.snapshots[i],prev=i>0?D.snapshots[i-1]:null;
  document.getElementById('hm-title').textContent='📸 '+s.label+' — '+fmtDate(s.date);
  const rows=[
    {label:'שווי נטו',val:s.netWorth,prev:prev?.netWorth},
    {label:'חיסכון חודשי',val:s.monthly,prev:prev?.monthly},
    {label:'פנסיה',val:s.penTotal,prev:prev?.penTotal},
    {label:'חסכון למטרות',val:s.goalsSaved,prev:prev?.goalsSaved},
  ];
  document.getElementById('hm-body').innerHTML=rows.map(r=>{
    const d=prev!=null?r.val-(r.prev||0):null;
    return `<div class="snap-row"><span class="sr-label">${r.label}</span><span class="sr-val">${fmt(r.val)}</span>${d!=null?deltaBadge(d):'<span style="font-size:11px;color:var(--t3)">ראשון</span>'}</div>`;
  }).join('');
  document.getElementById('hist-modal').style.display='flex';
}
function closeHistModal(){document.getElementById('hist-modal').style.display='none';delSnapIdx=null;}
async function deleteSnap(){
  if(delSnapIdx==null)return;
  D.snapshots.splice(delSnapIdx,1);
  await saveDataFS(CU,D);closeHistModal();renderHistory();renderDash();
}
function renderHistory(){
  const snaps=D.snapshots||[];
  const el=document.getElementById('history-list'),empty=document.getElementById('history-empty');
  if(!snaps.length){el.innerHTML='';empty.style.display='block';renderHistoryChart(null);return;}
  empty.style.display='none';el.innerHTML='';
  renderHistoryChart(snaps);
  [...snaps].reverse().forEach((s,ri)=>{
    const i=snaps.length-1-ri,prev=i>0?snaps[i-1]:null;
    const nwD=prev!=null?s.netWorth-(prev.netWorth||0):null;
    const row=document.createElement('div');row.className='hist-item';
    row.innerHTML=`
      <div><div class="hi-date">${s.label} · ${fmtDate(s.date)}</div><div class="hi-nw ${s.netWorth>=0?'vt':'vr'}">${fmt(s.netWorth)}</div></div>
      <div class="hi-deltas">${nwD!=null?`<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">שווי נטו</div>${deltaBadge(nwD)}</div>`:'<span style="font-size:11px;color:var(--t3)">ראשון</span>'}</div>
      <div style="display:flex;gap:6px">
        <button class="btnhist" onclick="openHistModal(${i})">פירוט →</button>
        <button class="btnhist" style="color:var(--amber);border-color:rgba(245,158,11,.3)" onclick="restoreSnap(${i})" title="שחזר מצב זה">↩ שחזר</button>
        <button class="btnhist" style="color:var(--red);border-color:rgba(239,68,68,.3)" onclick="deleteSnapDirect(${i})">🗑</button>
      </div>`;
    el.appendChild(row);
  });
}

