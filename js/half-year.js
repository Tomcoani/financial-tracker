// ══ HALF-YEARLY UPDATE TRACK (מסלול עדכון חצי-שנתי) ══
// A guided path through everything that has to be refreshed every six months: pension → portfolio →
// goals → net worth. Every station says what the client fills in by hand and what comes in by itself,
// so nothing gets missed. Three traps it covers:
//  • net worth is literal per column — a new column holds only what was entered in it, so a half-filled
//    one makes the net worth drop. Each row shows its last value with a "no change" button.
//  • the portfolio does NOT flow into the "שוק ההון" row — the last station offers its total.
//  • pension amounts auto-fill only EMPTY cells of the column of their check date — so an amount updated
//    with an old date never reaches the new column. Typing an amount here moves a stale date to today,
//    and auto-filled cells of the current column are refilled with the latest amount.
// Done: D.halfYear={lastDone:iso} + a snapshot, so the next update can be compared with this one.
const _HY_DAY=86400000,_HY_DAYS=180;
let _hyStep=0,_hyActive=false;

function _hyOld(iso,days){const t=iso?Date.parse(iso):NaN;return isNaN(t)||Date.now()-t>=days*_HY_DAY;}
function _hyToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _hyNum(v){return parseFloat(String(v??'').replace(/,/g,''))||0;}
function _hyLU(k){return (D.lastUpdated||{})[k];}
function _hyPensions(){return D.pension||[];}
function _hyGoals(){return (D.goals||[]).filter(g=>!g.done&&(_hyNum(g.needed)||_hyNum(g.saved)));}
function _hyPortTotal(){return typeof portGrandTotalILS==='function'?Math.round(portGrandTotalILS()):0;}
function _hyCount(){return D.nwPeriodsCount||(D.nwPeriods||[]).length||6;}
function _hyCurCol(){for(let c=_hyCount()-1;c>=0;c--)if(isCurrentPeriod(D.nwPeriods[c]))return c;return -1;}
function _hyRows(){
  const out=[];
  [['assets','נכסים'],['investments','השקעות'],['savings','חסכונות'],['debts','חובות']].forEach(([sec,label])=>{
    ((D.nwData&&D.nwData[sec]&&D.nwData[sec].rows)||[]).forEach((row,ri)=>{if((row.name||'').trim())out.push({sec,label,row,ri});});
  });
  return out;
}
function _hyHasVal(row,c){return c>=0&&row.vals&&row.vals[c]!=null&&String(row.vals[c]).trim()!=='';}

// What is still missing, per station
function _hyMissing(){
  const c=_hyCurCol();
  return {
    pension:_hyPensions().filter(p=>_hyNum(p.amount)&&_hyOld(p.date,_HY_DAYS)).map(p=>p.name||'מוצר ללא שם'),
    portfolio:_hyPortTotal()>0&&_hyOld(_hyLU('portfolio'),_HY_DAYS)?['תיק ההשקעות']:[],
    goals:_hyGoals().length&&_hyOld(_hyLU('goals'),parseInt((D.settings||{}).freq,10)||30)?['המטרות']:[],
    nw:_hyRows().filter(r=>!_hyHasVal(r.row,c)).map(r=>r.row.name)
  };
}
function _hySteps(){
  const steps=[{id:'map',title:'פתיחה'},{id:'pension',title:'פנסיה'}];
  if(_hyPortTotal()>0)steps.push({id:'portfolio',title:'תיק'});
  if(_hyGoals().length)steps.push({id:'goals',title:'מטרות'});
  steps.push({id:'nw',title:'שווי נטו'},{id:'done',title:'סיום'});
  return steps;
}

// ── Entry points ──
function hyIsDue(){
  if(typeof mcReminderDues!=='function')return false;
  const d=mcReminderDues(),past=v=>{const t=v?Date.parse(v):NaN;return !isNaN(t)&&t<=Date.now();};
  return past(d.duePension)||past(d.dueNW);
}
function renderHalfYearBanner(){
  const el=document.getElementById('hy-banner-dash');if(!el)return;
  el.innerHTML=hyIsDue()?`<div onclick="openHalfYear()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(66,235,214,.16),rgba(66,235,214,.03));border:1.5px solid var(--teal-border);border-radius:14px;padding:14px 16px;margin-bottom:14px">
      <div style="min-width:0"><div style="font-size:15px;font-weight:800;color:var(--teal)">🧭 הגיע הזמן לעדכון החצי־שנתי</div>
        <div style="font-size:12px;color:var(--t2);margin-top:3px">מסלול קצר, שלב אחר שלב: מה ממלאים ומה נכנס לבד, כדי ששום דבר לא יתפספס.</div></div>
      <span style="background:var(--teal);color:#06121a;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:800;white-space:nowrap">להתחיל ←</span></div>`:'';
}
function hyLinkHtml(){
  return `<div style="text-align:left;margin-top:2px"><button onclick="openHalfYear()" style="background:none;border:none;color:var(--teal);font-family:var(--font);font-size:12px;cursor:pointer;text-decoration:underline dotted">🧭 מסלול העדכון החצי־שנתי: מה ממלאים ומה נכנס לבד</button></div>`;
}

// ── Modal + the "back to the track" pill shown while working in a tab ──
function _hyModal(){
  let o=document.getElementById('hy-modal');
  if(!o){o=document.createElement('div');o.id='hy-modal';
    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;z-index:9000;overflow:auto;padding:24px 12px';
    o.addEventListener('click',e=>{if(e.target===o)closeHalfYear();});document.body.appendChild(o);}
  return o;
}
function _hyPill(show){
  let p=document.getElementById('hy-pill');
  if(!p){p=document.createElement('button');p.id='hy-pill';p.onclick=hyResume;
    p.style.cssText='position:fixed;left:16px;bottom:84px;z-index:8999;background:var(--teal);color:#06121a;border:none;border-radius:24px;padding:10px 16px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.45)';
    document.body.appendChild(p);}
  p.textContent='🧭 חזרה למסלול ←';
  p.style.display=show?'block':'none';
}
function openHalfYear(){_hyStep=0;_hyActive=true;_hyPill(false);_hyModal().style.display='flex';renderHalfYear();}
function hyResume(){_hyPill(false);_hyModal().style.display='flex';_hyEnter();renderHalfYear();}
// Entering the net-worth station opens the month's column and brings the pension amounts into it
function _hyEnter(){
  const cur=_hySteps()[_hyStep];
  if(cur&&cur.id==='nw')_hySyncNW(hyEnsureCol());
}
function closeHalfYear(){
  const o=document.getElementById('hy-modal');if(o)o.style.display='none';
  _hyActive=false;_hyPill(false);_hySyncViews();
}
function hyStepTo(i){
  const n=_hySteps().length;_hyStep=Math.max(0,Math.min(n-1,i));
  _hyEnter();_hySyncViews();renderHalfYear();
  const o=_hyModal();o.scrollTop=0;
}
function hyGoTab(tab){
  _hySyncViews();
  const o=document.getElementById('hy-modal');if(o)o.style.display='none';
  _hyPill(true);
  goToTab(tab);
}
// The tabs are rendered while hidden — refresh them after edits made from the track
function _hySyncViews(){
  if(typeof renderPension==='function')renderPension();
  if(typeof renderPenSum==='function')renderPenSum();
  if(typeof renderNW==='function')renderNW();
  if(typeof renderUpdateAlerts==='function')renderUpdateAlerts();
  if(typeof _lastTab!=='undefined'&&(_lastTab==='dash'||!_lastTab)&&typeof renderDash==='function')renderDash();
}

// ── Pension station ──
function hyPen(i,f,el){
  const p=_hyPensions()[i];if(!p)return;
  p[f]=el.value;
  if(f==='amount'&&_hyOld(p.date,30)){ // a new balance with an old date would miss the new net-worth column
    p.date=_hyToday();
    const d=document.getElementById('hy-pen-date-'+i);if(d)d.value=p.date;
  }
  touchSection('pension');markDirty();_hyPenStatus(i);
}
function hyPenOk(i){
  const p=_hyPensions()[i];if(!p)return;
  p.date=_hyToday();touchSection('pension');markDirty();
  const d=document.getElementById('hy-pen-date-'+i);if(d)d.value=p.date;
  _hyPenStatus(i);
}
function _hyPenBadge(p){
  if(!_hyNum(p.amount))return `<span style="color:var(--t3)">אין יתרה</span>`;
  return _hyOld(p.date,_HY_DAYS)?`<span style="color:var(--amber);font-weight:700">• צריך לעדכן</span>`:`<span style="color:var(--green);font-weight:700">✓ מעודכן</span>`;
}
function _hyPenStatus(i){const el=document.getElementById('hy-pen-st-'+i);if(el)el.innerHTML=_hyPenBadge(_hyPensions()[i]);}

// ── Net-worth station ──
// The column of the current month: reuse the next column if it's still empty, otherwise add one.
function hyEnsureCol(){
  let c=_hyCurCol();if(c>=0)return c;
  const now=new Date(),label=(now.getMonth()+1)+'/'+now.getFullYear(),cnt=_hyCount();
  let last=-1;
  for(let i=0;i<cnt;i++)if(D.nwPeriods[i]&&!isFuturePeriod(D.nwPeriods[i]))last=i;
  const next=last+1;
  const empty=next<cnt&&['assets','investments','savings','debts'].every(s=>(D.nwData[s].rows||[]).every(r=>!_hyHasVal(r,next)));
  if(empty){D.nwPeriods[next]=label;c=next;}
  else{addNWPeriod();c=_hyCount()-1;D.nwPeriods[c]=label;}
  markDirty();
  return c;
}
// Refill the current column's pension cells with the latest amounts (a cell typed by hand has no marker)
function _hySyncNW(c){
  (D.nwData.investments.rows||[]).forEach(row=>{
    if(row.autoSrc&&row.autoSrc[c]==='טאב פנסיה'){row.vals[c]='';delete row.autoSrc[c];}
  });
  if(syncNWFromPension())markDirty();
}
function _hyPrev(row,c){
  for(let i=c-1;i>=0;i--)if(_hyNum(row.vals&&row.vals[i])&&!isFuturePeriod(D.nwPeriods[i]))return i;
  return -1;
}
// A value the system already knows for this row, when it wasn't filled by itself
function _hySuggest(sec,row){
  if(sec!=='investments'||getCellCurrency(row,_hyCurCol())!=='ILS')return null;
  const n=row.name||'';
  if(['שוק ההון','תיק השקעות','תיק'].includes(n)){const t=_hyPortTotal();return t>0?{val:t,src:'טאב תיק השקעות'}:null;}
  const act=_hyPensions().filter(p=>_hyNum(p.amount));
  const exact=act.find(p=>p.name===n);
  if(exact)return {val:_hyNum(exact.amount),src:'טאב פנסיה'};
  const type=/פנסי/.test(n)?'פנסי':/השתלמות/.test(n)?'השתלמות':'';
  if(!type)return null;
  const same=act.filter(p=>(p.name||'').includes(type));
  return same.length===1?{val:_hyNum(same[0].amount),src:'טאב פנסיה'}:null;
}
function _hyRowSet(sec,ri,val,src){
  const row=D.nwData[sec].rows[ri],c=_hyCurCol();if(!row||c<0)return null;
  row.vals[c]=val;
  if(row.autoSrc&&row.autoSrc[c]!==undefined)delete row.autoSrc[c];
  if(src){row.autoSrc=row.autoSrc||{};row.autoSrc[c]=src;}
  touchSection('nw');markDirty();
  return row;
}
function hyNW(sec,ri,el){
  _hyRowSet(sec,ri,el.value.replace(/,/g,'').trim());
  const st=document.getElementById('hy-nw-st-'+sec+'-'+ri);
  if(st)st.innerHTML=el.value.trim()?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--amber)">•</span>';
  _hyNWFoot();
}
function hyNWSame(sec,ri){
  const row=D.nwData[sec].rows[ri],c=_hyCurCol(),p=_hyPrev(row,c);if(p<0)return;
  _hyRowSet(sec,ri,String(row.vals[p]));
  const cur=getCellCurrency(row,p);
  if(cur!==getCellCurrency(row,c)){row.cellCurrencies=row.cellCurrencies||{};row.cellCurrencies[c]=cur;}
  renderHalfYear();
}
function hyNWUse(sec,ri){
  const row=D.nwData[sec].rows[ri],s=_hySuggest(sec,row);if(!s)return;
  // no source marker for pension values: marked cells are cleared and refilled on entering this station
  _hyRowSet(sec,ri,String(s.val),s.src==='טאב פנסיה'?'':s.src);renderHalfYear();
}
function hyNWNone(sec,ri){_hyRowSet(sec,ri,'0');renderHalfYear();}
function hyNWSameAll(){
  const c=_hyCurCol();let n=0;
  _hyRows().forEach(r=>{
    if(_hyHasVal(r.row,c)||_hyPrev(r.row,c)<0)return;
    const p=_hyPrev(r.row,c),cur=getCellCurrency(r.row,p);
    r.row.vals[c]=String(r.row.vals[p]);
    if(cur!==getCellCurrency(r.row,c)){r.row.cellCurrencies=r.row.cellCurrencies||{};r.row.cellCurrencies[c]=cur;}
    n++;
  });
  if(n){touchSection('nw');markDirty();}
  showToast(n?`הועתקו ${n} שורות מהעדכון הקודם — כדאי לעבור ולוודא שהמספרים נכונים`:'אין שורות להעתיק');
  renderHalfYear();
}
function _hyNWAt(c){return sumSec('assets',c)+sumSec('investments',c)+sumSec('savings',c)-sumSec('debts',c);}
function _hyPrevCol(c){
  for(let i=c-1;i>=0;i--)if(D.nwPeriods[i]&&!isFuturePeriod(D.nwPeriods[i])&&(sumSec('assets',i)||sumSec('investments',i)||sumSec('savings',i)||sumSec('debts',i)))return i;
  return -1;
}
function _hyNWFoot(){
  const el=document.getElementById('hy-nw-foot');if(!el)return;
  const c=_hyCurCol();if(c<0)return;
  const left=_hyMissing().nw.length;
  el.innerHTML=`<div style="font-size:12px;color:var(--t2)">שווי נטו בעמודה הזאת</div>
    <div style="font-size:20px;font-weight:800;color:var(--teal)">${fmt(_hyNWAt(c))}</div>
    ${left?`<div style="font-size:12px;color:var(--amber);margin-top:2px">נשארו ${left} שורות למלא. המספר יהיה נכון רק כשכולן מלאות.</div>`:`<div style="font-size:12px;color:var(--green);margin-top:2px">✓ כל השורות מלאות</div>`}`;
}

// ── Other stations ──
function hyMark(sec){touchSection(sec);markDirty();renderHalfYear();showToast('סומן כמעודכן ✓');}
function hyFinish(){
  const miss=_hyMissing(),now=new Date();
  // a part is stamped as updated only when it really is complete
  if(!miss.pension.length&&_hyPensions().some(p=>_hyNum(p.amount)))touchSection('pension');
  if(!miss.nw.length)touchSection('nw');
  D.halfYear={lastDone:now.toISOString()};
  const label=`${now.getMonth()+1}/${now.getFullYear()}`,snaps=D.snapshots=D.snapshots||[];
  const last=snaps[snaps.length-1];
  if(last&&last.hy&&last.label===label)snaps.pop(); // finished twice this month — keep the latest
  snaps.push({date:now.toISOString(),label,hy:true,...calcCurrent()});
  markDirty();
  closeHalfYear();
  if(typeof flushSave==='function')flushSave();
  showToast('🎉 העדכון החצי־שנתי הושלם! תמונת מצב נשמרה');
}

// ── Render ──
function renderHalfYear(){
  const o=_hyModal(),steps=_hySteps();
  if(_hyStep>=steps.length)_hyStep=steps.length-1;
  const cur=steps[_hyStep],scroll=o.scrollTop;
  const pill=steps.map((s,i)=>`<button onclick="hyStepTo(${i})" style="flex:1 1 0;min-width:0;background:none;border:none;border-top:3px solid ${i<=_hyStep?'var(--teal)':'var(--border)'};padding:6px 2px 0;color:${i===_hyStep?'var(--teal)':'var(--t3)'};font-family:var(--font);font-size:11px;font-weight:${i===_hyStep?800:500};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</button>`).join('');
  const body={map:_hyMapHtml,pension:_hyPensionHtml,portfolio:_hyPortfolioHtml,goals:_hyGoalsHtml,nw:_hyNWHtml,done:_hyDoneHtml}[cur.id]();
  const back=_hyStep>0?`<button onclick="hyStepTo(${_hyStep-1})" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:10px;padding:9px 16px;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">→ חזרה</button>`:'<span></span>';
  const next=cur.id==='done'?'':`<button onclick="hyStepTo(${_hyStep+1})" style="background:var(--teal);color:#06121a;border:none;border-radius:10px;padding:9px 20px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer">${cur.id==='map'?'מתחילים':'הבא'} ←</button>`;
  o.innerHTML=`<div style="background:var(--s1);border:1px solid var(--border);border-radius:16px;max-width:600px;width:100%;padding:18px 18px 14px;direction:rtl">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800">🧭 עדכון חצי־שנתי</div>
      <button onclick="closeHalfYear()" aria-label="סגירה" style="background:none;border:none;color:var(--t3);font-size:22px;cursor:pointer">×</button></div>
    <div style="display:flex;gap:4px;margin-bottom:14px">${pill}</div>
    ${body}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:10px">${back}${next}</div>
  </div>`;
  o.scrollTop=scroll;
  if(cur.id==='nw')_hyNWFoot();
}
function _hyHand(items){return `<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:9px 12px;margin-bottom:8px;font-size:12.5px;line-height:1.7;color:var(--t2)"><b style="color:var(--amber)">✍️ ממלאים ידנית:</b> ${items}</div>`;}
function _hyAuto(items){return `<div style="background:rgba(66,235,214,.07);border:1px solid var(--teal-border);border-radius:10px;padding:9px 12px;margin-bottom:12px;font-size:12.5px;line-height:1.7;color:var(--t2)"><b style="color:var(--teal)">🤖 נכנס לבד:</b> ${items}</div>`;}
function _hyTabBtn(txt,tab){return `<button onclick="hyGoTab('${tab}')" style="background:none;color:var(--teal);border:1px solid var(--teal-border);border-radius:9px;padding:7px 14px;font-family:var(--font);font-size:12.5px;font-weight:800;cursor:pointer">${txt}</button>`;}
const _HY_SMALL='background:none;border:1px solid var(--border);color:var(--t2);border-radius:7px;padding:4px 9px;font-family:var(--font);font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap';
const _HY_INPUT='background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:var(--font);font-size:14px;padding:7px 9px;width:100%;min-width:0;box-sizing:border-box';

function _hyMapHtml(){
  const miss=_hyMissing(),steps=_hySteps().map(s=>s.id);
  const line=(icon,title,hand,auto,left)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:11px 14px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:800;margin-bottom:4px"><span>${icon} ${title}</span>${left?`<span style="color:var(--amber);font-size:11.5px;font-weight:700;white-space:nowrap">• ${left}</span>`:'<span style="color:var(--green);font-size:11.5px;font-weight:700">✓ מעודכן</span>'}</div>
    <div style="font-size:12.5px;line-height:1.7;color:var(--t2)"><b style="color:var(--amber)">✍️</b> ${hand}<br><b style="color:var(--teal)">🤖</b> ${auto}</div></div>`;
  const last=D.halfYear&&D.halfYear.lastDone;
  return `<p style="font-size:13.5px;color:var(--t2);line-height:1.8;margin:0 0 12px">פעם בחצי שנה מרעננים את התמונה המלאה. נעבור על הכל לפי הסדר, ובכל שלב תראו מה צריך למלא ומה המערכת כבר עושה לבד.${last?` העדכון הקודם הושלם ב־${fmtDate(last)}.`:''}</p>
    ${line('🏦','פנסיה וקרן השתלמות','היתרה של כל מוצר ותאריך הבדיקה','היתרה עוברת לשווי נטו',miss.pension.length?miss.pension.length+' לעדכן':'')}
    ${steps.includes('portfolio')?line('📈','תיק השקעות','השווי הנוכחי של כל נייר','הפיזור והמלצת האיזון מתעדכנים. לשווי נטו מעבירים בלחיצה בשלב של שווי נטו',miss.portfolio.length?'לעדכן':''):''}
    ${steps.includes('goals')?line('🎯','מטרות','כמה נחסך לכל מטרה','אחוז ההתקדמות וכמה נשאר. מטרה שהושגה יורדת מרשימת ההעברות',miss.goals.length?'לעדכן':''):''}
    ${line('📊','שווי נטו','דירה, רכב, עו"ש וחובות','עמודה לחודש הנוכחי, הפנסיה, הסכומים וההשוואה לעדכון הקודם',miss.nw.length?miss.nw.length+' שורות':'')}
    <div style="font-size:12px;color:var(--t3);line-height:1.7">💡 כדאי להכין מראש: דוחות או גישה לאזור האישי בבתי ההשקעות, יתרת עו"ש ויתרת משכנתא והלוואות. אפשר לעצור באמצע ולחזור, הכל נשמר.</div>`;
}
function _hyPensionHtml(){
  const rows=_hyPensions().map((p,i)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px">
        <b style="font-size:13.5px;min-width:0">${esc(p.name||'מוצר ללא שם')}</b>
        <span id="hy-pen-st-${i}" style="font-size:11.5px;white-space:nowrap">${_hyPenBadge(p)}</span></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end">
        <label style="font-size:11px;color:var(--t3);min-width:0">יתרה (₪)<input type="number" inputmode="decimal" value="${esc(p.amount||'')}" placeholder="0" oninput="hyPen(${i},'amount',this)" style="${_HY_INPUT};margin-top:3px"/></label>
        <label style="font-size:11px;color:var(--t3);min-width:0">תאריך בדיקה<input id="hy-pen-date-${i}" type="date" value="${esc(p.date||'')}" oninput="hyPen(${i},'date',this)" style="${_HY_INPUT};margin-top:3px"/></label>
      </div>
      ${_hyNum(p.amount)&&_hyOld(p.date,_HY_DAYS)?`<button onclick="hyPenOk(${i})" style="${_HY_SMALL};margin-top:7px">הסכום עדיין נכון, בדקתי היום</button>`:''}
    </div>`).join('');
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">🏦 פנסיה וקרן השתלמות</div>
    ${_hyHand('היתרה העדכנית של כל מוצר ומתי בדקתם. את המספרים מוצאים באזור האישי של בית ההשקעות או במסלקה הפנסיונית.')}
    ${_hyAuto('היתרה עוברת לשווי נטו של החודש, אז לא צריך להקליד אותה פעמיים.')}
    ${rows||'<div style="font-size:13px;color:var(--t3);margin-bottom:8px">עוד לא הוגדרו מוצרים.</div>'}
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px">${_hyTabBtn('להוספת מוצר, דמי ניהול ומסלולים','pension')}</div>`;
}
function _hyPortfolioHtml(){
  const lu=_hyLU('portfolio'),old=_hyOld(lu,_HY_DAYS);
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">📈 תיק השקעות</div>
    ${_hyHand('השווי הנוכחי של כל נייר, מתוך האפליקציה של הברוקר או בית ההשקעות.')}
    ${_hyAuto('הפיזור בתיק והמלצת האיזון מתעדכנים לפי מה שתזינו.')}
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
      <div style="font-size:12px;color:var(--t2)">סה"כ בתיק כרגע</div>
      <div style="font-size:20px;font-weight:800;color:var(--teal)">${fmt(_hyPortTotal())}</div>
      <div style="font-size:12px;margin-top:3px;color:${old?'var(--amber)':'var(--green)'}">${lu?(old?'• עודכן לאחרונה ב־':'✓ עודכן ב־')+fmtDate(lu):'• עוד לא עודכן'}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${_hyTabBtn('לעדכון השווי בתיק','portfolio')}<button onclick="hyMark('portfolio')" style="${_HY_SMALL}">התיק מעודכן</button></div>
    <div style="font-size:12px;color:var(--t3);margin-top:10px;line-height:1.7">⚠️ שימו לב: השווי לא עובר לבד לשווי נטו. בשלב של שווי נטו נציע לכם להעביר אותו בלחיצה.</div>`;
}
function _hyGoalsHtml(){
  const lu=_hyLU('goals'),old=_hyOld(lu,parseInt((D.settings||{}).freq,10)||30);
  const rows=_hyGoals().map(g=>{
    const nd=_hyNum(g.needed),sv=_hyNum(g.saved),pct=nd>0?Math.min(100,Math.round(sv/nd*100)):0;
    return `<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><span style="min-width:0">${esc(g.name||'מטרה')}</span><span style="white-space:nowrap;color:var(--t2)">${fmt(sv)}${nd?` מתוך ${fmt(nd)} · ${pct}%`:''}</span></div>`;
  }).join('');
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">🎯 מטרות</div>
    ${_hyHand('כמה נחסך בפועל לכל מטרה. שווה גם לבדוק שהסכום והזמן עדיין נכונים.')}
    ${_hyAuto('אחוז ההתקדמות וכמה נשאר. מטרה שהגעתם לסכום שלה יורדת מרשימת ההעברות.')}
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:6px 14px 8px;margin-bottom:10px">${rows}
      <div style="font-size:12px;margin-top:7px;color:${old?'var(--amber)':'var(--green)'}">${lu?(old?'• עודכן לאחרונה ב־':'✓ עודכן ב־')+fmtDate(lu):'• עוד לא עודכן'}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${_hyTabBtn('לעדכון המטרות','goals')}<button onclick="hyMark('goals')" style="${_HY_SMALL}">המספרים נכונים</button></div>`;
}
function _hyNWHtml(){
  const c=_hyCurCol();
  let lastSec='',anyPrev=false;
  const rows=_hyRows().map(({sec,label,row,ri})=>{
    const has=_hyHasVal(row,c),auto=has&&row.autoSrc&&row.autoSrc[c];
    const prev=_hyPrev(row,c),cur=getCellCurrency(row,c),sym=getCurrSymbol(cur)||'₪';
    const prevTxt=prev>=0?`${_hyNum(row.vals[prev]).toLocaleString('he-IL')} ${getCurrSymbol(getCellCurrency(row,prev))||'₪'}`:'';
    if(!has&&prev>=0)anyPrev=true;
    const sug=!has||!auto?_hySuggest(sec,row):null;
    const showSug=sug&&_hyNum(row.vals[c])!==sug.val;
    const head=sec!==lastSec?`<div style="font-size:12px;font-weight:800;color:var(--t3);margin:10px 0 5px">${label}</div>`:'';
    lastSec=sec;
    return `${head}<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span id="hy-nw-st-${sec}-${ri}" style="flex:none">${has?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--amber)">•</span>'}</span>
        <span style="flex:1 1 0;min-width:0;font-size:13px;font-weight:700">${esc(row.name)}</span>
        <input type="number" inputmode="decimal" value="${esc(row.vals[c]||'')}" placeholder="${sym}" oninput="hyNW('${sec}',${ri},this)" aria-label="${esc(row.name)}" style="${_HY_INPUT};flex:0 0 120px;width:120px"/>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px;font-size:11.5px;color:var(--t3)">
        ${auto?`<span style="color:var(--teal);font-weight:700">${auto==='טאב תיק השקעות'?'הועבר מ':'🤖 נכנס לבד מ'}${esc(auto)}</span>`:''}
        ${prevTxt?`<span>בפעם הקודמת (${esc(D.nwPeriods[prev])}): ${prevTxt}</span>`:''}
        ${showSug?`<button onclick="hyNWUse('${sec}',${ri})" style="${_HY_SMALL};color:var(--teal);border-color:var(--teal-border)">להעביר ${fmt(sug.val)} מ${esc(sug.src)}</button>`:''}
        ${!has&&prev>=0?`<button onclick="hyNWSame('${sec}',${ri})" style="${_HY_SMALL}">ללא שינוי</button>`:''}
        ${!has?`<button onclick="hyNWNone('${sec}',${ri})" style="${_HY_SMALL}">אין לי</button>`:''}
      </div></div>`;
  }).join('');
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">📊 שווי נטו, עמודה ${esc(D.nwPeriods[c])}</div>
    ${_hyHand('דירה, רכב, עו"ש וחובות. עברו שורה שורה: שורה שנשארת ריקה לא נספרת, והשווי ייראה נמוך ממה שהוא באמת.')}
    ${_hyAuto('העמודה של החודש כבר פתוחה, ומה שעדכנתם בשלב הפנסיה נכנס אליה. הסכומים וההשוואה מחושבים לבד.')}
    ${anyPrev?`<button onclick="hyNWSameAll()" style="${_HY_SMALL};margin-bottom:4px">להעתיק את כל השורות הריקות מהעדכון הקודם</button>`:''}
    ${rows||'<div style="font-size:13px;color:var(--t3)">עוד אין שורות בשווי נטו.</div>'}
    <div id="hy-nw-foot" style="background:rgba(66,235,214,.07);border:1px solid var(--teal-border);border-radius:12px;padding:10px 14px;margin-top:10px"></div>
    <div style="margin-top:10px">${_hyTabBtn('להוספת שורות בטאב שווי נטו','nw')}</div>`;
}
function _hyDoneHtml(){
  const miss=_hyMissing(),steps=_hySteps();
  const idx=id=>steps.findIndex(s=>s.id===id);
  const names={pension:'פנסיה',portfolio:'תיק השקעות',goals:'מטרות',nw:'שווי נטו'};
  const left=Object.keys(names).filter(k=>miss[k].length&&idx(k)>=0);
  const list=Object.keys(names).filter(k=>idx(k)>=0).map(k=>{
    const m=miss[k];
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="min-width:0">${m.length?'<span style="color:var(--amber)">•</span>':'<span style="color:var(--green)">✓</span>'} <b>${names[k]}</b>${m.length?`<span style="color:var(--t3);font-size:12px"> · חסר: ${m.map(esc).join(', ')}</span>`:''}</span>
      ${m.length?`<button onclick="hyStepTo(${idx(k)})" style="${_HY_SMALL};color:var(--teal);border-color:var(--teal-border)">להשלים</button>`:''}</div>`;
  }).join('');
  const c=_hyCurCol(),pc=c>=0?_hyPrevCol(c):-1,nw=c>=0?_hyNWAt(c):0,diff=pc>=0?nw-_hyNWAt(pc):null;
  const next=new Date(Date.now()+_HY_DAYS*_HY_DAY);
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">${left.length?'כמעט שם':'🎉 הכל מעודכן'}</div>
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:4px 14px 6px;margin-bottom:12px">${list}</div>
    ${c>=0?`<div style="background:rgba(66,235,214,.07);border:1px solid var(--teal-border);border-radius:12px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--t2)">שווי נטו</div>
      <div style="font-size:24px;font-weight:800;color:var(--teal)">${fmt(nw)}</div>
      ${diff!=null?`<div style="font-size:12.5px;color:${diff>=0?'var(--green)':'var(--red)'}">${diff>=0?'↑':'↓'} ${fmt(Math.abs(diff))} לעומת ${esc(D.nwPeriods[pc])}${miss.nw.length?' (עד שכל השורות מלאות, ההשוואה לא מדויקת)':''}</div>`:''}
    </div>`:''}
    <div style="font-size:12.5px;color:var(--t2);line-height:1.7;margin-bottom:12px">נשמור תמונת מצב כדי שתוכלו להשוות בעדכון הבא, בערך ב־${next.getMonth()+1}/${next.getFullYear()}.</div>
    <button onclick="hyFinish()" style="width:100%;background:${left.length?'none':'var(--teal)'};color:${left.length?'var(--t2)':'#06121a'};border:1px solid ${left.length?'var(--border)':'var(--teal)'};border-radius:10px;padding:11px;font-family:var(--font);font-size:14px;font-weight:800;cursor:pointer">${left.length?'לסיים בכל זאת (מה שחסר יישאר לא מעודכן)':'✅ סיימתי את העדכון'}</button>`;
}
