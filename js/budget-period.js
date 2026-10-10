// ══ MONTHLY BUDGET — summary for a period the client picks (התנהלות חודשית) ══
// How much came in / went out over the chosen months, and the monthly average of every category.
// Works on [{months, profile}] entries: the account being edited, or every account together
// (the "all accounts" view). Months still ahead (e.g. rent filled in advance via 🔁) don't count,
// and neither do months with nothing filled in.
// open = the card is expanded (collapsed by default; stays as the client left it while they work)
let _bPer={preset:'3',from:'',to:'',open:false};
const _BPER_PRESETS=[['3','3 חודשים'],['6','חצי שנה'],['12','שנה'],['year','השנה'],['all','הכל']];
const _BPER_SECS=[
  ['income','💰 הכנסות','var(--teal)'],['needs','🏠 צרכים','var(--green)'],['wants','🎉 כיף','var(--amber)'],
  ['business','💼 עסק','#a78bfa'],['bizInvest','📈 הועבר להשקעות','#60a5fa'],['bizIncome','💼 הכנסות העסק','var(--teal)']];

function budgetPeriodSet(field,val){
  if(field==='preset')_bPer.preset=val;
  else{_bPer[field]=val;_bPer.preset='custom';if(_bPer.from&&_bPer.to&&_bPer.from>_bPer.to){const t=_bPer.from;_bPer.from=_bPer.to;_bPer.to=t;}}
  budgetPeriodRefresh();
}
function budgetPeriodRefresh(){
  if(D.budgetView==='all'&&typeof budgetAccEntries==='function')renderBudgetPeriod('budget-period-all',budgetAccEntries());
  else renderBudgetPeriod('budget-period-card',[{months:D.budgetMonths||{},profile:D.budgetProfile||{}}]);
}
function renderBudgetPeriod(elId,entries){
  const el=document.getElementById(elId);if(!el)return;
  const sum=rows=>(rows||[]).reduce((s,r)=>s+budgetRowAmt(r),0);
  // months with something filled in (any account), up to the current month
  const now=currentMonthKey(),has={};
  entries.forEach(e=>Object.entries(e.months||{}).forEach(([k,m])=>{
    if(k>now||!m)return;const s=budgetSavedOf(m,e.profile,e.months);
    if(s.inc||s.exp||sum(m.business)||sum(m.bizIncome))has[k]=true;}));
  const all=Object.keys(has).sort();
  if(all.length<2){el.style.display='none';el.innerHTML='';return;}
  el.style.display='';
  // the chosen period
  let from,to=all[all.length-1];
  const p=_bPer.preset;
  if(p==='custom'){from=_bPer.from||all[0];to=_bPer.to||to;}
  else if(p==='all')from=all[0];
  else if(p==='year')from=to.slice(0,4)+'-01';
  else from=_bKeyShift(to,-(+p-1));
  const ks=all.filter(k=>k>=from&&k<=to),N=ks.length;
  // totals per month + per category
  const per=ks.map(k=>({k,inc:0,exp:0,inv:0,bizIn:0,bizOut:0}));
  const cats={};let sepBiz=false;
  entries.forEach(e=>{
    const pr=e.profile||{},sep=!!(pr.selfEmployed&&pr.bizMode==='separate'),comb=!!(pr.selfEmployed&&!sep);
    if(sep)sepBiz=true;
    ks.forEach((k,i)=>{const m=(e.months||{})[k];if(!m)return;
      const s=budgetSavedOf(m,pr,e.months);per[i].inc+=s.inc;per[i].exp+=s.exp;per[i].inv+=s.inv||0;
      if(sep){per[i].bizIn+=sum(m.bizIncome);per[i].bizOut+=sum(m.business)+sum(m.bizInvest);}
      const secs=['income','needs','wants'].concat(comb||sep?['business','bizInvest']:[]).concat(sep?['bizIncome']:[]);
      secs.forEach(sec=>(m[sec]||[]).forEach(r=>{const n=(r.name||'').trim(),v=budgetRowAmt(r);if(!n||!v)return;
        const c=cats[sec+'|'+n]=cats[sec+'|'+n]||{sec,n,total:0,months:new Set()};c.total+=v;c.months.add(k);}));
    });
  });
  const T=per.reduce((t,x)=>{['inc','exp','inv','bizIn','bizOut'].forEach(f=>t[f]+=x[f]);return t;},{inc:0,exp:0,inv:0,bizIn:0,bizOut:0});
  const left=T.inc-T.exp,avg=v=>N?v/N:0;
  const signed=v=>iln((v>=0?'':'−')+fmt(Math.abs(v)));
  const btn=(on,label,js)=>`<button onclick="${js}" style="background:${on?'var(--teal-dim,rgba(66,235,214,.15))':'var(--s2)'};border:1px solid ${on?'var(--teal-border)':'var(--border)'};color:${on?'var(--teal)':'var(--t2)'};border-radius:16px;padding:4px 10px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">${label}</button>`;
  const sel=(field,val)=>`<select onchange="budgetPeriodSet('${field}',this.value)" style="background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:var(--font);font-size:12.5px;padding:3px 6px">${all.map(k=>`<option value="${k}"${k===val?' selected':''}>${fmtBudgetMonth(k)}</option>`).join('')}</select>`;
  const tile=(lbl,v,c,sub)=>`<div style="flex:1;min-width:120px;background:var(--s2);border-radius:10px;padding:9px 8px;text-align:center">
    <div style="font-size:11.5px;color:var(--t3)">${lbl}</div>
    <div style="font-size:18px;font-weight:800;color:${c}">${v}</div>
    <div style="font-size:11px;color:var(--t3)">${sub}</div></div>`;
  const catHtml=_BPER_SECS.map(([sec,lbl,color])=>{
    const list=Object.values(cats).filter(c=>c.sec===sec).sort((a,b)=>b.total-a.total);if(!list.length)return '';
    const st=list.reduce((s,c)=>s+c.total,0);
    const sepNote=sepBiz&&(sec==='business'||sec==='bizIncome'||sec==='bizInvest')?' <span style="font-size:10.5px;color:var(--t3);font-weight:400">(תזרים נפרד)</span>':'';
    return `<tr><td colspan="3" style="padding:10px 4px 4px;font-weight:800;color:${color}">${lbl}${sepNote}</td></tr>
      ${list.map(c=>`<tr style="border-top:1px solid var(--border)">
        <td style="padding:5px 4px">${esc(c.n)}${c.months.size<N?` <span style="font-size:10.5px;color:var(--t3)">(ב־${c.months.size} מתוך ${N} חודשים)</span>`:''}</td>
        <td style="padding:5px 4px;text-align:center;white-space:nowrap;color:var(--t2)">${iln(fmt(c.total))}</td>
        <td style="padding:5px 4px;text-align:center;white-space:nowrap;font-weight:700">${iln(fmt(avg(c.total)))}</td></tr>`).join('')}
      <tr style="border-top:1px solid var(--border);font-weight:800;font-size:12px;color:var(--t2)">
        <td style="padding:5px 4px">סה"כ ${lbl.replace(/^\S+\s/,'')}</td><td style="padding:5px 4px;text-align:center">${iln(fmt(st))}</td><td style="padding:5px 4px;text-align:center">${iln(fmt(avg(st)))}</td></tr>`;
  }).join('');
  el.innerHTML=`<details${_bPer.open?' open':''} ontoggle="_bPer.open=this.open;this.querySelector('.bper-tg').textContent=this.open?'▲ סגירה':'▼ פתיחה'">
    <summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:8px">
      <span class="ch-title" style="margin:0">📅 סיכום לתקופה${entries.length>1?' — כל החשבונות':''}</span>
      <span class="bper-tg" style="font-size:12px;color:var(--teal);white-space:nowrap">${_bPer.open?'▲ סגירה':'▼ פתיחה'}</span>
    </summary>
    <div class="ch-hint" style="margin-top:6px">בחרו תקופה — ותראו כמה נכנס, כמה יצא, ומה הממוצע החודשי של כל קטגוריה.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0">
      ${_BPER_PRESETS.map(([v,l])=>btn(p===v,l,`budgetPeriodSet('preset','${v}')`)).join('')}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--t2);margin-bottom:10px">
      מ־${sel('from',ks[0]||from)} עד ${sel('to',ks[N-1]||to)}
      <span style="color:var(--t3);font-size:11.5px">· ${N} חודשים עם נתונים</span>
    </div>
    ${!N?`<div style="color:var(--t3);font-size:12.5px;text-align:center;padding:10px">אין נתונים בתקופה הזו</div>`:`
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${tile('💰 נכנס',iln(fmt(T.inc)),'var(--teal)','ממוצע '+iln(fmt(avg(T.inc)))+' לחודש')}
      ${tile('💸 יצא',iln(fmt(T.exp)),'var(--white)','ממוצע '+iln(fmt(avg(T.exp)))+' לחודש')}
      ${tile(left>=0?'✅ נשאר':'⚠️ גירעון',signed(left),left>=0?'var(--teal)':'var(--red)','ממוצע '+signed(avg(left))+' לחודש')}
    </div>
    ${T.inv>0?`<div style="font-size:11.5px;color:#60a5fa;margin-top:6px">📈 מתוך היציאות, ${iln(fmt(T.inv))} הופקדו לפנסיה / השתלמות (ממוצע ${iln(fmt(avg(T.inv)))} לחודש) — זה חיסכון, לא בזבוז. סה"כ חיסכון בתקופה: ${iln(fmt(Math.max(0,left)+T.inv))}</div>`:''}
    ${sepBiz&&(T.bizIn||T.bizOut)?`<div style="font-size:11.5px;color:var(--t2);margin-top:6px">💼 העסק (תזרים נפרד, לא כלול למעלה): נכנסו ${iln(fmt(T.bizIn))}, יצאו ${iln(fmt(T.bizOut))} — נשאר ${signed(T.bizIn-T.bizOut)}</div>`:''}
    <details open style="margin-top:12px">
      <summary style="cursor:pointer;font-size:13px;font-weight:800">📊 ממוצע לפי קטגוריה</summary>
      <div style="font-size:11px;color:var(--t3);margin:3px 0 4px">הממוצע = הסכום בתקופה חלקי ${N} החודשים — גם הוצאה שהופיעה רק פעם אחת (חופשה, טסט) מתפרסת על כל התקופה, כמו שצריך לתכנן אותה.</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="color:var(--t3);font-size:11px"><th style="text-align:right;padding:4px">קטגוריה</th><th style="padding:4px">סה"כ בתקופה</th><th style="padding:4px">ממוצע לחודש</th></tr></thead>
        <tbody>${catHtml}</tbody></table></div>
    </details>
    <details style="margin-top:8px">
      <summary style="cursor:pointer;font-size:13px;font-weight:800">🗓️ לפי חודש</summary>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px">
        <thead><tr style="color:var(--t3);font-size:11px"><th style="text-align:right;padding:4px">חודש</th><th style="padding:4px">נכנס</th><th style="padding:4px">יצא</th><th style="padding:4px">נשאר</th></tr></thead>
        <tbody>${per.map(x=>`<tr style="border-top:1px solid var(--border)"><td style="padding:5px 4px">${fmtBudgetMonth(x.k)}</td>
          <td style="padding:5px 4px;text-align:center;white-space:nowrap;color:var(--teal)">${iln(fmt(x.inc))}</td>
          <td style="padding:5px 4px;text-align:center;white-space:nowrap">${iln(fmt(x.exp))}</td>
          <td style="padding:5px 4px;text-align:center;white-space:nowrap;font-weight:700;color:${x.inc-x.exp>=0?'var(--teal)':'var(--red)'}">${signed(x.inc-x.exp)}</td></tr>`).join('')}</tbody></table></div>
    </details>`}
  </details>`;
}
