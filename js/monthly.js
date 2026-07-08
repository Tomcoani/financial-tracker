// ══ MONTHLY UPDATE WIZARD ══
// One focused flow for the client's monthly refresh: pension → portfolio →
// goals → net-worth column → summary. Writes into D live; ביטול restores a
// backup taken on open.
let _muStep=0,_muSteps=[],_muBackup=null,_muSyncCol=-1;

function openMonthlyUpdate(){
  collectAll();
  _muBackup=JSON.parse(JSON.stringify({pension:D.pension,portfolios:D.portfolios,goals:D.goals,nwData:D.nwData}));
  _muSteps=[];
  if((D.pension||[]).some(p=>(p.name||'').trim()))_muSteps.push('pension');
  if((D.portfolios||[]).some(pf=>(pf.items||[]).some(it=>(it.name||'').trim())))_muSteps.push('portfolio');
  if((D.goals||[]).some(g=>!g.done&&(g.name||'').trim()))_muSteps.push('goals');
  const cnt=D.nwPeriodsCount||6;
  _muSyncCol=-1;
  for(let c=cnt-1;c>=0;c--){const p=D.nwPeriods[c];if(p&&!isFuturePeriod(p)){_muSyncCol=c;break;}}
  if(_muSyncCol>=0)_muSteps.push('nw');
  _muSteps.push('done');
  if(_muSteps.length===1){showToast('אין עדיין נתונים לעדכן — התחל למלא את הטאבים');return;}
  _muStep=0;
  document.getElementById('monthly-modal').style.display='flex';
  muRender();
}
function muCancel(){
  if(_muBackup){
    D.pension=_muBackup.pension;D.portfolios=_muBackup.portfolios;
    D.goals=_muBackup.goals;D.nwData=_muBackup.nwData;
    _muBackup=null;
    renderPension();renderPortfolio();renderGoals();renderNW();
  }
  document.getElementById('monthly-modal').style.display='none';
}
function muClose(){
  _muBackup=null;
  document.getElementById('monthly-modal').style.display='none';
}
function muNext(){
  if(_muStep<_muSteps.length-1){_muStep++;muRender();}
}
function muPrev(){
  if(_muStep>0){_muStep--;muRender();}
}
const MU_TITLES={
  pension:{icon:'🏦',title:'פנסיה וקרן השתלמות',hint:'כמה כסף יש בכל מוצר נכון להיום? אפשר למצוא באזור האישי של בית ההשקעות או במסלקה הפנסיונית.'},
  portfolio:{icon:'📊',title:'תיק השקעות',hint:'עדכן את השווי הנוכחי של כל נייר ערך לפי אפליקציית המסחר שלך.'},
  goals:{icon:'🎯',title:'המטרות שלי',hint:'כמה כסף צברת עד עכשיו לכל מטרה?'},
  nw:{icon:'📈',title:'שווי נטו',hint:''},
  done:{icon:'🎉',title:'סיימת!',hint:''},
};
function muRender(){
  const step=_muSteps[_muStep];
  const meta=MU_TITLES[step];
  const body=document.getElementById('monthly-body');
  const head=document.getElementById('monthly-head');
  const btns=document.getElementById('monthly-btns');
  // Step dots (exclude the done step from the count)
  const total=_muSteps.length-1;
  const dots=_muSteps.slice(0,total).map((_,i)=>
    `<span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${i<_muStep?'var(--teal)':i===_muStep?'var(--teal)':'var(--border)'};opacity:${i===_muStep?1:i<_muStep?.55:1}"></span>`).join('');
  head.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <h2 style="margin:0">${meta.icon} ${meta.title}</h2>
      ${step!=='done'?`<span style="font-size:11px;color:var(--t3)">שלב ${_muStep+1} מתוך ${total}</span>`:''}
    </div>
    ${step!=='done'?`<div style="display:flex;gap:5px;margin-bottom:10px">${dots}</div>`:''}
    ${meta.hint?`<p style="font-size:12.5px;color:var(--t2);margin:0 0 12px;line-height:1.6">${meta.hint}</p>`:''}`;
  if(step==='pension')body.innerHTML=muPensionHtml();
  else if(step==='portfolio')body.innerHTML=muPortfolioHtml();
  else if(step==='goals')body.innerHTML=muGoalsHtml();
  else if(step==='nw'){muApplyNWSuggestions();body.innerHTML=muNWHtml();}
  else if(step==='done'){muFinish();body.innerHTML=muDoneHtml();}
  const last=_muStep===_muSteps.length-2; // last data step before done
  if(step==='done'){
    btns.innerHTML=`<button class="btnsnap primary" style="flex:1" onclick="muClose()">סגור</button>`;
  } else {
    btns.innerHTML=`
      <button class="btnsnap secondary" onclick="muCancel()">ביטול</button>
      ${_muStep>0?`<button class="btnsnap secondary" onclick="muPrev()">→ הקודם</button>`:''}
      <button class="btnsnap primary" style="flex:1" onclick="muNext()">${last?'סיים עדכון ✓':'הבא ←'}</button>`;
  }
  setTimeout(attachAllNumFormats,0);
}
const MU_INPUT_STYLE='width:130px;background:var(--s2);border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--teal);font-family:var(--font);font-size:14px;font-weight:700;outline:none;text-align:right;direction:rtl';
function muRow(label,sub,inputHtml){
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(30,45,69,.5)">
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</div>
      ${sub?`<div style="font-size:11px;color:var(--t3)">${sub}</div>`:''}
    </div>
    ${inputHtml}
  </div>`;
}
// ── Step: pension ──
function muPensionHtml(){
  return (D.pension||[]).map((p,i)=>{
    if(!(p.name||'').trim())return '';
    return muRow(esc(p.name),esc(p.house||''),
      `<input type="number" value="${p.amount||''}" placeholder="0" oninput="muPen(${i},this.value)" style="${MU_INPUT_STYLE}"/>`);
  }).join('')||'<p style="color:var(--t3);font-size:13px">אין מוצרים פנסיוניים</p>';
}
function muPen(i,val){D.pension[i].amount=val;touchSection('pension');markDirty();}
// ── Step: portfolio ──
function muPortfolioHtml(){
  let html='';
  (D.portfolios||[]).forEach((pf,pi)=>{
    const items=(pf.items||[]).map((it,ii)=>({it,ii})).filter(({it})=>(it.name||'').trim());
    if(!items.length)return;
    if((pf.brokerName||'').trim())html+=`<div style="font-size:12px;font-weight:700;color:var(--teal);margin:12px 0 2px">${esc(pf.brokerName)}</div>`;
    items.forEach(({it,ii})=>{
      html+=muRow(esc(it.name),esc(it.category||''),
        `<input type="number" value="${it.value||''}" placeholder="0" oninput="muPort(${pi},${ii},this.value)" style="${MU_INPUT_STYLE}"/>`);
    });
  });
  return html||'<p style="color:var(--t3);font-size:13px">אין ניירות ערך בתיק</p>';
}
function muPort(pi,ii,val){D.portfolios[pi].items[ii].value=val;touchSection('pension');markDirty();}
// ── Step: goals ──
function muGoalsHtml(){
  let html='';
  (D.goals||[]).forEach((gl,gi)=>{
    if(gl.done||!(gl.name||'').trim())return;
    const needed=parseFloat(gl.needed)||0;
    const sub=needed?`יעד: ${fmt(needed)}`:'';
    if(Array.isArray(gl.goalLocs)&&gl.goalLocs.length){
      html+=`<div style="font-size:12px;font-weight:700;color:var(--teal);margin:12px 0 2px">${esc(gl.name)}${sub?` <span style="font-weight:400;color:var(--t3)">· ${sub}</span>`:''}</div>`;
      gl.goalLocs.forEach((loc,li)=>{
        html+=muRow(esc(loc.where||'ללא שם'),'',
          `<input type="number" value="${loc.amount||''}" placeholder="0" oninput="muGoalLoc(${gi},${li},this.value)" style="${MU_INPUT_STYLE}"/>`);
      });
    } else {
      html+=muRow(esc(gl.name),sub,
        `<input type="number" value="${gl.saved||''}" placeholder="0" oninput="muGoalSaved(${gi},this.value)" style="${MU_INPUT_STYLE}"/>`);
    }
  });
  return html||'<p style="color:var(--t3);font-size:13px">אין מטרות פעילות</p>';
}
function muGoalLoc(gi,li,val){
  const gl=D.goals[gi];
  gl.goalLocs[li].amount=val;
  gl.saved=String(gl.goalLocs.reduce((s,l)=>s+(parseFloat(l.amount)||0),0));
  touchSection('goals');markDirty();
}
function muGoalSaved(gi,val){D.goals[gi].saved=val;touchSection('goals');markDirty();}
// ── Step: net worth ──
// Push fresh pension/portfolio numbers into the sync column (investments rows
// only), reusing syncNWFromPension's matching logic on a throwaway copy.
function muApplyNWSuggestions(){
  if(_muSyncCol<0)return;
  const saved=D.nwData;
  D.nwData=JSON.parse(JSON.stringify(saved));
  D.nwData.investments.rows.forEach(r=>{r.vals[_muSyncCol]='';});
  try{syncNWFromPension(true);}catch(e){}
  const clone=D.nwData;
  D.nwData=saved;
  clone.investments.rows.forEach(cr=>{
    if(!cr.vals[_muSyncCol])return;
    let row=D.nwData.investments.rows.find(r=>r.name===cr.name);
    if(!row){row={name:cr.name,vals:Array(D.nwPeriodsCount||6).fill('')};D.nwData.investments.rows.push(row);}
    row.vals[_muSyncCol]=cr.vals[_muSyncCol];
  });
}
function muNWHtml(){
  const period=D.nwPeriods[_muSyncCol]||'';
  const secs=[
    {sec:'assets',label:'נכסים',icon:'🏠'},
    {sec:'investments',label:'השקעות',icon:'📈'},
    {sec:'savings',label:'חסכונות',icon:'🐷'},
    {sec:'debts',label:'חובות',icon:'💳'},
  ];
  let html=`<p style="font-size:12.5px;color:var(--t2);margin:0 0 10px;line-height:1.6">
    עדכון לתקופה <strong style="color:var(--teal)">${esc(period)}</strong>.
    שורות ההשקעות כבר מולאו מהמספרים שהזנת בשלבים הקודמים — עבור על השאר ועדכן מה שהשתנה.</p>`;
  secs.forEach(({sec,label,icon})=>{
    const rows=(D.nwData[sec].rows||[]).map((r,ri)=>({r,ri})).filter(({r})=>(r.name||'').trim());
    if(!rows.length)return;
    html+=`<div style="font-size:12px;font-weight:700;color:var(--teal);margin:12px 0 2px">${icon} ${label}</div>`;
    rows.forEach(({r,ri})=>{
      html+=muRow(esc(r.name),'',
        `<input type="number" value="${r.vals[_muSyncCol]||''}" placeholder="0" oninput="muNW('${sec}',${ri},this.value)" style="${MU_INPUT_STYLE}"/>`);
    });
  });
  return html;
}
function muNW(sec,ri,val){
  D.nwData[sec].rows[ri].vals[_muSyncCol]=String(val).replace(/,/g,'').trim();
  touchSection('nw');markDirty();
}
// ── Step: done ──
function muFinish(){
  renderPension();renderPortfolio();renderGoals();renderNW();
  if(typeof renderLocsAutoSummary==='function')renderLocsAutoSummary();
  markDirty();manualSave();
  _muBackup=null;
}
function muDoneHtml(){
  let deltaHtml='';
  if(_muSyncCol>=0){
    const nwAt=c=>sumSecBestAtCol('assets',c)+sumSecBestAtCol('investments',c)+sumSecBestAtCol('savings',c)-sumSecBestAtCol('debts',c);
    const now=nwAt(_muSyncCol);
    let prev=null;
    for(let c=_muSyncCol-1;c>=0;c--){
      const p=D.nwPeriods[c];
      if(p&&!isFuturePeriod(p)){const v=nwAt(c);if(v){prev=v;break;}}
    }
    deltaHtml=`<div style="font-size:26px;font-weight:800;color:var(--teal);margin:8px 0 2px">${fmt(now)}</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:8px">השווי הנקי שלך</div>`;
    if(prev!==null&&prev!==now){
      const d=now-prev;
      deltaHtml+=`<div style="font-size:15px;font-weight:700;color:${d>0?'var(--green)':'var(--red)'}">${d>0?'↑ עלייה של +':'↓ ירידה של '}${fmt(d)} מהתקופה הקודמת</div>`;
    }
  }
  return `<div style="text-align:center;padding:14px 0">
    <div style="font-size:44px;margin-bottom:6px">🎉</div>
    <div style="font-size:16px;font-weight:700;color:var(--white)">כל הנתונים עודכנו ונשמרו!</div>
    ${deltaHtml}
    <div style="font-size:12px;color:var(--t3);margin-top:10px">נתראה בעדכון הבא 👋</div>
  </div>`;
}
