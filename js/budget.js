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
    const keys=Object.keys(D.budgetMonths).sort();
    D.budgetCurMonth=keys.length?keys[keys.length-1]:currentMonthKey();
    if(!D.budgetMonths[D.budgetCurMonth])D.budgetMonths[D.budgetCurMonth]=defBudgetMonth();
  }
}
function curBudget(){migrateBudget();return D.budgetMonths[D.budgetCurMonth];}
const BUDGET_SECTIONS={
  income:{color:'var(--teal)',ph:'מקור הכנסה...',totalLbl:'סה"כ הכנסות'},
  needs:{color:'var(--green)',ph:'הוצאה חיונית...',totalLbl:'סה"כ צרכים'},
  wants:{color:'var(--amber)',ph:'הוצאה על מותרות...',totalLbl:'סה"כ רצונות'}
};
function budgetTotal(sec){
  return (curBudget()[sec]||[]).reduce((s,r)=>s+(parseFloat(String(r.amount||0).replace(/,/g,''))||0),0);
}
function budgetSavedOf(month){
  const sum=rows=>(rows||[]).reduce((s,r)=>s+(parseFloat(String(r.amount||0).replace(/,/g,''))||0),0);
  return {inc:sum(month.income),exp:sum(month.needs)+sum(month.wants)};
}
function renderBudget(){
  migrateBudget();
  renderBudgetMonthSelect();
  ['income','needs','wants'].forEach(renderBudgetSection);
  renderBudgetSummary();
  setTimeout(attachAllNumFormats,0);
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
    // Reveal the month picker, defaulted to the current calendar month
    const inp=document.getElementById('budget-new-month');
    if(inp){inp.style.display='inline-block';inp.value=currentMonthKey();inp.focus();}
    el.value=D.budgetCurMonth; // keep the select on the current month meanwhile
    return;
  }
  D.budgetCurMonth=el.value;
  markDirty();
  renderBudget();
}
function budgetAddMonth(key){
  const inp=document.getElementById('budget-new-month');
  if(inp)inp.style.display='none';
  if(!/^\d{4}-\d{2}$/.test(key||''))return;
  if(!D.budgetMonths[key])D.budgetMonths[key]=newBudgetMonthTemplate();
  D.budgetCurMonth=key;
  touchSection('budget');markDirty();
  renderBudget();
  showToast('נוסף חודש '+fmtBudgetMonth(key)+' ✓');
}
function renderBudgetSection(sec){
  const el=document.getElementById('budget-'+sec);
  if(!el)return;
  const meta=BUDGET_SECTIONS[sec];
  const rows=curBudget()[sec]||[];
  let html='';
  rows.forEach((row,i)=>{
    html+=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <input type="text" value="${esc(row.name||'')}" placeholder="${meta.ph}" dir="rtl"
        oninput="updateBudgetRow('${sec}',${i},'name',this.value)"
        style="flex:1;min-width:0;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:var(--font);font-size:13px;padding:8px 10px;text-align:right"/>
      <input type="number" value="${row.amount||''}" placeholder="0" data-no-fmt
        oninput="updateBudgetRow('${sec}',${i},'amount',this.value)"
        style="width:110px;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:${meta.color};font-family:var(--font);font-size:14px;font-weight:700;padding:8px 10px;text-align:center"/>
      <button onclick="removeBudgetRow('${sec}',${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0">×</button>
    </div>`;
  });
  const total=budgetTotal(sec);
  html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 2px;margin-top:2px;border-top:1px solid var(--border)">
    <span style="font-size:12px;color:var(--t3)">${meta.totalLbl}</span>
    <span id="budget-total-${sec}" style="font-size:15px;font-weight:800;color:${meta.color}">${fmt(total)}</span>
  </div>`;
  el.innerHTML=html;
}
function updateBudgetRow(sec,i,field,val){
  const b=curBudget();
  if(!b[sec][i])return;
  b[sec][i][field]=val;
  if(field==='amount'){
    const totEl=document.getElementById('budget-total-'+sec);
    if(totEl)totEl.textContent=fmt(budgetTotal(sec));
    renderBudgetSummary();
  }
  touchSection('budget');markDirty();
}
function addBudgetRow(sec){
  curBudget()[sec].push({name:'',amount:''});
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  const el=document.getElementById('budget-'+sec);
  if(el){const ins=el.querySelectorAll('input[type="text"]');if(ins.length)ins[ins.length-1].focus();}
}
function removeBudgetRow(sec,i){
  curBudget()[sec].splice(i,1);
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  renderBudgetSummary();
}
function renderBudgetSummary(){
  const el=document.getElementById('budget-summary');
  if(!el)return;
  const inc=budgetTotal('income'),needs=budgetTotal('needs'),wants=budgetTotal('wants');
  const exp=needs+wants,saved=inc-exp;
  const pct=v=>inc>0?Math.round(v/inc*100):0;
  const needsPct=pct(needs),wantsPct=pct(wants),savePct=pct(saved);
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
          ${d>0?'↑':'↓'} ${d>0?'+':'−'}${fmt(Math.abs(d))} לעומת ${fmtBudgetMonth(keys[idx-1])} (${prevSaved>=0?'חיסכון':'גירעון'} של ${fmt(Math.abs(prevSaved))})</div>`;
      }
    }
  }
  const barSeg=(w,c)=>w>0?`<div style="width:${Math.min(100,w)}%;background:${c};height:100%"></div>`:'';
  el.innerHTML=`
  <div class="card" style="background:linear-gradient(135deg,rgba(66,235,214,.09),rgba(66,235,214,.02));border:1.5px solid rgba(66,235,214,.35)">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:12px;color:var(--t3);margin-bottom:2px">${savedPositive?'נשאר לכם החודש':'הייתם בגירעון החודש'}</div>
      <div style="font-size:30px;font-weight:800;color:${savedPositive?'var(--teal)':'var(--red)'}">${savedPositive?'':'−'}${fmt(Math.abs(saved))}</div>
      ${inc>0&&savedPositive?`<div style="font-size:12px;color:var(--t2);margin-top:2px">${savePct}% מההכנסה נשארו פנויים לחיסכון ולהשקעה</div>`:''}
      ${cmpHtml}
    </div>
    <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--s2);margin-bottom:6px">
      ${barSeg(needsPct,'var(--green)')}${barSeg(wantsPct,'var(--amber)')}${barSeg(savePct,'var(--teal)')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--green)">●</span> צרכים</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(needs)}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?needsPct+'% מההכנסה':''}</div>
      </div>
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--amber)">●</span> רצונות</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(wants)}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?wantsPct+'% מההכנסה':''}</div>
      </div>
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--teal)">●</span> נשאר פנוי</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(Math.max(0,saved))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?Math.max(0,savePct)+'% מההכנסה':''}</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--t3);text-align:center">
      הכנסות ${fmt(inc)} − הוצאות ${fmt(exp)} = ${savedPositive?'נשארו':'גירעון של'} ${fmt(Math.abs(saved))}
    </div>
  </div>`;
}
