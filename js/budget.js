// ══ MONTHLY BUDGET (התנהלות חודשית) ══
// Manual income/expense tracker per month. Expenses are split into needs
// (צרכים) and wants (רצונות) so users see where the money goes and how much
// they actually saved. Data model: D.budgetMonths = { 'YYYY-MM': {income,needs,wants} },
// D.budgetCurMonth = the month being viewed/edited.
const HEB_MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
function fmtBudgetMonth(key){
  const p=(key||'').split('-');
  if(p.length!==2)return key||'';
  return (HEB_MONTHS[+p[1]-1]||p[1])+' '+p[0];
}
function currentMonthKey(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function defBudgetMonth(){
  return {
    income:[{name:'משכורת',amount:''},{name:'הכנסה נוספת / עסק',amount:''}],
    needs:[
      {name:'שכר דירה / משכנתא',amount:''},
      {name:'חשבונות (חשמל, מים, גז, ארנונה)',amount:''},
      {name:'קניות בסופר',amount:''},
      {name:'תחבורה / דלק',amount:''},
      {name:'ביטוחים והחזרי הלוואות',amount:''}
    ],
    wants:[
      {name:'מסעדות ובילויים',amount:''},
      {name:'קניות (ביגוד, אלקטרוניקה)',amount:''},
      {name:'חופשות ונופש',amount:''},
      {name:'מנויים (סטרימינג, חדר כושר)',amount:''}
    ]
  };
}
// New month inherits the category NAMES from the most recent month (amounts empty) —
// most people's categories repeat, so this saves re-typing every month.
function newBudgetMonthTemplate(){
  const keys=Object.keys(D.budgetMonths||{}).sort();
  if(!keys.length)return defBudgetMonth();
  const last=D.budgetMonths[keys[keys.length-1]];
  const strip=rows=>(rows||[]).map(r=>({name:r.name,amount:''}));
  const t={income:strip(last.income),needs:strip(last.needs),wants:strip(last.wants)};
  if(!t.income.length||!t.needs.length)return defBudgetMonth();
  // Business categories repeat month to month too
  if(Array.isArray(last.business)&&last.business.length)t.business=strip(last.business);
  if(Array.isArray(last.bizIncome)&&last.bizIncome.length)t.bizIncome=strip(last.bizIncome);
  if(Array.isArray(last.bizInvest)&&last.bizInvest.length)t.bizInvest=strip(last.bizInvest);
  return t;
}
// Migrate the old single-month shape (D.monthlyBudget) into D.budgetMonths
function migrateBudget(){
  if(!D.budgetMonths){
    D.budgetMonths={};
    if(D.monthlyBudget&&(D.monthlyBudget.income||D.monthlyBudget.needs)){
      const key=/^\d{4}-\d{2}$/.test(D.monthlyBudget.month||'')?D.monthlyBudget.month:currentMonthKey();
      D.budgetMonths[key]={income:D.monthlyBudget.income||[],needs:D.monthlyBudget.needs||[],wants:D.monthlyBudget.wants||[]};
    }
  }
  if(!D.budgetCurMonth||!D.budgetMonths[D.budgetCurMonth]){
    // latest month that has already arrived (months filled ahead via 🔁 aren't "current")
    const keys=Object.keys(D.budgetMonths).sort(),past=keys.filter(k=>k<=currentMonthKey());
    D.budgetCurMonth=past.length?past[past.length-1]:keys.length?keys[keys.length-1]:currentMonthKey();
    if(!D.budgetMonths[D.budgetCurMonth])D.budgetMonths[D.budgetCurMonth]=defBudgetMonth();
  }
}
function curBudget(){migrateBudget();return D.budgetMonths[D.budgetCurMonth];}
const BUDGET_SECTIONS={
  income:{color:'var(--teal)',ph:'מקור הכנסה...',totalLbl:'סה"כ הכנסות'},
  needs:{color:'var(--green)',ph:'הוצאה חיונית...',totalLbl:'סה"כ צרכים'},
  wants:{color:'var(--amber)',ph:'הוצאת כיף...',totalLbl:'סה"כ כיף'},
  business:{color:'#c4b5fd',ph:'תשלום / הוצאה של העסק...',totalLbl:'סה"כ תשלומי העסק'},
  bizIncome:{color:'var(--teal)',ph:'מקור הכנסה של העסק...',totalLbl:'סה"כ הכנסות העסק'},
  // self-employed deposits to pension / study fund: money out of the cashflow, but into savings —
  // kept apart from the business payments and shown separately in the summary
  bizInvest:{color:'#60a5fa',ph:'הפקדה (פנסיה, קרן השתלמות...)',totalLbl:'סה"כ הועבר להשקעות'}
};
const BIZ_INVEST_DEFAULT_ROWS=()=>[{name:'הפקדה לפנסיה',amount:''},{name:'הפקדה לקרן השתלמות',amount:''}];
// ── Employment profile (global, not per month): שכיר / עצמאי (or both) ──
// D.budgetProfile = {salaried, selfEmployed, bizType:'patur'|'zair'|'murshe'|'',
//                    bizMode:'combined'|'separate'|''}  ('' mode = combined)
const BIZ_TYPES={patur:'עוסק פטור',zair:'עוסק זעיר',murshe:'עוסק מורשה'};
function budgetProfile(){
  if(!D.budgetProfile)D.budgetProfile={salaried:false,selfEmployed:false,bizType:'',bizMode:''};
  return D.budgetProfile;
}
function bizSeparate(){const p=D.budgetProfile||{};return !!(p.selfEmployed&&p.bizMode==='separate');}
function bizCombined(){const p=D.budgetProfile||{};return !!(p.selfEmployed&&p.bizMode!=='separate');}
const BIZ_DEFAULT_ROWS=()=>[
  {name:'תשלום למע"מ',amount:''},
  {name:'תשלום לביטוח לאומי',amount:''},
  {name:'תשלום מס הכנסה',amount:''}
];
// Make sure the current month has the business rows once "עצמאי" is on.
// Never deletes anything — unchecking just hides the section.
function ensureBizRows(m){
  const p=budgetProfile();
  if(!p.selfEmployed||!m)return;
  if(!Array.isArray(m.business)||!m.business.length)m.business=BIZ_DEFAULT_ROWS();
  if(!Array.isArray(m.bizInvest)||!m.bizInvest.length)m.bizInvest=BIZ_INVEST_DEFAULT_ROWS();
  if(p.bizMode==='separate'&&(!Array.isArray(m.bizIncome)||!m.bizIncome.length))m.bizIncome=[{name:'הכנסות העסק',amount:''}];
}
// ── Bi-monthly VAT (עוסק מורשה) ──
// VAT is often paid every two months, so one month shows a big payment and the
// next shows 0. We don't alter the math (the summary stays real cash); instead
// we explain the month: in a no-payment month, the "leftover" isn't all free.
function vatBimonthlyOn(){const p=D.budgetProfile||{};return !!(p.selfEmployed&&p.bizType==='murshe'&&p.vatBimonthly);}
function _vatOf(month){
  const row=((month&&month.business)||[]).find(r=>/מע"?מ/.test(r.name||''));
  return row?parseFloat(String(row.amount||0).replace(/,/g,''))||0:0;
}
// Most recent VAT payment before the current month (for "next month you'll pay ~X").
function lastVatPaidBefore(key){
  const keys=Object.keys(D.budgetMonths||{}).sort().filter(k=>k<key);
  for(let i=keys.length-1;i>=0;i--){const v=_vatOf(D.budgetMonths[keys[i]]);if(v>0)return v;}
  return 0;
}
// Splitting a bi-monthly VAT payment: half in the month it was paid, half in the month before
// (the one with no payment) — a "virtual" expense there: the money actually left the next month.
// Only the budget's figures use the split; the stored amounts and the bank check stay real cash.
// A payment in month M is for the reporting period M−2…M−1.
function _bKeyShift(k,d){const [y,m]=String(k).split('-').map(Number);const t=new Date(y,m-1+d,1);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');}
function vatSplitOn(prof){const p=prof||D.budgetProfile||{};return !!(p.selfEmployed&&p.bizType==='murshe'&&p.vatBimonthly&&p.vatSplit);}
// {eff, virt, est}: the VAT this month counts for when splitting; virt = the half borrowed from next
// month's payment (est = estimated from the last payment, next month not filled in yet)
function vatSplitInfo(months,key){
  const a=_vatOf(months[key]),next=months[_bKeyShift(key,1)],an=_vatOf(next);
  if(a>0)return {eff:a/2,virt:0,est:false};
  if(an>0)return {eff:an/2,virt:an/2,est:false};
  // the next payment isn't recorded yet — nothing is guessed; the half appears once it is
  return {eff:0,virt:0,est:false};
}
// how much the split changes a month's business payments (0 when not splitting)
function vatSplitAdj(months,key,prof){
  if(!vatSplitOn(prof)||!months||!months[key])return 0;
  return vatSplitInfo(months,key).eff-_vatOf(months[key]);
}
function vatNoticeHtml(){
  if(!vatBimonthlyOn())return '';
  const key=D.budgetCurMonth,cur=_vatOf(curBudget()),split=vatSplitOn();
  const box=(c,txt)=>`<div style="font-size:11.5px;line-height:1.7;color:${c};background:var(--s2);border:1px solid var(--border);border-radius:9px;padding:8px 11px;margin-bottom:10px">${txt}</div>`;
  const mName=k=>fmtBudgetMonth(k).split(' ')[0];
  const toggle=(a,b)=>`<label style="display:flex;align-items:center;gap:7px;margin-top:6px;cursor:pointer;color:var(--t2)">
      <input type="checkbox" ${split?'checked':''} onchange="setBudgetProfile('vatSplit',this.checked)" style="accent-color:var(--teal)">
      לחלק כל תשלום בין שני החודשים (כאן: ${mName(a)} ו${mName(b)})</label>`;
  if(cur>0){
    const per=`על תקופת הדיווח <b>${mName(_bKeyShift(key,-2))}–${mName(_bKeyShift(key,-1))}</b>`;
    return box('var(--t2)',`💡 זה <b>חודש תשלום מע"מ</b> — ${per}. בפועל זה כ־<b>${iln(fmt(cur/2))}</b> לכל חודש.`
      +(split?`<div style="margin-top:4px;color:var(--teal)">✓ מחולק: בחישוב של החודש נספר רק חצי (${iln(fmt(cur/2))}), והחצי השני מופיע ב${mName(_bKeyShift(key,-1))} כהוצאה מדומה.</div>`
        :' שווה להפריש את הסכום הזה כל חודש, גם בחודשים בלי תשלום.')
      +toggle(_bKeyShift(key,-1),key));
  }
  const info=vatSplitInfo(D.budgetMonths,key),nextK=_bKeyShift(key,1);
  if(split&&info.virt>0)return box('var(--t2)',`📎 <b>הוצאה מדומה — מע"מ ${iln(fmt(info.virt))}</b>: חצי מהתשלום של ${mName(nextK)} (על ${mName(_bKeyShift(key,-1))}–${mName(key)}).
      <div style="margin-top:2px;color:var(--t3)">הסכום ירד בפועל בחודש העוקב, אבל לצורכי החלוקה הוא מוצג גם בחודש הזה ונכלל בחישוב.</div>`+toggle(key,nextK));
  // no forecasts: only what's recorded is described
  if(split)return box('var(--t3)',`💡 החודש לא שולם מע"מ. החצי של התשלום יופיע כאן כהוצאה מדומה ברגע שתרשמו את תשלום המע"מ של ${mName(nextK)}.`+toggle(key,nextK));
  return box('var(--t3)','💡 מדווחים מע"מ פעם בחודשיים: בחודש התשלום רשמו את הסכום המלא, ובחודש שאין תשלום השאירו 0.'+toggle(key,nextK));
}
// ── Income guidance: gross vs net depends on the profile ──
// If business income is recorded AFTER tax while the tax payments are also listed
// under "עסק", the tax gets deducted twice — so self-employed (combined) enter it
// gross.
function renderIncomeHint(){
  const el=document.getElementById('budget-income-hint');
  if(!el)return;
  const p=budgetProfile();
  let t='כל הכסף שנכנס החודש (נטו, אחרי מס) — משכורות, עסק, קצבאות והכנסות חד-פעמיות.';
  if(p.selfEmployed&&p.bizMode!=='separate'){
    t='💡 <b>חשוב:</b> את הכנסות העסק רשמו <b>ברוטו</b> — כל מה שנכנס לפני מע"מ, ביטוח לאומי ומס הכנסה — כי את התשלומים האלה רושמים בנפרד בחלק "עסק" (אחרת הם יורדו פעמיים).'
      +(p.salaried?' משכורת כשכיר רשמו <b>נטו</b>, כפי שהיא נכנסת לחשבון.':'');
  }else if(p.selfEmployed&&p.bizMode==='separate'){
    t='כאן רק ההכנסות של הבית'+(p.salaried?' — למשל משכורת כשכיר (<b>נטו</b>, כפי שנכנסת לחשבון)':'')+'. הכנסות העסק נרשמות בכרטיס "עסק" למטה.';
  }
  el.innerHTML=t;
}
function setBudgetProfile(field,val){
  const wasSep=bizSeparate();
  budgetProfile()[field]=val;
  // Business income lives in its own section only in "separate" mode. Switching modes moves it,
  // so it never disappears from view or from the totals.
  const nowSep=bizSeparate();
  let moved=0;
  if(wasSep&&!nowSep)moved=budgetMoveBizIncome(true);
  else if(!wasSep&&nowSep)moved=budgetMoveBizIncome(false);
  touchSection('budget');markDirty();
  renderBudget();
  if(moved)showToast(nowSep?'הכנסות העסק הועברו לחלק "הכנסות העסק" ✓':'הכנסות העסק הועברו לחלק "הכנסות" ✓ הן נכללות עכשיו בחישוב של הבית');
}
// toCombined: every month's business income rows → the income section (added to a same-named
// row if there is one). Otherwise: income rows about the business (name mentions עסק) → business
// income. Every month of the account being edited (each account has its own profile); the
// transactions behind the rows move with them. Returns how many amounts moved.
function budgetMoveBizIncome(toCombined){
  const maps=[D.budgetMonths||{}];
  const num=v=>parseFloat(String(v||0).replace(/,/g,''))||0;
  let moved=0;
  maps.forEach(months=>Object.values(months).forEach(m=>{
    const from=toCombined?'bizIncome':'income',to=toCombined?'income':'bizIncome';
    const src=(m[from]||[]).filter(r=>toCombined?true:/עסק/.test(r.name||''));
    if(!src.length)return;
    if(!Array.isArray(m[to]))m[to]=[];
    src.forEach(r=>{
      const name=(r.name||'').trim()||'הכנסות העסק';
      const dest=m[to].find(x=>(x.name||'').trim()===name);
      if(dest){if(num(r.amount))dest.amount=String(num(dest.amount)+num(r.amount));}
      else m[to].push({name,amount:r.amount||''});
      if(num(r.amount))moved++;
      (m.tx||[]).forEach(t=>{if(t.k===from+'|'+name)t.k=to+'|'+name;});
    });
    m[from]=(m[from]||[]).filter(r=>!src.includes(r));
  }));
  return moved;
}
// Force LTR rendering for money amounts inside RTL text, so "−₪1,120" doesn't
// get bidi-scrambled into "1,120₪−".
function iln(s){return '<span style="direction:ltr;unicode-bidi:isolate;display:inline-block">'+s+'</span>';}
// Rows marked "לא לספור" (row.skip) stay visible but don't count in the budget's figures.
// (The bank check still counts them: the money really moved.)
function budgetRowAmt(r){return r&&r.skip?0:(parseFloat(String(r&&r.amount||0).replace(/,/g,''))||0);}
function budgetTotal(sec){
  return (curBudget()[sec]||[]).reduce((s,r)=>s+budgetRowAmt(r),0);
}
function budgetSavedOf(month,prof,months){
  const sum=rows=>(rows||[]).reduce((s,r)=>s+budgetRowAmt(r),0);
  // Combined mode: business payments count as household expenses.
  // Separate mode: the business has its own cashflow, outside the household.
  // prof = that account's employment profile (several accounts); default the active one.
  // months = that account's months (to split bi-monthly VAT); default the active account's.
  const p=prof||D.budgetProfile||{};
  const comb=!!(p.selfEmployed&&p.bizMode!=='separate');
  const ms=months||D.budgetMonths||{},key=Object.keys(ms).find(k=>ms[k]===month);
  const biz=comb?sum(month.business)+(key?vatSplitAdj(ms,key,p):0):0;
  // deposits to pension / study fund leave the cashflow too (counted in exp), but are reported
  // apart as inv — they're savings, not spending
  const inv=comb?sum(month.bizInvest):0;
  return {inc:sum(month.income),exp:sum(month.needs)+sum(month.wants)+biz+inv,inv};
}
// Savings from the most recent month the client actually filled in
// (income − expenses). Returns {saved, monthKey} or null if none.
function budgetLastMonthSaved(){
  // months that haven't arrived yet (e.g. rent filled ahead via 🔁) don't count.
  // With several accounts (budget-accounts.js) the household's months are added together.
  const ents=typeof budgetAccEntries==='function'?budgetAccEntries():[{months:D.budgetMonths||{},profile:D.budgetProfile}];
  const keys=[...new Set(ents.flatMap(e=>Object.keys(e.months)))].sort().filter(k=>k<=currentMonthKey());
  for(let i=keys.length-1;i>=0;i--){
    let inc=0,exp=0;
    ents.forEach(e=>{const mm=e.months;if(mm[keys[i]]){const s=budgetSavedOf(mm[keys[i]],e.profile,mm);inc+=s.inc;exp+=s.exp;}});
    if((inc||exp)>0)return {saved:inc-exp,monthKey:keys[i]};
  }
  return null;
}
// A tile at the top of the goals page that auto-records the savings from the
// last month the client filled in the monthly-budget page. Shown only when that
// month ended in a positive saving, so someone who saved sees it front-and-center.
function renderGoalsSavingsTile(){
  const el=document.getElementById('goals-savings-tile');
  if(!el)return;
  const last=budgetLastMonthSaved();
  if(!last||last.saved<=0){el.innerHTML='';return;}
  el.innerHTML=`<div style="margin-bottom:16px;background:linear-gradient(135deg,rgba(66,235,214,.14),rgba(66,235,214,.03));border:1.5px solid var(--teal-border);border-radius:14px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div style="min-width:0">
      <div style="font-size:14px;font-weight:800;color:var(--teal)">💰 חסכת החודש</div>
      <div style="font-size:11.5px;color:var(--t2);margin-top:3px;line-height:1.6">לפי מעקב ההתנהלות החודשית — ${fmtBudgetMonth(last.monthKey)} — כל הכבוד! 🎉</div>
    </div>
    <div style="text-align:left;flex-shrink:0">
      <div style="font-size:26px;font-weight:800;color:var(--teal);direction:ltr">${fmt(last.saved)}</div>
    </div>
  </div>`;
}
function renderBudget(){
  migrateBudget();
  // Business income left in its own section while not in "separate" mode (e.g. switched before
  // modes moved it) is invisible and uncounted — bring it into the income section.
  if(!bizSeparate()){
    const maps=[D.budgetMonths||{}]; // the account being edited — its own profile decides
    const hidden=maps.some(ms=>Object.values(ms).some(m=>(m.bizIncome||[]).some(r=>parseFloat(String(r.amount||0).replace(/,/g,''))||0)));
    if(hidden&&budgetMoveBizIncome(true)){touchSection('budget');markDirty();showToast('הכנסות העסק הוחזרו לחלק "הכנסות" ✓');}
  }
  // accounts bar; the "all accounts" view replaces the normal page (budget-accounts.js)
  if(typeof budgetAccRender==='function'&&budgetAccRender())return;
  ensureBizRows(curBudget());
  renderBudgetMonthSelect();
  renderBudgetProfile();
  renderIncomeHint();
  ['income','needs','wants'].forEach(renderBudgetSection);
  renderBudgetBusiness();
  renderBudgetSummary();
  const notesEl=document.getElementById('budget-notes');
  if(notesEl)notesEl.value=curBudget().notes||'';
  // "Copy amounts" button only makes sense when a previous month has data
  const hasPrev=!!budgetPrevKey();
  const copyBtn=document.getElementById('budget-copy-prev');
  if(copyBtn)copyBtn.style.display=hasPrev?'inline-flex':'none';
  const copyHint=document.getElementById('budget-copy-prev-hint');
  if(copyHint)copyHint.style.display=hasPrev?'block':'none';
  setTimeout(attachAllNumFormats,0);
}
// Closest earlier month that actually has data
function budgetPrevKey(){
  const keys=Object.keys(D.budgetMonths).sort().filter(k=>k<D.budgetCurMonth);
  for(let i=keys.length-1;i>=0;i--){
    const s=budgetSavedOf(D.budgetMonths[keys[i]]);
    if(s.inc||s.exp)return keys[i];
  }
  return null;
}
// Copy amounts from the previous month into EMPTY fields only (matched by
// category name) — fixed expenses like rent repeat, so the user then edits
// just what changed. Never overwrites a typed amount.
function budgetCopyPrevAmounts(){
  const pk=budgetPrevKey();
  if(!pk){showToast('אין חודש קודם עם נתונים להעתקה');return;}
  const prev=D.budgetMonths[pk],cur=curBudget();
  let filled=0;
  ['income','needs','wants','business','bizIncome','bizInvest'].forEach(sec=>{
    (cur[sec]||[]).forEach(row=>{
      if(parseFloat(String(row.amount||0).replace(/,/g,''))||0)return; // typed — keep
      const nm=(row.name||'').trim();
      if(!nm)return;
      const pRow=(prev[sec]||[]).find(r=>(r.name||'').trim()===nm);
      const v=pRow?parseFloat(String(pRow.amount||0).replace(/,/g,''))||0:0;
      if(v){row.amount=String(v);filled++;}
    });
  });
  if(!filled){showToast('אין מה להעתיק — כל השדות כבר מלאים');return;}
  touchSection('budget');markDirty();
  renderBudget();
  showToast('הועתקו '+filled+' סכומים מ'+fmtBudgetMonth(pk)+' ✓ עדכנו רק מה שהשתנה');
}
function budgetNotesChange(el){
  curBudget().notes=el.value;
  touchSection('budget');markDirty();
}
// ── Unusual expense marker ──
// A category is flagged when its amount is 30%+ (and at least ₪200) above its
// average in previous months — needs at least 2 previous data points.
function budgetRowFlag(sec,name,amount){
  const amt=parseFloat(String(amount||0).replace(/,/g,''))||0;
  const nm=(name||'').trim();
  if(!amt||!nm||sec==='income'||sec==='bizIncome')return null;
  const keys=Object.keys(D.budgetMonths).sort().filter(k=>k<D.budgetCurMonth);
  const vals=[];
  keys.forEach(k=>{
    const row=(D.budgetMonths[k][sec]||[]).find(r=>(r.name||'').trim()===nm);
    const v=row?parseFloat(String(row.amount||0).replace(/,/g,''))||0:0;
    if(v>0)vals.push(v);
  });
  if(vals.length<2)return null;
  const avg=vals.reduce((s,v)=>s+v,0)/vals.length;
  if(amt>avg*1.3&&(amt-avg)>=200)return Math.round(avg);
  return null;
}
function renderBudgetMonthSelect(){
  const sel=document.getElementById('budget-month-select');
  if(!sel)return;
  const keys=Object.keys(D.budgetMonths).sort().reverse();
  sel.innerHTML=keys.map(k=>`<option value="${k}"${k===D.budgetCurMonth?' selected':''}>${fmtBudgetMonth(k)}</option>`).join('')
    +'<option value="__new__">➕ הוסף חודש...</option>';
}
function budgetMonthSelect(el){
  if(el.value==='__new__'){
    el.value=D.budgetCurMonth; // keep the select on the current month meanwhile
    budgetPickOpen('add');
    return;
  }
  D.budgetCurMonth=el.value;
  markDirty();
  renderBudget();
}
// ── Month picker (two dropdowns: month + year) ──
// _budgetPickMode: 'add' = create a new month, 'move' = change the current month's date
let _budgetPickMode='add';
function budgetPickOpen(mode){
  _budgetPickMode=mode;
  const wrap=document.getElementById('budget-month-picker');
  const mSel=document.getElementById('budget-pick-month');
  const ySel=document.getElementById('budget-pick-year');
  const lbl=document.getElementById('budget-pick-label');
  if(!wrap||!mSel||!ySel)return;
  // Years: current−2 … current+1, plus any year already in the data
  const nowY=new Date().getFullYear();
  const years=new Set();
  for(let y=nowY-2;y<=nowY+1;y++)years.add(y);
  Object.keys(D.budgetMonths).forEach(k=>years.add(+k.split('-')[0]));
  const yList=Array.from(years).sort();
  mSel.innerHTML=HEB_MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  ySel.innerHTML=yList.map(y=>`<option value="${y}">${y}</option>`).join('');
  // Default: 'move' → the current month's date; 'add' → today's month
  const base=mode==='move'?D.budgetCurMonth:currentMonthKey();
  const p=base.split('-');
  ySel.value=p[0];mSel.value=String(+p[1]);
  if(lbl)lbl.textContent=mode==='move'?'העבר את החודש הנוכחי אל:':'איזה חודש להוסיף?';
  wrap.style.display='flex';
}
function budgetPickCancel(){
  const wrap=document.getElementById('budget-month-picker');
  if(wrap)wrap.style.display='none';
}
function budgetPickConfirm(){
  const m=document.getElementById('budget-pick-month').value;
  const y=document.getElementById('budget-pick-year').value;
  const key=y+'-'+String(m).padStart(2,'0');
  budgetPickCancel();
  if(_budgetPickMode==='move'){
    if(key===D.budgetCurMonth)return;
    if(D.budgetMonths[key]){showToast('חודש '+fmtBudgetMonth(key)+' כבר קיים — מחק אותו קודם או בחר תאריך אחר');return;}
    D.budgetMonths[key]=D.budgetMonths[D.budgetCurMonth];
    delete D.budgetMonths[D.budgetCurMonth];
    D.budgetCurMonth=key;
    touchSection('budget');markDirty();
    renderBudget();
    showToast('החודש הועבר ל'+fmtBudgetMonth(key)+' ✓');
    return;
  }
  // add mode
  if(D.budgetMonths[key]){
    D.budgetCurMonth=key;renderBudget();
    showToast('חודש '+fmtBudgetMonth(key)+' כבר קיים — עברתי אליו');
    return;
  }
  D.budgetMonths[key]=newBudgetMonthTemplate();
  D.budgetCurMonth=key;
  touchSection('budget');markDirty();
  renderBudget();
  showToast('נוסף חודש '+fmtBudgetMonth(key)+' ✓');
}
// Delete the month currently shown (e.g. opened by mistake)
function budgetDeleteMonth(){
  const key=D.budgetCurMonth;
  if(!confirm('למחוק את חודש '+fmtBudgetMonth(key)+' וכל הנתונים שבו?\n\nלא ניתן לשחזר.'))return;
  delete D.budgetMonths[key];
  const keys=Object.keys(D.budgetMonths).sort();
  D.budgetCurMonth=keys.length?keys[keys.length-1]:currentMonthKey();
  if(!D.budgetMonths[D.budgetCurMonth])D.budgetMonths[D.budgetCurMonth]=defBudgetMonth();
  touchSection('budget');markDirty();
  renderBudget();
  showToast('חודש '+fmtBudgetMonth(key)+' נמחק ✓');
}
function renderBudgetSection(sec){
  const el=document.getElementById('budget-'+sec);
  if(!el)return;
  const meta=BUDGET_SECTIONS[sec];
  const rows=curBudget()[sec]||[];
  let html='';
  rows.forEach((row,i)=>{
    const flagAvg=budgetRowFlag(sec,row.name,row.amount);
    // Rows filled from a statement keep their transactions — a button opens them under the row
    const txs=budgetRowTx(sec,row.name),open=txs.length&&_budgetOpenRow===sec+'|'+(row.name||'').trim();
    const off=!!row.skip; // "לא לספור": visible, but left out of the figures
    html+=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px${off?';opacity:.55':''}">
      <input type="text" value="${esc(row.name||'')}" placeholder="${meta.ph}" dir="rtl"
        oninput="updateBudgetRow('${sec}',${i},'name',this.value)"
        style="flex:1;min-width:0;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:var(--font);font-size:13px;padding:8px 10px;text-align:right"/>
      ${off?`<span style="flex-shrink:0;font-size:10.5px;color:var(--amber);white-space:nowrap">לא נספר</span>`:''}
      ${txs.length?`<button onclick="budgetToggleRowTx('${sec}',${i})" title="מה נכלל בקטגוריה הזו"
        style="flex-shrink:0;background:${open?'rgba(66,235,214,.14)':'var(--s2)'};border:1px solid ${open?'var(--teal-border)':'var(--border)'};color:var(--teal);border-radius:8px;padding:6px 6px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">📋${txs.length}${open?'▴':'▾'}</button>`:''}
      <span id="budget-flag-${sec}-${i}" onclick="budgetFlagInfo('${sec}',${i})"
        title="גבוה מהרגיל" style="display:${flagAvg!=null?'inline':'none'};cursor:pointer;font-size:14px;flex-shrink:0">👀</span>
      ${_bNum(row.amount)&&(row.name||'').trim()?`<button onclick="budgetRepeatOpen('${sec}',${i},true)" title="להחיל את הסכום גם על חודשים אחרים (הוצאה קבועה)"
        style="flex-shrink:0;background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:0 1px">🔁</button>`:''}
      <input type="number" value="${row.amount||''}" placeholder="0" data-no-fmt
        oninput="updateBudgetRow('${sec}',${i},'amount',this.value)" onchange="budgetRepeatOffer('${sec}',${i})"
        style="width:110px;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:${meta.color};font-family:var(--font);font-size:14px;font-weight:700;padding:8px 10px;text-align:center${off?';text-decoration:line-through':''}"/>
      ${_bNum(row.amount)||off?`<button onclick="budgetRowSkip('${sec}',${i})" title="${off?'להחזיר לחישוב':'לא לספור בחישוב (למשל הוצאה חד־פעמית, או כזו שתוחזר לכם)'}"
        style="flex-shrink:0;background:none;border:none;color:${off?'var(--amber)':'var(--t3)'};cursor:pointer;font-size:14px;padding:0 1px">${off?'↩':'⊘'}</button>`:''}
      <button onclick="removeBudgetRow('${sec}',${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0">×</button>
    </div>${open?budgetRowTxPanel(sec,row.name,txs):''}${budgetRepeatPanel(sec,i,row)}`;
  });
  const total=budgetTotal(sec);
  const offSum=rows.filter(r=>r.skip).reduce((s,r)=>s+_bNum(r.amount),0);
  html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 2px;margin-top:2px;border-top:1px solid var(--border)">
    <span style="font-size:12px;color:var(--t3)">${meta.totalLbl}${offSum?` <span style="color:var(--amber)">(לא כולל ${fmt(offSum)} שסומנו "לא לספור")</span>`:''}</span>
    <span id="budget-total-${sec}" style="font-size:15px;font-weight:800;color:${meta.color}">${fmt(total)}</span>
  </div>`;
  el.innerHTML=html;
}
function budgetRowSkip(sec,i){
  const row=(curBudget()[sec]||[])[i];if(!row)return;
  if(row.skip)delete row.skip;else row.skip=true;
  touchSection('budget');markDirty();renderBudget();
  showToast(row.skip?'"'+(row.name||'')+'" לא נספר בחישוב — אפשר להחזיר עם ↩':'"'+(row.name||'')+'" חזר לחישוב ✓');
}
function updateBudgetRow(sec,i,field,val){
  const b=curBudget();
  if(!b[sec]||!b[sec][i])return;
  // Renaming a row keeps its imported transactions attached to it
  if(field==='name'&&Array.isArray(b.tx)){
    const from=sec+'|'+(b[sec][i].name||'').trim(),to=sec+'|'+String(val||'').trim();
    b.tx.forEach(t=>{if(t.k===from)t.k=to;});
    if(_budgetOpenRow===from)_budgetOpenRow=to;
  }
  b[sec][i][field]=val;
  if(field==='amount'){
    const totEl=document.getElementById('budget-total-'+sec);
    if(totEl)totEl.textContent=fmt(budgetTotal(sec));
    renderBudgetSummary();
    if(sec==='business'||sec==='bizIncome'||sec==='bizInvest')renderBizNet();
    if(sec==='business'){const vn=document.getElementById('budget-vat-notice');if(vn)vn.innerHTML=vatNoticeHtml();}
  }
  // Refresh the "higher than usual" marker for this row
  const flagEl=document.getElementById('budget-flag-'+sec+'-'+i);
  if(flagEl)flagEl.style.display=budgetRowFlag(sec,b[sec][i].name,b[sec][i].amount)!=null?'inline':'none';
  touchSection('budget');markDirty();
}
function budgetFlagInfo(sec,i){
  const row=curBudget()[sec][i];
  if(!row)return;
  const avg=budgetRowFlag(sec,row.name,row.amount);
  if(avg!=null)showToast('👀 "'+(row.name||'')+'" גבוה מהרגיל — הממוצע בחודשים קודמים: '+fmt(avg));
}
function addBudgetRow(sec){
  const b=curBudget();
  if(!Array.isArray(b[sec]))b[sec]=[];
  b[sec].push({name:'',amount:''});
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  const el=document.getElementById('budget-'+sec);
  if(el){const ins=el.querySelectorAll('input[type="text"]');if(ins.length)ins[ins.length-1].focus();}
}
function removeBudgetRow(sec,i){
  const b=curBudget();
  if(!Array.isArray(b[sec]))return;
  // a deleted row takes its imported transactions with it
  if(b[sec][i]&&Array.isArray(b.tx)){const k=sec+'|'+(b[sec][i].name||'').trim();b.tx=b.tx.filter(t=>t.k!==k);}
  b[sec].splice(i,1);
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  renderBudgetSummary();
  if(sec==='business'||sec==='bizIncome'||sec==='bizInvest')renderBizNet();
}
// ── Employment profile card (top of the page) ──
function renderBudgetProfile(){
  const el=document.getElementById('budget-profile');
  if(!el)return;
  // a joint account has no employment profile — each partner sets theirs in their own account
  const joint=typeof budgetActiveIsJoint==='function'&&budgetActiveIsJoint();
  el.style.display=joint?'none':'';
  if(joint){el.innerHTML='';return;}
  const p=budgetProfile();
  const chip=(on)=>`display:inline-flex;align-items:center;gap:7px;cursor:pointer;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:700;border:1.5px solid ${on?'var(--teal)':'var(--border)'};background:${on?'rgba(66,235,214,.10)':'var(--s2)'};color:${on?'var(--teal)':'var(--t2)'}`;
  const radio=(name,val,cur,label,sub)=>`<label style="${chip(cur===val)};flex-direction:column;align-items:flex-start;gap:2px">
      <span style="display:flex;align-items:center;gap:7px"><input type="radio" name="${name}" value="${val}" ${cur===val?'checked':''} onchange="setBudgetProfile('${name}',this.value)" style="accent-color:var(--teal)"/>${label}</span>
      ${sub?`<span style="font-size:10.5px;font-weight:400;color:var(--t3)">${sub}</span>`:''}
    </label>`;
  let html=`
    <div class="ch-title">👤 ${typeof budgetAccs==='function'&&budgetAccs()?'מצב התעסוקה — '+esc(budgetAccName(D.budgetActiveAcc)):'מה מצב התעסוקה שלך?'}</div>
    <div class="ch-hint">אפשר לסמן את שניהם — למשל שכיר שיש לו גם עסק בצד.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <label style="${chip(p.salaried)}"><input type="checkbox" ${p.salaried?'checked':''} onchange="setBudgetProfile('salaried',this.checked)" style="accent-color:var(--teal)"/> שכיר</label>
      <label style="${chip(p.selfEmployed)}"><input type="checkbox" ${p.selfEmployed?'checked':''} onchange="setBudgetProfile('selfEmployed',this.checked)" style="accent-color:var(--teal)"/> עצמאי</label>
    </div>`;
  if(p.selfEmployed){
    html+=`
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:13px;font-weight:800;color:var(--white);margin-bottom:8px">איזה סוג עוסק?${!p.bizType?' <span style="color:var(--amber);font-size:11.5px;font-weight:700">· בחרו אחד</span>':''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${radio('bizType','patur',p.bizType,'עוסק פטור','מחזור קטן, לא גובה מע"מ')}
        ${radio('bizType','zair',p.bizType,'עוסק זעיר','מסלול מיסוי מפושט לעסק קטן')}
        ${radio('bizType','murshe',p.bizType,'עוסק מורשה','גובה מע"מ ומדווח למע"מ')}
      </div>
      ${p.bizType==='murshe'?`<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--t2);cursor:pointer">
        <input type="checkbox" ${p.vatBimonthly?'checked':''} onchange="setBudgetProfile('vatBimonthly',this.checked)" style="accent-color:var(--teal)"/>
        אני מדווח/ת מע"מ פעם בחודשיים
      </label>`:''}
    </div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:13px;font-weight:800;color:var(--white);margin-bottom:8px">איך לנהל את כספי העסק?${!p.bizMode?' <span style="color:var(--amber);font-size:11.5px;font-weight:700">· בחרו אחד</span>':''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${radio('bizMode','combined',p.bizMode,'משולב עם הבית','תשלומי העסק נספרים בהוצאות החודשיות')}
        ${radio('bizMode','separate',p.bizMode,'תזרים נפרד לעסק','לעסק הכנסות והוצאות משלו, מחוץ לחשבון הבית')}
      </div>
    </div>`;
  }
  el.innerHTML=html;
}
// ── Business card ("💼 עסק") — shown only for self-employed ──
function renderBudgetBusiness(){
  const card=document.getElementById('budget-business-card');
  if(!card)return;
  const p=budgetProfile();
  if(!p.selfEmployed){card.style.display='none';card.innerHTML='';return;}
  card.style.display='';
  const sep=p.bizMode==='separate';
  const typeLbl=BIZ_TYPES[p.bizType]||'';
  card.innerHTML=`
    <div class="ch-title"><span style="color:#c4b5fd">💼</span> עסק${typeLbl?' · '+typeLbl:''}</div>
    <div class="ch-hint">${sep
      ?'תזרים נפרד לעסק — ההכנסות וההוצאות של העסק לא נכללות בחשבון של הבית.'
      :'משולב עם הבית — תשלומי העסק נספרים כהוצאה בחשבון החודשי. את הכנסת העסק רשמו בחלק "הכנסות".'}</div>
    ${p.bizType==='patur'?'<div style="font-size:11.5px;color:var(--amber);margin-bottom:8px">💡 עוסק פטור לרוב לא גובה ולא משלם מע"מ — אפשר להשאיר את שורת המע"מ על 0.</div>':''}
    <div id="budget-vat-notice">${vatNoticeHtml()}</div>
    ${sep?`<div style="font-size:12.5px;font-weight:800;color:var(--white);margin:4px 0 2px">💰 הכנסות העסק</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:6px">רשמו <b>ברוטו</b> — כל מה שנכנס לעסק, לפני מע"מ, ביטוח לאומי ומס הכנסה (התשלומים נרשמים בנפרד למטה).</div>
      <div id="budget-bizIncome"></div>
      <button class="btnadd" onclick="addBudgetRow('bizIncome')" style="margin-top:8px">+ הוסף הכנסה עסקית</button>
      <div style="font-size:12.5px;font-weight:800;color:var(--white);margin:16px 0 6px">🧾 תשלומים והוצאות העסק</div>`:''}
    <div id="budget-business"></div>
    <button class="btnadd" onclick="addBudgetRow('business')" style="margin-top:8px">+ הוסף תשלום / הוצאה לעסק</button>
    <div style="margin-top:16px;padding-top:12px;border-top:1px dashed rgba(96,165,250,.35)">
      <div style="font-size:12.5px;font-weight:800;color:#60a5fa;margin-bottom:2px">📈 העברה להשקעות</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:6px">הפקדות לפנסיה ולקרן השתלמות — כסף שיוצא מהתזרים אבל נשאר שלכם, כחיסכון. ${sep?'נכלל בחשבון של העסק,':'בסיכום של הבית הוא'} מוצג בנפרד מההוצאות.</div>
      <div id="budget-bizInvest"></div>
      <button class="btnadd" onclick="addBudgetRow('bizInvest')" style="margin-top:8px;border-color:rgba(96,165,250,.35);color:#60a5fa">+ הוסף הפקדה להשקעה</button>
    </div>
    <div id="budget-biz-net"></div>`;
  if(sep)renderBudgetSection('bizIncome');
  renderBudgetSection('business');
  renderBudgetSection('bizInvest');
  renderBizNet();
}
// Business net (separate mode only): business income − business payments.
function renderBizNet(){
  const el=document.getElementById('budget-biz-net');
  if(!el)return;
  if(!bizSeparate()){el.innerHTML='';return;}
  // deposits to investments leave the business cashflow, but are shown apart (they're savings)
  const inc=budgetTotal('bizIncome'),exp=budgetTotal('business')+vatSplitAdj(D.budgetMonths,D.budgetCurMonth),inv=budgetTotal('bizInvest'),net=inc-exp-inv,pos=net>=0;
  el.innerHTML=`<div style="margin-top:12px;background:var(--s2);border:1px solid rgba(167,139,250,.35);border-radius:10px;padding:10px 12px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <span style="font-size:12.5px;color:var(--t2);font-weight:700">${pos?'נשאר בעסק החודש':'גירעון בעסק החודש'}</span>
      <span style="font-size:16px;font-weight:800;color:${pos?'var(--teal)':'var(--red)'}">${iln((pos?'':'−')+fmt(Math.abs(net)))}</span></div>
    ${inv?`<div style="font-size:11.5px;color:#60a5fa;margin-top:4px">📈 בנוסף הועברו ${iln(fmt(inv))} להשקעות (פנסיה / השתלמות) — סה"כ חיסכון מהעסק: ${iln(fmt(Math.max(0,net)+inv))}</div>`:''}
  </div>`;
}
// ── Savings trend chart: how much was left over, month by month ──
let chBudget=null;
function renderBudgetTrend(){
  const wrap=document.getElementById('budget-trend-card');
  const canvas=document.getElementById('ch-budget');
  if(!wrap||!canvas)return;
  const keys=Object.keys(D.budgetMonths).sort().filter(k=>k<=currentMonthKey()); // no future months
  const pts=keys.map(k=>{
    const s=budgetSavedOf(D.budgetMonths[k]);
    return {k,saved:s.inc-s.exp,has:(s.inc||s.exp)>0};
  }).filter(p=>p.has);
  if(pts.length<2||typeof Chart==='undefined'){
    wrap.style.display='none';
    if(chBudget){chBudget.destroy();chBudget=null;}
    return;
  }
  wrap.style.display='block';
  const labels=pts.map(p=>{const q=p.k.split('-');return (HEB_MONTHS[+q[1]-1]||q[1])+' '+q[0].slice(2);});
  const data=pts.map(p=>p.saved);
  if(chBudget)chBudget.destroy();
  chBudget=new Chart(canvas,{
    type:'bar',
    data:{labels,datasets:[{data,backgroundColor:data.map(v=>v>=0?'rgba(66,235,214,.75)':'rgba(239,68,68,.75)'),borderRadius:6,maxBarThickness:46}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>(c.raw>=0?'נשאר: ':'גירעון: ')+fmt(Math.abs(c.raw))}}},
      scales:{y:{ticks:{callback:v=>fmt(v),color:'#94a3b8',font:{size:10}},grid:{color:'rgba(30,45,69,.6)'}},
        x:{ticks:{color:'#94a3b8',font:{size:11}},grid:{display:false}}}}
  });
}
function renderBudgetSummary(){
  const el=document.getElementById('budget-summary');
  if(!el)return;
  renderBudgetTrend();
  renderBudgetBank(); // the bank check depends on the same totals
  const inc=budgetTotal('income'),needs=budgetTotal('needs'),wants=budgetTotal('wants');
  // business payments (combined mode); a bi-monthly VAT payment may be split over two months
  const vatAdj=bizCombined()?vatSplitAdj(D.budgetMonths,D.budgetCurMonth):0;
  const biz=bizCombined()?budgetTotal('business')+vatAdj:0;
  // deposits to pension / study fund (combined mode): out of the cashflow, but savings — shown apart
  const inv=bizCombined()?budgetTotal('bizInvest'):0;
  const exp=needs+wants+biz,saved=inc-exp-inv;
  const pct=v=>inc>0?Math.round(v/inc*100):0;
  const needsPct=pct(needs),wantsPct=pct(wants),bizPct=pct(biz),invPct=pct(inv),savePct=pct(saved);
  if(!inc&&!exp){
    el.innerHTML=`<div class="card" style="text-align:center;color:var(--t3);font-size:13px;padding:20px">מלאו הכנסות והוצאות למטה כדי לראות כמה חסכתם החודש 👇</div>`;
    return;
  }
  const savedPositive=saved>=0;
  // Comparison to the previous month (if it has data)
  let cmpHtml='';
  const keys=Object.keys(D.budgetMonths).sort();
  const idx=keys.indexOf(D.budgetCurMonth);
  if(idx>0){
    const prev=budgetSavedOf(D.budgetMonths[keys[idx-1]]);
    if(prev.inc||prev.exp){
      const prevSaved=prev.inc-prev.exp;
      const d=saved-prevSaved;
      if(d!==0){
        cmpHtml=`<div style="font-size:12px;color:${d>0?'var(--green)':'var(--amber)'};margin-top:3px">
          ${d>0?'↑':'↓'} ${iln((d>0?'+':'−')+fmt(Math.abs(d)))} לעומת ${fmtBudgetMonth(keys[idx-1])} (${prevSaved>=0?'חיסכון':'גירעון'} של ${iln(fmt(Math.abs(prevSaved)))})</div>`;
      }
    }
  }
  const barSeg=(w,c)=>w>0?`<div style="width:${Math.min(100,w)}%;background:${c};height:100%"></div>`:'';
  el.innerHTML=`
  <div class="card" style="background:linear-gradient(135deg,rgba(66,235,214,.09),rgba(66,235,214,.02));border:1.5px solid rgba(66,235,214,.35)">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:12px;color:var(--t3);margin-bottom:2px">${savedPositive?'נשאר לכם החודש':'הייתם בגירעון החודש'}</div>
      <div style="font-size:30px;font-weight:800;color:${savedPositive?'var(--teal)':'var(--red)'}">${iln((savedPositive?'':'−')+fmt(Math.abs(saved)))}</div>
      ${inc>0&&savedPositive?`<div style="font-size:12px;color:var(--t2);margin-top:2px">${savePct}% מההכנסה נשארו פנויים לחיסכון ולהשקעה</div>`:''}
      ${cmpHtml}
    </div>
    <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--s2);margin-bottom:6px">
      ${barSeg(needsPct,'var(--green)')}${barSeg(wantsPct,'var(--amber)')}${barSeg(bizPct,'#a78bfa')}${barSeg(invPct,'#60a5fa')}${barSeg(savePct,'var(--teal)')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(${3+(biz>0?1:0)+(inv>0?1:0)},minmax(0,1fr));gap:8px;margin-top:12px">
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--green)">●</span> צרכים</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${iln(fmt(needs))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?needsPct+'% מההכנסה':''}</div>
      </div>
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--amber)">●</span> כיף</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${iln(fmt(wants))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?wantsPct+'% מההכנסה':''}</div>
      </div>
      ${biz>0?`<div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:#a78bfa">●</span> עסק</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${iln(fmt(biz))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?bizPct+'% מההכנסה':''}</div>
      </div>`:''}
      ${inv>0?`<div style="text-align:center;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.3);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:#60a5fa">●</span> 📈 להשקעות</div>
        <div style="font-size:15px;font-weight:800;color:#60a5fa">${iln(fmt(inv))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?invPct+'% מההכנסה':''}</div>
      </div>`:''}
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--teal)">●</span> נשאר פנוי</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${iln(fmt(Math.max(0,saved)))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?Math.max(0,savePct)+'% מההכנסה':''}</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--t3);text-align:center">
      הכנסות ${iln(fmt(inc))} − הוצאות ${iln(fmt(exp))}${biz>0?' (כולל '+iln(fmt(biz))+' תשלומי עסק)':''}${inv>0?' − הפקדות להשקעה '+iln(fmt(inv)):''} = ${savedPositive?'נשארו':'גירעון של'} ${iln(fmt(Math.abs(saved)))}
      ${inv>0?`<div style="margin-top:6px;font-size:12px;color:#60a5fa;font-weight:700">💪 סה"כ חיסכון החודש: ${iln(fmt(Math.max(0,saved)+inv))} — ${iln(fmt(Math.max(0,saved)))} שנשארו פנויים + ${iln(fmt(inv))} שהופקדו לפנסיה / השתלמות</div>`:''}
      ${bizSeparate()?'<div style="margin-top:4px">💼 העסק מנוהל בתזרים נפרד — ראו את כרטיס "עסק" למטה.</div>':''}
      ${vatAdj?'<div style="margin-top:4px">🧾 מע"מ מחולק בין חודשים: '+(vatAdj>0?'כולל הוצאה מדומה של '+iln(fmt(vatAdj))+' (חצי מתשלום החודש הבא)':'נספר רק חצי מתשלום החודש ('+iln(fmt(-vatAdj))+' עברו לחודש הקודם)')+'</div>':''}
    </div>
  </div>`;
}
