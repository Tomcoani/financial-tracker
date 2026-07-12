// ══ DASHBOARD ══
let chAlloc=null,chAlloc2=null,chNW=null;
// Small "last updated" line for a dashboard tile — shows the most recent
// update date among the given lastUpdated keys (or "טרם עודכן").
function tileUpdatedLine(keys){
  const lu=D.lastUpdated||{};
  let latest=null;
  keys.forEach(k=>{if(lu[k]&&(!latest||new Date(lu[k])>new Date(latest)))latest=lu[k];});
  const txt=latest?('עודכן '+fmtDate(latest)):'טרם עודכן';
  return `<div style="font-size:9px;color:var(--t3);margin-top:4px;opacity:.85">🕒 ${txt}</div>`;
}
// Client feedback → saved into the user's own data doc as D.feedback[].
// The admin reads every user's data doc, so it surfaces in the admin inbox.
async function submitFeedback(){
  const el=document.getElementById('feedback-input');
  if(!el)return;
  const msg=(el.value||'').trim();
  const status=document.getElementById('feedback-status');
  if(!msg){el.focus();return;}
  if(!Array.isArray(D.feedback))D.feedback=[];
  D.feedback.push({message:msg,date:new Date().toISOString(),status:'new'});
  el.value='';
  if(status){status.style.display='inline';status.style.color='var(--teal)';status.textContent='תודה! ההודעה נשלחה לתום ✓';}
  markDirty();
  try{await manualSave();}catch(e){}
  setTimeout(()=>{if(status){status.textContent='';status.style.display='none';}},5000);
}
function renderDash(){
  collectAll();
  const cur=calcCurrent(),snaps=D.snapshots||[],prev=snaps.length?snaps[snaps.length-1]:null;
  // Best-estimate NW: each row uses its own most-recent non-empty value.
  // Prevents the common case where updating only investments in a new period
  // zeros out assets/savings/debts (they were never entered for that period).
  const latestCol=getLatestNWCol(); // still used for per-row name sub-texts
  const nwAssets=sumSecBest('assets');
  const nwInvest=sumSecBest('investments');
  const nwSavings=sumSecBest('savings');
  const nwDebts=sumSecBest('debts');
  const nwTotal=nwAssets+nwInvest+nwSavings-nwDebts;
  cur.netWorth=nwTotal;

  // Check for stale pension dates (alert if any >6 months old)
  const now=new Date();
  const staleProducts=(D.pension||[]).filter(p=>{
    if(!p.date)return false;
    const d=new Date(p.date);
    const months=(now-d)/(1000*60*60*24*30);
    return months>=6;
  }).map(p=>p.name);

  document.getElementById('snap-trigger-area').innerHTML=`
    ${staleProducts.length?`<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:11px;padding:13px 18px;margin-bottom:12px;font-size:13px;color:#fcd34d;text-align:right">
      <i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-left:4px;color:#fcd34d"></i> <strong>לא נבדקה כבר חצי שנה:</strong> ${staleProducts.join('، ')} — כדאי לבדוק מה היתרה הנוכחית
    </div>`:''}
    <div class="snap-trigger">
      <div>
        <p><b>תמונת מצב חודשית</b><br>
        <span style="font-size:12px;color:var(--t3)">המערכת שומרת את הנתונים שלך אוטומטית — תמונת מצב <strong>מצלמת</strong> את המצב הפיננסי הנוכחי כדי שתוכל להשוות בעתיד ולראות כמה התקדמת.</span></p>
        ${prev?`<div style="font-size:11px;color:var(--t3);margin-top:4px">תמונת מצב אחרונה: ${fmtDate(prev.date)}</div>`:'<div style="font-size:11px;color:var(--amber);margin-top:4px">טרם נשמרה תמונת מצב ראשונה — מומלץ לשמור עכשיו!</div>'}
      </div>
      <button class="btnsnaptrig" onclick="openSnapModal()"><i data-lucide="camera" style="width:14px;height:14px;vertical-align:middle;margin-left:4px"></i> שמור תמונת מצב</button>
    </div>`;
  const cmpArea=document.getElementById('cmp-area');
  if(prev){
    cmpArea.innerHTML=`<div class="cmp-banner">
      <div><div class="cmp-title">📊 השוואה לתמונת מצב קודמת</div><div class="cmp-date">${fmtDate(prev.date)}</div></div>
      <div class="cmp-items">
        <div class="cmp-item"><div class="ci-label">שווי נטו</div>${deltaBadge(cur.netWorth-prev.netWorth)}</div>
        <div class="cmp-item"><div class="ci-label">חיסכון</div>${deltaBadge(cur.monthly-(prev.monthly||0))}</div>
        <div class="cmp-item"><div class="ci-label">מטרות</div>${deltaBadge(cur.goalsSaved-(prev.goalsSaved||0))}</div>
        <div class="cmp-item"><div class="ci-label">פנסיה</div>${deltaBadge(cur.penTotal-(prev.penTotal||0))}</div>
      </div>
    </div>`;
  }else{cmpArea.innerHTML='';}

  // Pension = investment rows that are פנסיה/השתלמות — use best per-row value
  const penFromNW=(D.nwData.investments.rows||[]).reduce((s,r)=>{
    const isPen=r.name&&(r.name.includes('פנסיה')||r.name.includes('השתלמות'));
    return s+(isPen?rowLatestILS(r):0);
  },0);
  // Liquid = ONLY non-pension investment rows + savings
  const liquidInvest=(D.nwData.investments.rows||[]).reduce((s,r)=>{
    const isPen=r.name&&(r.name.includes('פנסיה')||r.name.includes('השתלמות'));
    return s+(!isPen?rowLatestILS(r):0);
  },0);
  // Savings sub-text
  const savingsRows=(D.nwData.savings.rows||[])
    .map(r=>({name:r.name,val:rowLatestILS(r)}))
    .filter(r=>r.val>0);
  const savingsTotal=savingsRows.reduce((s,r)=>s+r.val,0);
  const savingsSubText=savingsRows.map(r=>`${r.name} ${fmt(r.val)}`).join(' · ');
  // Total liquid = non-pension investments + savings
  const liquidTotal=liquidInvest+savingsTotal;

  document.getElementById('dash-stats').innerHTML=`
    <div class="stat teal">
      <label>שווי נטו</label>
      <div class="val vt">${fmt(nwTotal)}</div>
      <div class="sub" style="font-size:10px;color:var(--t3)">
        נכסים ${fmt(nwAssets)} + השקעות ${fmt(nwInvest+nwSavings)} − חובות ${fmt(nwDebts)}
      </div>
      <div class="sub">${prev&&(nwTotal-prev.netWorth)!==0?deltaBadge(nwTotal-prev.netWorth):''}</div>
      ${tileUpdatedLine(['nw','pension','portfolio'])}
    </div>
    <div class="stat">
      <label><i data-lucide="home" class="tile-icon"></i> נכסים</label>
      <div class="val vg">${fmt(nwAssets)}</div>
      <div class="sub" style="font-size:10px;color:var(--t3)">
        ${(D.nwData.assets.rows||[]).filter(r=>rowLatestILS(r)>0).map(r=>r.name).slice(0,2).join(' · ')||'דירה, רכב, מזומן'}
      </div>
      ${tileUpdatedLine(['nw'])}
    </div>
    <div class="stat">
      <label><i data-lucide="landmark" class="tile-icon"></i> פנסיה והשתלמות</label>
      <div class="val vp">${fmt(penFromNW||nwInvest)}</div>
      <div class="sub" style="font-size:10px;color:var(--t3)">
        ${(D.nwData.investments.rows||[]).filter(r=>{const n=r.name||'';return(n.includes('פנסיה')||n.includes('השתלמות'))&&rowLatestILS(r)>0}).map(r=>r.name).join(' · ')||'פנסיה + קרן השתלמות'}
      </div>
      ${tileUpdatedLine(['pension'])}
    </div>
    <div class="stat">
      <label><i data-lucide="wallet" class="tile-icon"></i> השקעות נזילות + חסכונות</label>
      <div class="val vb">${fmt(liquidTotal)}</div>
      <div class="sub" style="font-size:10px;color:var(--t3)">
        ${liquidInvest>0?'תיק '+fmt(liquidInvest):''}${liquidInvest>0&&savingsTotal>0?' · ':''}${savingsSubText||'קרן חירום, קרן כספית'}
      </div>
      ${tileUpdatedLine(['portfolio','nw'])}
    </div>`;

  // Insights card
  renderDashInsights(nwTotal,nwAssets,nwInvest,nwSavings,nwDebts,latestCol,prev);

  // ── Two donuts: liquid vs illiquid ──
  if(chAlloc)chAlloc.destroy();
  if(chAlloc2)chAlloc2.destroy();

  // LIQUID: from locations, excluding pension/השתלמות
  // Also factor in NW debt to get "net" home value
  const homeBruto=nwAssets; // already computed at top
  const debt=nwDebts;
  const homeNet=Math.max(0,homeBruto-debt); // net home value

  // Build liquid assets from locations, replacing home value with net
  const liquidItems=[];
  // Build liquid items directly from NW data sections (latestCol already set at top)
  const portGrandTotal=(D.portfolios||[]).flatMap(p=>p.items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
  const seenNames=new Set();

  // 1. Assets from NW tab (נכסים section) - use net home value
  (D.nwData.assets.rows||[]).forEach(row=>{
    if(!row.name)return;
    const raw=parseFloat(row.vals[latestCol])||0;
    if(!raw)return;
    const isHome=row.name.includes('בית')||row.name.includes('דירה')||row.name.includes('נדל');
    const val=isHome?Math.max(0,raw-(sumSec('debts',latestCol))):raw;
    if(val>0&&!seenNames.has(row.name)){
      seenNames.add(row.name);
      liquidItems.push({name:isHome?row.name+' (נטו)':row.name, val});
    }
  });

  // 2. Savings (חסכונות) - קרן חירום etc
  (D.nwData.savings.rows||[]).forEach(row=>{
    if(!row.name)return;
    const val=parseFloat(row.vals[latestCol])||0;
    if(val>0&&!seenNames.has(row.name)){
      seenNames.add(row.name);
      liquidItems.push({name:row.name, val});
    }
  });

  // 3. Investments (השקעות) - excluding pension/השתלמות
  (D.nwData.investments.rows||[]).forEach(row=>{
    if(!row.name)return;
    const isPension=row.name.includes('פנסיה')||row.name.includes('השתלמות');
    if(isPension)return;
    const val=parseFloat(row.vals[latestCol])||0;
    if(val>0&&!seenNames.has(row.name)){
      seenNames.add(row.name);
      liquidItems.push({name:row.name, val});
    }
  });

  // 4. If no NW data yet, fallback to portfolio total
  if(!liquidItems.length&&portGrandTotal>0){
    liquidItems.push({name:'תיק השקעות',val:portGrandTotal});
  }

  // ILLIQUID: pension products
  const illiquidItems=(D.pension||[])
    .filter(p=>p.name&&parseFloat(p.amount))
    .map(p=>({name:p.name, val:parseFloat(p.amount)||0}));

  const isMobile=window.innerWidth<=600;
  function buildDonut(ctxId, items, colorSet){
    const ctx=document.getElementById(ctxId);if(!ctx)return null;
    const total=items.reduce((s,i)=>s+i.val,0);
    const labels=items.length
      ? items.map(i=>{
          const pct=total>0?Math.round(i.val/total*100):0;
          const display=i.val>=1000000?(i.val/1000000).toFixed(1)+'M':i.val>=1000?Math.round(i.val/1000)+'K':String(Math.round(i.val));
          // Use LTR mark to keep numbers readable in RTL context
          return '\u200F'+i.name+' \u2012 \u200E₪'+display+' ('+pct+'%)';
        })
      : ['אין נתונים'];
    const data=items.length?items.map(i=>i.val):[1];
    const bg=items.length?colorSet:['#1e2d45'];
    return new Chart(ctx.getContext('2d'),{
      type:'doughnut',
      data:{labels,datasets:[{data,backgroundColor:bg,borderWidth:2,borderColor:'#080c14',hoverOffset:8}]},
      options:{
        plugins:{
          legend:{
            position:isMobile?'bottom':'right',
            rtl:true,
            labels:{
              color:'#94a3b8',
              font:{family:'Heebo',size:isMobile?10:11},
              boxWidth:10,
              padding:isMobile?6:8,
              textAlign:'right'
            }
          },
          tooltip:{callbacks:{label:ctx=>` ${ctx.label}`}}
        },
        cutout:'60%',maintainAspectRatio:false
      }
    });
  }

  const LIQUID_COLS=['#42ebd6','#3b82f6','#10b981','#f59e0b','#06b6d4','#34d399'];
  const ILLIQ_COLS=['#7c3aed','#a78bfa','#4f46e5','#c084fc','#818cf8','#6d28d9'];
  chAlloc=buildDonut('ch-alloc', liquidItems, LIQUID_COLS);
  chAlloc2=buildDonut('ch-alloc2', illiquidItems, ILLIQ_COLS);
  // Adjust chart height on mobile for bottom legend
  if(isMobile){
    const wh=document.querySelectorAll('.chwrap');
    wh.forEach(w=>w.style.height='320px');
  }

  // NW line — only show past/present periods with actual data
  let labels, nwVals;
  if(snaps.length>=2){
    labels=snaps.map(s=>s.label);
    nwVals=snaps.map(s=>s.netWorth);
  } else {
    // Filter to only periods that exist, are not future, and have non-zero data
    const filteredPeriods=D.nwPeriods.map((p,c)=>({p,c})).filter(({p,c})=>{
      if(!p||isFuturePeriod(p))return false;
      const total=sumSec('assets',c)+sumSec('investments',c)+sumSec('savings',c)-sumSec('debts',c);
      return total!==0; // only include periods with actual data entered
    });
    labels=filteredPeriods.map(({p})=>p);
    nwVals=filteredPeriods.map(({c})=>sumSec('assets',c)+sumSec('investments',c)+sumSec('savings',c)-sumSec('debts',c));
  }
  if(chNW)chNW.destroy();
  const ctx=document.getElementById('ch-nw').getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(66,235,214,.3)');grad.addColorStop(1,'rgba(66,235,214,0)');
  chNW=new Chart(ctx,{type:'line',
    data:{labels,datasets:[{label:'שווי נטו',data:nwVals,borderColor:'#42ebd6',backgroundColor:grad,
      pointBackgroundColor:'#42ebd6',tension:.4,fill:true,pointRadius:5,pointHoverRadius:7}]},
    options:{plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:'#64748b',font:{family:'Heebo',size:11}},grid:{color:'#1a2235'}},
        y:{ticks:{color:'#64748b',font:{family:'Heebo',size:11},callback:val=>'₪'+Math.round(val/1000)+'k'},grid:{color:'#1a2235'}}},
      maintainAspectRatio:false}});
  // Goals
  document.getElementById('dash-goals').innerHTML=(D.goals||[]).filter(g=>!g.done).map(g=>{
    const sv=parseFloat(g.saved)||0,nd=parseFloat(g.needed)||0,pct=nd>0?Math.min(100,Math.round(sv/nd*100)):0;
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;text-align:right">${esc(g.name)||'מטרה'}</span>
        <span style="font-size:11px;color:var(--t2);direction:ltr">${fmt(sv)} / ${fmt(nd)}</span>
      </div>
      <div class="pbar" style="height:9px"><div class="pfill" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:3px">
        <span style="font-size:10px;color:var(--t3)">${HZ[Math.max(0,g.h||0)]}</span>
        <span style="font-size:10px;color:var(--t2)">${pct}%</span>
      </div>
    </div>`;
  }).join('')||`<p style="color:var(--t3);font-size:13px;text-align:right;padding:10px 0">${g('לחץ','לחצי')} על "מטרות" להוספת מטרות</p>`;

  renderAnalysis(snaps);
  renderUpdateAlerts();
}

// ══ LAST UPDATED BADGE ══
function updateLastUpdatedBars(){
  const ts=D.lastSaved?new Date(D.lastSaved):null;
  const label=ts?'עודכן לאחרונה: '+fmtDate(ts.toISOString())+' '+ts.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'טרם נשמר';
  ['p-goals','p-pension','p-nw','p-portfolio','p-history','p-notes','p-settings'].forEach(pid=>{
    const el=document.getElementById('lup-'+pid);
    if(el)el.innerHTML=`<span class="lup-dot"></span><span>${label}</span>`;
  });
}

// ══ VALIDATION ══
const VALIDATION_RULES = {
  // field: [min, max, label]
  penAmount:    [0, 100000000, 'סכום פנסיה'],
  goalSaved:    [0, 100000000, 'סכום שחסכת'],
  goalNeeded:   [0, 100000000, 'סכום יעד'],
  locAmount:    [0, 100000000, 'סכום מיקום'],
  cfBalance:    [-10000000, 100000000, 'יתרת עו"ש'],
  cfZero:       [0, 10000000, 'אפס חדש'],
  cfExpenses:   [0, 10000000, 'הוצאות נוספות'],
  cfCredit:     [0, 10000000, 'הוצאות באשראי'],
  nwCell:       [-100000000, 100000000, 'שווי'],
  portValue:    [0, 100000000, 'שווי השקעה'],
  portTarget:   [0, 100, 'אחוז יעד'],
  feesDeposit:  [0, 10, 'דמי ניהול מהפקדה'],
  feesAccum:    [0, 5, 'דמי ניהול מצבירה'],
};
function validateNum(val, ruleKey, inputEl){
  const rule = VALIDATION_RULES[ruleKey];
  if(!rule) return true;
  const n = parseFloat(val);
  if(val===''||val===null||val===undefined) return true; // empty is ok
  if(isNaN(n)){
    showValError(inputEl, 'יש להכניס מספר בלבד');
    return false;
  }
  if(n < rule[0] || n > rule[1]){
    showValError(inputEl, `${rule[2]}: ערך חייב להיות בין ${fmt(rule[0])} ל-${fmt(rule[1])}`);
    return false;
  }
  clearValError(inputEl);
  return true;
}
function showValError(inputEl, msg){
  if(!inputEl) return;
  inputEl.classList.add('input-error');
  let errEl = inputEl.parentNode.querySelector('.val-error');
  if(!errEl){
    errEl = document.createElement('div');
    errEl.className = 'val-error';
    inputEl.parentNode.appendChild(errEl);
  }
  errEl.textContent = msg;
  errEl.classList.add('show');
}
function clearValError(inputEl){
  if(!inputEl) return;
  inputEl.classList.remove('input-error');
  const errEl = inputEl.parentNode.querySelector('.val-error');
  if(errEl) errEl.classList.remove('show');
}

// ══ HISTORY CHART ══
let chHist = null;
function renderHistoryChart(snaps){
  const wrap = document.getElementById('hist-chart-wrap');
  if(!snaps || snaps.length < 2){ if(wrap) wrap.style.display='none'; return; }
  if(wrap) wrap.style.display='block';
  if(chHist) chHist.destroy();
  const ctx = document.getElementById('ch-hist');
  if(!ctx) return;
  const labels = snaps.map(s=>s.label);
  const nwData = snaps.map(s=>s.netWorth||0);
  const penData = snaps.map(s=>s.penTotal||0);
  const savData = snaps.map(s=>s.goalsSaved||0);
  chHist = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {label:'שווי נטו', data:nwData, backgroundColor:'rgba(66,235,214,.7)', borderColor:'#42ebd6', borderWidth:2, borderRadius:6},
        {label:'פנסיה וחסכונות', data:penData, backgroundColor:'rgba(139,92,246,.6)', borderColor:'#8b5cf6', borderWidth:2, borderRadius:6},
        {label:'חסכון למטרות', data:savData, backgroundColor:'rgba(245,158,11,.6)', borderColor:'#f59e0b', borderWidth:2, borderRadius:6},
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:'top',labels:{color:'#94a3b8',font:{family:'Heebo',size:12},padding:16}},
        tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmt(ctx.raw)}}
      },
      scales:{
        x:{ticks:{color:'#64748b',font:{family:'Heebo',size:11}},grid:{color:'#1a2235'}},
        y:{ticks:{color:'#64748b',font:{family:'Heebo',size:11},callback:v=>'₪'+Math.round(v/1000)+'k'},grid:{color:'#1a2235'}}
      }
    }
  });
}

// ══ PDF EXPORT ══
async function exportPDF(){
  // Sync textarea values into D before building PDF
  collectAll();

  // Always fetch fresh advisor notes from Firestore so we don't miss notes added after login
  if(CU){
    try{
      const snap=await db.collection('users').doc(CU).collection('data').doc('main').get();
      if(snap.exists){const fresh=snap.data();if(fresh.advisorNotes)D.advisorNotes=fresh.advisorNotes;}
    }catch(e){console.warn('Could not refresh notes:',e);}
  }

  const cur=calcCurrent();
  const snaps=D.snapshots||[];
  const uname=document.getElementById('uname').textContent||'';
  const now=new Date().toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'});
  const logoSrc='data:image/png;base64,'+LOGO_B64;

  // Net worth breakdown
  const latestCol=getLatestNWCol();
  const nwAssets=sumSec('assets',latestCol),nwInvest=sumSec('investments',latestCol);
  const nwSavings=sumSec('savings',latestCol),nwDebts=sumSec('debts',latestCol);
  const nwTotal=nwAssets+nwInvest+nwSavings-nwDebts;
  const nwPeriodLabel=D.nwPeriods[latestCol]||'';

  // Goals rows with monthly calc
  const goalRows=(D.goals||[]).filter(gl=>!gl.done).map(gl=>{
    const sv=parseFloat(gl.saved)||0,nd=parseFloat(gl.needed)||0;
    const svCur=gl.savedCurrency||'ILS',ndCur=gl.neededCurrency||'ILS';
    const pct=nd>0?Math.min(100,Math.round(sv/nd*100)):0;
    const monthly=nd>sv&&nd>0?Math.ceil((nd-sv)/GOAL_HZ_MONTHS[Math.max(0,gl.h||0)]):0;
    return `<tr>
      <td>${esc(gl.name)}</td>
      <td>${fmtCur(sv,svCur)}</td><td>${fmtCur(nd,ndCur)}</td>
      <td><div class="pbar-pdf"><div class="pfill-pdf" style="width:${pct}%"></div></div><span>${pct}%</span></td>
      <td>${HZ[Math.max(0,gl.h||0)]}</td>
      <td>${monthly?fmtCur(monthly,ndCur)+'/חודש':'—'}</td>
    </tr>`;
  }).join('');

  // Pension rows
  const penRows=(D.pension||[]).map(p=>`<tr>
    <td>${esc(p.name)}</td>
    <td class="num">${p.amount?fmt(parseFloat(p.amount)):'—'}</td>
    <td>${esc(p.house)||'—'}</td>
    <td>${p.feesDeposit?p.feesDeposit+'%':'—'}</td>
    <td>${p.feesAccum?p.feesAccum+'%':'—'}</td>
    <td>${p.date||'—'}</td>
  </tr>`).join('');

  // Portfolio rows
  const portRows=(D.portfolios||[]).flatMap(port=>
    (port.items||[]).filter(it=>it.name&&it.value).map(it=>`<tr>
      <td>${esc(port.brokerName)||'—'}</td>
      <td>${esc(it.name)}</td>
      <td>${esc(it.category)}</td>
      <td class="num">${fmt(parseFloat(it.value)||0)}</td>
      <td>${it.targetPct?it.targetPct+'%':'—'}</td>
    </tr>`)
  ).join('');

  // History rows (last 10)
  const histRows=[...snaps].reverse().slice(0,10).map(s=>{
    const prev=snaps[snaps.indexOf(s)-1];
    const delta=prev?s.netWorth-(prev.netWorth||0):null;
    return `<tr>
      <td>${s.label||'—'} · ${fmtDate(s.date)}</td>
      <td class="num">${fmt(s.netWorth||0)}</td>
      <td class="num" style="color:${delta===null?'inherit':delta>=0?'#059669':'#dc2626'}">${delta===null?'—':(delta>=0?'+':'')+fmt(delta)}</td>
      <td class="num">${fmt(s.monthly||0)}</td>
      <td class="num">${fmt(s.penTotal||0)}</td>
    </tr>`;
  }).join('');

  const html=`<!DOCTYPE html><html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>סיכום פיננסי — ${esc(uname)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Arial',sans-serif;direction:rtl;color:#1e293b;background:#fff;font-size:13px;line-height:1.5;}
  /* HEADER */
  .pdf-header{background:#080c14;color:#f1f5f9;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;margin-bottom:0;}
  .pdf-header img{height:32px;object-fit:contain;filter:brightness(1);}
  .pdf-header-text h1{font-size:18px;font-weight:800;color:#42ebd6;margin-bottom:2px;}
  .pdf-header-text p{font-size:11px;color:#94a3b8;}
  /* CONTENT */
  .pdf-body{padding:24px 32px;}
  /* SECTION */
  .section{margin-bottom:28px;break-inside:avoid;}
  .section-title{font-size:13px;font-weight:800;color:#0d1220;border-right:4px solid #42ebd6;padding-right:10px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em;}
  /* KPI TILES */
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;text-align:right;}
  .kpi.teal{border-color:#a7f3d0;background:linear-gradient(135deg,#f0fdf4,#f8fafc);}
  .kpi label{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px;}
  .kpi .val{font-size:20px;font-weight:900;color:#0d1220;letter-spacing:-0.5px;}
  .kpi .sub{font-size:10px;color:#94a3b8;margin-top:3px;}
  /* NW BREAKDOWN */
  .nw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px;}
  .nw-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;text-align:right;}
  .nw-item label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;display:block;margin-bottom:4px;}
  .nw-item .v{font-size:14px;font-weight:800;color:#0d1220;}
  .nw-item.debts .v{color:#dc2626;}
  /* TABLES */
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
  th{background:#0f172a;color:#f1f5f9;padding:8px 10px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.04em;}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;}
  td.num{direction:ltr;text-align:left;font-weight:700;color:#0d1220;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#fafafa;}
  /* PROGRESS BAR in table */
  .pbar-pdf{display:inline-block;width:60px;height:6px;background:#e2e8f0;border-radius:3px;vertical-align:middle;margin-left:6px;}
  .pfill-pdf{height:100%;border-radius:3px;background:linear-gradient(90deg,#2dd4bf,#42ebd6);}
  /* ADVISOR NOTES */
  .note-item{padding:12px 14px;border-right:3px solid #42ebd6;margin-bottom:10px;background:#f8fafc;border-radius:0 8px 8px 0;}
  .note-item:last-child{margin-bottom:0;}
  .note-date{font-size:10px;color:#64748b;font-weight:700;margin-bottom:5px;}
  .note-text{font-size:13px;color:#1e293b;line-height:1.7;white-space:pre-wrap;}
  /* FOOTER */
  .pdf-footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;}
  .pdf-footer img{height:18px;opacity:.5;object-fit:contain;}
  /* PRINT */
  @media print{
    body{font-size:12px;}
    .pdf-header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .section{break-inside:avoid;}
    @page{margin:0;size:A4;}
  }
</style>
</head>
<body>

<div class="pdf-header">
  <img src="${logoSrc}" alt="Tom Ani"/>
  <div class="pdf-header-text" style="text-align:right">
    <h1>סיכום פיננסי אישי</h1>
    <p>${esc(uname)} &nbsp;·&nbsp; הופק: ${now}</p>
  </div>
</div>

<div class="pdf-body">

  <!-- KPI TILES -->
  <div class="kpi-row">
    <div class="kpi teal">
      <label>שווי נטו${nwPeriodLabel?' ('+nwPeriodLabel+')':''}</label>
      <div class="val">${fmt(nwTotal)}</div>
      <div class="sub">נכסים פחות חובות</div>
    </div>
    <div class="kpi">
      <label>חיסכון חודשי</label>
      <div class="val">${fmt(cur.monthly)}</div>
      <div class="sub">זמין להשקעה</div>
    </div>
    <div class="kpi">
      <label>פנסיה ואפיקי חיסכון</label>
      <div class="val">${fmt(cur.penTotal)}</div>
      <div class="sub">${(D.pension||[]).filter(p=>p.amount).length} מוצרים</div>
    </div>
    <div class="kpi">
      <label>התקדמות מטרות</label>
      <div class="val">${cur.goalsNeeded>0?Math.round(cur.goalsSaved/cur.goalsNeeded*100)+'%':'—'}</div>
      <div class="sub">${(D.goals||[]).filter(gl=>!gl.done).length} מטרות פעילות</div>
    </div>
  </div>

  <!-- NET WORTH BREAKDOWN -->
  ${nwTotal!==0?`<div class="section">
    <div class="section-title">פירוט שווי נטו</div>
    <div class="nw-grid">
      <div class="nw-item"><label>נכסים</label><div class="v">${fmt(nwAssets)}</div></div>
      <div class="nw-item"><label>השקעות ופנסיה</label><div class="v">${fmt(nwInvest)}</div></div>
      <div class="nw-item"><label>חסכונות</label><div class="v">${fmt(nwSavings)}</div></div>
      <div class="nw-item debts"><label>חובות</label><div class="v">${nwDebts>0?'−'+fmt(nwDebts):'—'}</div></div>
    </div>
  </div>`:''}

  <!-- GOALS -->
  ${goalRows?`<div class="section">
    <div class="section-title">מטרות חיסכון פעילות</div>
    <table>
      <thead><tr><th>מטרה</th><th>נחסך</th><th>יעד</th><th>התקדמות</th><th>טווח</th><th>חיסכון חודשי נדרש</th></tr></thead>
      <tbody>${goalRows}</tbody>
    </table>
  </div>`:''}

  <!-- ASSETS INVENTORY -->
  ${(()=>{
    const assets=(D.locations||[]).filter(l=>!l._auto&&l.name);
    if(!assets.length)return '';
    const rows=assets.map(l=>`<tr><td>${esc(l.name)}</td><td class="num">${fmtCur(parseFloat(l.amount)||0,l.currency||'ILS')}</td></tr>`).join('');
    const totByCur={};
    assets.forEach(l=>{const c=l.currency||'ILS',a=parseFloat(l.amount)||0;if(a)totByCur[c]=(totByCur[c]||0)+a;});
    const totalRows=Object.entries(totByCur).map(([c,a])=>
      `<tr style="font-weight:800;border-top:2px solid #e2e8f0"><td>סה"כ ${c==='ILS'?'שקל':c==='USD'?'דולר':'אירו'}</td><td class="num">${fmtCur(a,c)}</td></tr>`).join('');
    return `<div class="section"><div class="section-title">רשימת נכסים נוכחית</div>
    <table><thead><tr><th>שם נכס</th><th>סכום</th></tr></thead>
    <tbody>${rows}${totalRows}</tbody></table></div>`;
  })()}

  <!-- TRANSFER PLAN -->
  ${(()=>{
    const transfers=(D.locations||[]).filter(l=>!l._auto&&l.name&&(l.whereTo||'').trim());
    if(!transfers.length)return '';
    const rows=transfers.map(l=>`<tr><td>${esc(l.name)}</td><td class="num">${fmtCur(parseFloat(l.amount)||0,l.currency||'ILS')}</td><td>${esc(l.whereTo)}</td></tr>`).join('');
    return `<div class="section"><div class="section-title">תכנית העברת כספים</div>
    <table><thead><tr><th>נכס נוכחי</th><th>סכום</th><th>לאן מועבר</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
  })()}

  <!-- PENSION -->
  ${penRows?`<div class="section">
    <div class="section-title">מוצרי פנסיה ואפיקי חיסכון</div>
    <table>
      <thead><tr><th>מוצר</th><th>יתרה</th><th>בית השקעות</th><th>דמי ניהול הפקדה</th><th>דמי ניהול צבירה</th><th>בדיקה אחרונה</th></tr></thead>
      <tbody>${penRows}</tbody>
    </table>
  </div>`:''}
  ${D.penNotes?`<div class="section" style="break-inside:avoid">
    <div class="section-title">הערות פנסיה</div>
    <div style="font-size:13px;color:#1e293b;line-height:1.8;white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:14px 16px;border-right:3px solid #42ebd6">${esc(D.penNotes)}</div>
  </div>`:''}

  <!-- PORTFOLIO -->
  ${portRows?`<div class="section">
    <div class="section-title">תיק השקעות</div>
    <table>
      <thead><tr><th>ברוקר</th><th>נייר ערך</th><th>קטגוריה</th><th>שווי</th><th>אחוז יעד</th></tr></thead>
      <tbody>${portRows}</tbody>
    </table>
  </div>`:''}

  <!-- HISTORY -->
  ${histRows?`<div class="section">
    <div class="section-title">היסטוריית תמונות מצב${snaps.length>10?' (10 אחרונות)':''}</div>
    <table>
      <thead><tr><th>תקופה</th><th>שווי נטו</th><th>שינוי</th><th>חיסכון חודשי</th><th>פנסיה</th></tr></thead>
      <tbody>${histRows}</tbody>
    </table>
  </div>`:''}

  <!-- CLIENT NOTES -->
  ${D.gnotes?`<div class="section" style="break-inside:avoid">
    <div class="section-title">הערות חופשיות</div>
    <div style="font-size:13px;color:#1e293b;line-height:1.8;white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:14px 16px;border-right:3px solid #42ebd6">${esc(D.gnotes)}</div>
  </div>`:''}

  <!-- ADVISOR NOTES -->
  ${(D.advisorNotes&&D.advisorNotes.length)?`<div class="section" style="break-inside:avoid">
    <div class="section-title">הערות יועץ</div>
    <div>${D.advisorNotes.map(n=>`<div class="note-item">
      <div class="note-date">${fmtDate(n.date)}</div>
      <div class="note-text">${esc(n.text)}</div>
    </div>`).join('')}</div>
  </div>`:''}

</div><!-- /pdf-body -->

<div class="pdf-footer" style="padding:0 32px 20px">
  <span>מערכת מעקב פיננסי | Tom Ani | info@tomani.co</span>
  <img src="${logoSrc}" alt=""/>
</div>

</body></html>`;

  const w=window.open('','_blank','width=1000,height=750');
  if(!w){showToast('⚠️ אפשר פופ-אפים בדפדפן ונסה שוב');return;}
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),900);
}


