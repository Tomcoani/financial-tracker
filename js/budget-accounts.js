// ══ MONTHLY BUDGET — several accounts (התנהלות חודשית) ══
// For households with more than one account (e.g. one per partner + a joint one), up to 3.
// Each account is a full budget of its own. To keep every budget feature working unchanged,
// D.budgetMonths / D.budgetCurMonth always hold the ACTIVE account; the other accounts are kept
// in D.budgetAccData[id] = {months, cur} and swapped in when switched to.
//   D.budgetAccounts = [{id, name}]   D.budgetActiveAcc = id   D.budgetView = '' | 'all'
// The "all accounts" view is a read-only combined summary for one month + one line per account.
const BUDGET_MAX_ACC=3;
let _budgetAllMonth=null;
function budgetAccs(){return Array.isArray(D.budgetAccounts)&&D.budgetAccounts.length?D.budgetAccounts:null;}
function budgetAccName(id){const a=(budgetAccs()||[]).find(x=>x.id===id);return a?a.name:'';}
// The months of any account (the active one lives in D.budgetMonths)
function budgetAccMonths(id){
  if(!budgetAccs()||id===D.budgetActiveAcc)return D.budgetMonths||{};
  return (((D.budgetAccData||{})[id])||{}).months||{};
}
// Every account's months — for figures about the whole household (e.g. the goals savings tile)
function budgetMonthsMaps(){
  const a=budgetAccs();
  return a?a.map(x=>budgetAccMonths(x.id)):[D.budgetMonths||{}];
}
// Each account has its own employment profile (one partner salaried, the other self-employed).
// Like the months, the active account's profile lives in D.budgetProfile.
const _BUDGET_EMPTY_PROFILE=()=>({salaried:false,selfEmployed:false,bizType:'',bizMode:''});
function budgetAccProfile(id){
  if(!budgetAccs()||id===D.budgetActiveAcc)return D.budgetProfile||{};
  return (((D.budgetAccData||{})[id])||{}).profile||{};
}
// [{months, profile}] for every account
function budgetAccEntries(){
  const a=budgetAccs();
  return a?a.map(x=>({months:budgetAccMonths(x.id),profile:budgetAccProfile(x.id)})):[{months:D.budgetMonths||{},profile:D.budgetProfile||{}}];
}
// A joint account has no employment profile of its own
function budgetActiveIsJoint(){const a=budgetAccs();return !!a&&/משותף/.test(budgetAccName(D.budgetActiveAcc));}
function _budgetNewAccId(){const used=new Set((budgetAccs()||[]).map(x=>x.id));for(let i=1;;i++)if(!used.has('a'+i))return 'a'+i;}

// ── Switching ──
function budgetAccSwitch(id){
  if(id==='all'){
    D.budgetView='all';_budgetAllMonth=D.budgetCurMonth;
    touchSection('budget');markDirty();renderBudget();return;
  }
  D.budgetView='';
  if(id!==D.budgetActiveAcc){
    const keepMonth=D.budgetCurMonth;
    D.budgetAccData=D.budgetAccData||{};
    const prevProfile=D.budgetProfile||_BUDGET_EMPTY_PROFILE();
    D.budgetAccData[D.budgetActiveAcc]={months:D.budgetMonths,cur:D.budgetCurMonth,profile:prevProfile};
    const next=D.budgetAccData[id]||{months:{},cur:''};
    delete D.budgetAccData[id];
    D.budgetMonths=next.months||{};D.budgetActiveAcc=id;
    // accounts made before profiles were per account have none yet: they keep the profile they
    // used until now (a joint account starts without one)
    D.budgetProfile=next.profile||(/משותף/.test(budgetAccName(id))?_BUDGET_EMPTY_PROFILE():JSON.parse(JSON.stringify(prevProfile)));
    // stay on the month being looked at; an account that doesn't have it yet gets it
    D.budgetCurMonth=keepMonth;
    if(!D.budgetMonths[keepMonth])D.budgetMonths[keepMonth]=newBudgetMonthTemplate();
    if(typeof _budgetOpenRow!=='undefined'){_budgetOpenRow=null;_budgetEditTx=null;_budgetRepeat=null;}
  }
  touchSection('budget');markDirty();renderBudget();
}

// ── Adding / renaming / removing ──
function budgetAccAdd(){
  if((budgetAccs()||[]).length>=BUDGET_MAX_ACC){showToast('אפשר עד '+BUDGET_MAX_ACC+' חשבונות');return;}
  if(!budgetAccs()){
    // first time: the budget so far becomes the first account
    const first=(prompt('איך לקרוא לחשבון הנוכחי (כל מה שכבר רשום כאן)?','בן/בת זוג 1')||'').trim();
    if(!first)return;
    D.budgetAccounts=[{id:'a1',name:first}];D.budgetActiveAcc='a1';D.budgetAccData={};
  }
  // suggested names: partner 2, then the joint account
  const n=D.budgetAccounts.length,taken=new Set(D.budgetAccounts.map(a=>a.name));
  const sug=['בן/בת זוג 2','חשבון משותף','בן/בת זוג 1'].find(s=>!taken.has(s))||'';
  const name=(prompt('שם החשבון החדש:',n===1?sug:(taken.has('חשבון משותף')?sug:'חשבון משותף'))||'').trim();
  if(!name){touchSection('budget');markDirty();renderBudget();return;}
  const id=_budgetNewAccId();
  D.budgetAccounts.push({id,name});
  D.budgetAccData[id]={months:{},cur:D.budgetCurMonth,profile:_BUDGET_EMPTY_PROFILE()}; // its own employment profile
  budgetAccSwitch(id);
  showToast('נוסף החשבון "'+name+'" ✓ אפשר להתחיל למלא אותו');
}
function budgetAccRename(id){
  const a=(budgetAccs()||[]).find(x=>x.id===id);if(!a)return;
  const name=(prompt('שם החשבון:',a.name)||'').trim();if(!name||name===a.name)return;
  a.name=name;touchSection('budget');markDirty();renderBudget();
}
function budgetAccRemove(id){
  const accs=budgetAccs();if(!accs||accs.length<2)return;
  const a=accs.find(x=>x.id===id);if(!a)return;
  if(!confirm('להסיר את החשבון "'+a.name+'" וכל החודשים שלו?\n\nלא ניתן לשחזר.'))return;
  if(id===D.budgetActiveAcc)budgetAccSwitch(accs.find(x=>x.id!==id).id);
  D.budgetAccounts=accs.filter(x=>x.id!==id);
  if(D.budgetAccData)delete D.budgetAccData[id];
  if(D.budgetAccounts.length===1&&D.budgetView==='all')D.budgetView='';
  touchSection('budget');markDirty();renderBudget();
  showToast('החשבון "'+a.name+'" הוסר');
}
// Reset the account being edited: every month of it is deleted (amounts, transactions, bank data,
// which files were uploaded) so it can be filled again from scratch, e.g. by uploading the files
// again. The account itself, its name and profile stay; so do the remembered merchants — the next
// upload sorts them by themselves. The other accounts aren't touched.
function budgetAccReset(){
  const accs=budgetAccs(),name=accs?budgetAccName(D.budgetActiveAcc):'ההתנהלות החודשית';
  const n=Object.keys(D.budgetMonths||{}).length;
  const typed=(prompt(`איפוס "${name}": כל ${n} החודשים שלו יימחקו — סכומים, עסקאות, נתוני עו"ש וקבצים שהועלו — ואפשר יהיה להתחיל מחדש ולהעלות קבצים שוב.${accs&&accs.length>1?'\nשאר החשבונות לא ייפגעו.':''}\n\nלא ניתן לשחזר. כדי לאשר כתבו: איפוס`,'')||'').trim();
  if(typed!=='איפוס'){if(typed)showToast('לא אופס — צריך לכתוב בדיוק: איפוס');return;}
  D.budgetMonths={};D.budgetCurMonth=currentMonthKey();
  migrateBudget(); // a fresh current month with the default categories
  touchSection('budget');markDirty();renderBudget();
  showToast(`"${name}" אופס ✓ — אפשר להעלות את הקבצים מחדש`);
}

// ── The bar at the top of the page ──
// Returns true when the "all accounts" view was drawn (the normal page is then hidden).
function budgetAccRender(){
  const bar=document.getElementById('budget-acc-bar');
  const edit=document.getElementById('budget-edit-area'),comb=document.getElementById('budget-combined');
  const accs=budgetAccs();
  const showAll=!!accs&&accs.length>1&&D.budgetView==='all';
  if(bar){
    const chip=(id,label,active,extra)=>`<button onclick="budgetAccSwitch('${id}')" style="display:inline-flex;align-items:center;gap:5px;
      background:${active?'rgba(66,235,214,.14)':'var(--s2)'};border:1px solid ${active?'var(--teal-border)':'var(--border)'};
      color:${active?'var(--teal)':'var(--t2)'};border-radius:20px;padding:5px 12px;font-family:var(--font);font-size:12.5px;font-weight:${active?800:600};cursor:pointer">${label}${extra||''}</button>`;
    let html='';
    if(accs){
      html=accs.map(a=>{const act=!showAll&&a.id===D.budgetActiveAcc;
        return chip(a.id,'🏦 '+esc(a.name),act);}).join('');
      if(accs.length>1)html+=chip('all','📊 סה"כ כל החשבונות',showAll);
      const cur=!showAll&&accs.find(a=>a.id===D.budgetActiveAcc);
      const tools=cur?`<button onclick="budgetAccRename('${cur.id}')" title="שינוי שם החשבון" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">✎ שם</button>`
        +`<button onclick="budgetAccReset()" title="למחוק את כל הנתונים של החשבון הזה ולהתחיל מחדש" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">🧹 איפוס חשבון</button>`
        +(accs.length>1?`<button onclick="budgetAccRemove('${cur.id}')" title="הסרת החשבון" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">🗑 הסר חשבון</button>`:''):'';
      html=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 10px">${html}
        ${accs.length<BUDGET_MAX_ACC?`<button onclick="budgetAccAdd()" style="background:none;border:1px dashed var(--border);color:var(--teal);border-radius:20px;padding:5px 12px;font-family:var(--font);font-size:12px;cursor:pointer">+ חשבון</button>`:''}
        ${tools}</div>`;
    }else{
      html=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 8px"><button onclick="budgetAccAdd()" style="background:none;border:1px dashed var(--border);color:var(--teal);border-radius:20px;padding:5px 12px;font-family:var(--font);font-size:12px;cursor:pointer">+ חשבונות נפרדים (למשל לכל בן/בת זוג וחשבון משותף)</button>
        <button onclick="budgetAccReset()" title="למחוק את כל הנתונים ולהתחיל מחדש" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">🧹 איפוס</button></div>`;
    }
    bar.innerHTML=html;
  }
  if(edit)edit.style.display=showAll?'none':'';
  if(comb)comb.style.display=showAll?'':'none';
  const mc=document.getElementById('budget-month-controls');if(mc)mc.style.display=showAll?'none':'flex';
  ['budget-import-btn','budget-copy-prev','budget-copy-prev-hint'].forEach(i=>{const e=document.getElementById(i);if(e&&showAll)e.style.display='none';});
  // back on an account: the (admin-only) import button returns
  const ib=document.getElementById('budget-import-btn');
  if(ib&&!showAll)ib.style.display=(typeof canImportStatements==='function'&&canImportStatements())?'inline-flex':'none';
  if(showAll)renderBudgetCombined();
  return showAll;
}

// ── "All accounts": one combined summary + one line per account ──
function budgetAccSetMonth(k){_budgetAllMonth=k;renderBudgetCombined();}
function renderBudgetCombined(){
  const el=document.getElementById('budget-combined');if(!el)return;
  const accs=budgetAccs()||[];
  const keys=[...new Set(accs.flatMap(a=>Object.keys(budgetAccMonths(a.id))))].sort().reverse();
  const k=_budgetAllMonth&&keys.includes(_budgetAllMonth)?_budgetAllMonth:(keys.includes(D.budgetCurMonth)?D.budgetCurMonth:keys[0]);
  _budgetAllMonth=k;
  const sum=rows=>(rows||[]).reduce((s,r)=>s+budgetRowAmt(r),0);
  const lines=accs.map(a=>{
    const m=budgetAccMonths(a.id)[k],p=budgetAccProfile(a.id),comb=!!(p.selfEmployed&&p.bizMode!=='separate');
    if(!m)return {a,has:false,inc:0,needs:0,wants:0,biz:0,inv:0,exp:0,saved:0};
    const s=budgetSavedOf(m,p,budgetAccMonths(a.id)),biz=comb?sum(m.business)+vatSplitAdj(budgetAccMonths(a.id),k,p):0;
    return {a,has:true,m,comb,inc:s.inc,needs:sum(m.needs),wants:sum(m.wants),biz,inv:s.inv||0,exp:s.exp,saved:s.inc-s.exp+(s.inv||0)}; // saved = income − expenses: investments are savings
  });
  const T=lines.reduce((t,l)=>{['inc','needs','wants','biz','inv','exp','saved'].forEach(f=>t[f]+=l[f]);return t;},{inc:0,needs:0,wants:0,biz:0,inv:0,exp:0,saved:0});
  const pos=T.saved>=0,pct=v=>T.inc>0?Math.round(v/T.inc*100):0;
  const anyBiz=lines.some(l=>l.biz),anyInv=lines.some(l=>l.inv);
  // categories with the same name across accounts are added together
  const cats={};
  lines.filter(l=>l.has).forEach(l=>['needs','wants','invest'].concat(l.comb?['business']:[]).forEach(sec=>(l.m[sec]||[]).forEach(r=>{
    const n=(r.name||'').trim(),v=budgetRowAmt(r);if(!n||!v)return;
    const c=cats[sec+'|'+n]=cats[sec+'|'+n]||{sec,n,total:0,by:{}};c.total+=v;c.by[l.a.id]=(c.by[l.a.id]||0)+v;})));
  const catList=Object.values(cats).sort((a,b)=>b.total-a.total);
  const SEC_C={needs:'var(--green)',wants:'var(--amber)',invest:'#60a5fa',business:'#a78bfa'};
  // combined bank balances, where accounts have them
  const banks=lines.filter(l=>l.has&&l.m.bank&&l.m.bank.opening!=null&&l.m.bank.closing!=null);
  const cell=(v,c)=>`<td style="padding:7px 6px;text-align:center;white-space:nowrap${c?';color:'+c:''}">${iln(fmt(v))}</td>`;
  const signed=v=>iln((v>=0?'':'−')+fmt(Math.abs(v)));
  el.innerHTML=`
  <div class="card" style="background:linear-gradient(135deg,rgba(66,235,214,.09),rgba(66,235,214,.02));border:1.5px solid rgba(66,235,214,.35)">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="ch-title" style="margin:0">📊 כל החשבונות יחד</div>
      <select onchange="budgetAccSetMonth(this.value)" style="background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--teal);font-family:var(--font);font-size:13px;font-weight:700;padding:4px 8px">
        ${keys.map(x=>`<option value="${x}"${x===k?' selected':''}>${fmtBudgetMonth(x)}</option>`).join('')}</select>
    </div>
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:12px;color:var(--t3);margin-bottom:2px">${pos?(T.inv>0?'חסכתם החודש — בכל החשבונות':'נשאר לכם החודש — בכל החשבונות'):'גירעון החודש — בכל החשבונות'}</div>
      <div style="font-size:30px;font-weight:800;color:${pos?'var(--teal)':'var(--red)'}">${signed(T.saved)}</div>
      ${T.inc>0&&pos?`<div style="font-size:12px;color:var(--t2)">${pct(T.saved)}% מההכנסה של כולם</div>`:''}
      ${T.inv>0?`<div style="font-size:12px;color:#60a5fa;font-weight:700;margin-top:3px">📈 מתוכם ${iln(fmt(T.inv))} הועברו להשקעות — חיסכון, לא הוצאה</div>`:''}
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr style="color:var(--t3);font-size:11.5px">
        <th style="text-align:right;padding:6px">חשבון</th><th>הכנסות</th><th><span style="color:var(--green)">●</span> צרכים</th><th><span style="color:var(--amber)">●</span> כיף</th>${anyBiz?'<th><span style="color:#a78bfa">●</span> עסק</th>':''}${anyInv?'<th><span style="color:#60a5fa">●</span> להשקעות</th>':''}<th>חיסכון</th></tr></thead>
      <tbody>
      ${lines.map(l=>`<tr style="border-top:1px solid var(--border)">
        <td style="padding:7px 6px;font-weight:700"><button onclick="budgetAccSwitch('${l.a.id}')" title="למעבר לחשבון" style="background:none;border:none;color:var(--white);font-family:var(--font);font-size:12.5px;font-weight:700;cursor:pointer;padding:0;text-decoration:underline dotted">${esc(l.a.name)}</button>${l.has?'':' <span style="font-size:10.5px;color:var(--t3)">(אין נתונים לחודש)</span>'}</td>
        ${cell(l.inc,'var(--teal)')}${cell(l.needs)}${cell(l.wants)}${anyBiz?cell(l.biz):''}${anyInv?cell(l.inv,'#60a5fa'):''}
        <td style="padding:7px 6px;text-align:center;font-weight:800;white-space:nowrap;color:${l.saved>=0?'var(--teal)':'var(--red)'}">${signed(l.saved)}</td></tr>`).join('')}
      <tr style="border-top:2px solid var(--teal-border);font-weight:800">
        <td style="padding:7px 6px">סה"כ</td>${cell(T.inc,'var(--teal)')}${cell(T.needs)}${cell(T.wants)}${anyBiz?cell(T.biz):''}${anyInv?cell(T.inv,'#60a5fa'):''}
        <td style="padding:7px 6px;text-align:center;white-space:nowrap;color:${pos?'var(--teal)':'var(--red)'}">${signed(T.saved)}</td></tr>
      </tbody></table></div>
    ${banks.length?`<div style="font-size:12px;color:var(--t2);margin-top:10px">🏦 יתרה כוללת בעו"ש${banks.length<lines.length?' (בחשבונות שהועלה להם עו"ש)':''}: ${iln(fmt(banks.reduce((s,l)=>s+l.m.bank.opening,0)))} בתחילת החודש → ${iln(fmt(banks.reduce((s,l)=>s+l.m.bank.closing,0)))} בסוף</div>`:''}
  </div>
  ${catList.length?`<div class="card">
    <div class="ch-title">🧾 לאן הלך הכסף — כל החשבונות יחד</div>
    <div class="ch-hint">קטגוריות עם אותו שם בחשבונות שונים מחוברות. מתחת לכל אחת — כמה מכל חשבון.</div>
    ${catList.map(c=>`<div style="padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span><span style="color:${SEC_C[c.sec]}">●</span> ${esc(c.n)}</span><b>${iln(fmt(c.total))}</b></div>
      ${Object.keys(c.by).length>1?`<div style="font-size:11px;color:var(--t3);margin-top:2px">${accs.filter(a=>c.by[a.id]).map(a=>esc(a.name)+' '+fmt(c.by[a.id])).join(' · ')}</div>`:`<div style="font-size:11px;color:var(--t3);margin-top:2px">${esc(budgetAccName(Object.keys(c.by)[0]))}</div>`}
    </div>`).join('')}
  </div>`:''}
  <div class="card" id="budget-allchart-card">
    <div class="ch-title">📊 הכנסות מול הוצאות — חודש אחרי חודש</div>
    <div class="ch-hint">כל החשבונות יחד. העברה להשקעות לא נספרת כהוצאה (היא חיסכון). מעבר עם העכבר על חודש מראה את הסכומים ואת החיסכון.</div>
    <div style="display:flex;gap:14px;font-size:12px;color:var(--t2);margin:2px 0 6px">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#11a394;vertical-align:middle;margin-left:4px"></span>הכנסות</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#ef4444;vertical-align:middle;margin-left:4px"></span>הוצאות</span>
    </div>
    <div style="height:230px"><canvas id="ch-budget-all"></canvas></div>
  </div>
  <div class="card" id="budget-period-all" style="display:none"></div>
  <div style="font-size:11.5px;color:var(--t3);text-align:center;margin:-4px 0 14px">לעריכה — בוחרים חשבון בשורה למעלה. העברות בין החשבונות שלכם כדאי לסמן "לא לספור", כדי שלא ייראו כהוצאה וגם כהכנסה.</div>`;
  if(typeof renderBudgetPeriod==='function')renderBudgetPeriod('budget-period-all',budgetAccEntries());
  renderBudgetAllChart();
}
// Income vs expenses per month, all accounts together: two bars per month (validated pair —
// income #11a394, expenses #ef4444 — on the dark surface). Months still ahead and empty ones are left out.
let chBudgetAll=null;
function renderBudgetAllChart(){
  const card=document.getElementById('budget-allchart-card'),cv=document.getElementById('ch-budget-all');
  if(chBudgetAll){chBudgetAll.destroy();chBudgetAll=null;}
  if(!card||!cv)return;
  const ents=budgetAccEntries(),now=currentMonthKey(),by={};
  ents.forEach(e=>Object.entries(e.months||{}).forEach(([k,m])=>{
    if(k>now||!m)return;const s=budgetSavedOf(m,e.profile,e.months);
    const o=by[k]=by[k]||{inc:0,exp:0,inv:0};o.inc+=s.inc;o.exp+=s.exp-(s.inv||0);o.inv+=s.inv||0;}));
  const keys=Object.keys(by).sort().filter(k=>by[k].inc||by[k].exp);
  if(keys.length<1||typeof Chart==='undefined'){card.style.display='none';return;}
  card.style.display='';
  const labels=keys.map(k=>{const q=k.split('-');return (HEB_MONTHS[+q[1]-1]||q[1])+' '+q[0].slice(2);});
  chBudgetAll=new Chart(cv,{type:'bar',
    data:{labels,datasets:[
      {label:'הכנסות',data:keys.map(k=>Math.round(by[k].inc)),backgroundColor:'#11a394',borderRadius:4,borderSkipped:'start',maxBarThickness:26},
      {label:'הוצאות',data:keys.map(k=>Math.round(by[k].exp)),backgroundColor:'#ef4444',borderRadius:4,borderSkipped:'start',maxBarThickness:26}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      datasets:{bar:{categoryPercentage:.7,barPercentage:.9}},
      plugins:{legend:{display:false},tooltip:{rtl:true,callbacks:{
        label:c=>' '+c.dataset.label+': '+fmt(c.raw),
        footer:items=>{const k=keys[items[0].dataIndex],o=by[k],net=o.inc-o.exp;
          return [(net>=0?'חיסכון: ':'גירעון: ')+fmt(Math.abs(net)),...(o.inv?['📈 מתוכו להשקעות: '+fmt(o.inv)]:[])];}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>fmt(v),color:'#94a3b8',font:{size:10}},grid:{color:'rgba(30,45,69,.6)'},border:{display:false}},
        x:{ticks:{color:'#94a3b8',font:{size:11}},grid:{display:false}}}}});
}
