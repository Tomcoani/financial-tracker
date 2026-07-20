// ══ MONTHLY BUDGET (התנהלות חודשית) ══
// Manual income/expense tracker on the 50/30/20 framework: income, needs
// (צרכים), wants (רצונות) → shows how much was saved this month + savings rate.
function defBudget(){
  return {
    month:'',
    income:[{name:'שכר עבודה',amount:''},{name:'הכנסה נוספת / עסק',amount:''}],
    needs:[
      {name:'שכירות / משכנתא',amount:''},
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
const BUDGET_SECTIONS={
  income:{title:'הכנסות (נטו, אחרי מס)',icon:'💰',color:'var(--teal)',hint:'כל הכסף שנכנס החודש — משכורות, עסק, קצבאות, הכנסות חד-פעמיות.',ph:'מקור הכנסה...'},
  needs:{title:'צרכים — הוצאות חיוניות',icon:'🏠',color:'var(--green)',hint:'הוצאות שאי אפשר בלעדיהן: דיור, חשבונות, אוכל בסיסי, תחבורה, ביטוחים. יעד: עד 50% מההכנסה.',ph:'הוצאה חיונית...'},
  wants:{title:'רצונות — מותרות',icon:'🎉',color:'var(--amber)',hint:'הוצאות שנעים שיהיו אבל אפשר לוותר עליהן: בילויים, קניות, חופשות, מנויים. יעד: עד 30% מההכנסה.',ph:'מותרות...'}
};
function budgetTotal(sec){
  return (D.monthlyBudget&&D.monthlyBudget[sec]||[]).reduce((s,r)=>s+(parseFloat(String(r.amount||0).replace(/,/g,''))||0),0);
}
function renderBudget(){
  if(!D.monthlyBudget)D.monthlyBudget=defBudget();
  // Month field
  const mEl=document.getElementById('budget-month');
  if(mEl)mEl.value=D.monthlyBudget.month||'';
  ['income','needs','wants'].forEach(renderBudgetSection);
  renderBudgetSummary();
  setTimeout(attachAllNumFormats,0);
}
function renderBudgetSection(sec){
  const el=document.getElementById('budget-'+sec);
  if(!el)return;
  const meta=BUDGET_SECTIONS[sec];
  const rows=D.monthlyBudget[sec]||[];
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
    <span style="font-size:12px;color:var(--t3)">סה"כ ${meta.title.split(' ')[0]}</span>
    <span id="budget-total-${sec}" style="font-size:15px;font-weight:800;color:${meta.color}">${fmt(total)}</span>
  </div>`;
  el.innerHTML=html;
}
function updateBudgetRow(sec,i,field,val){
  if(!D.monthlyBudget[sec][i])return;
  D.monthlyBudget[sec][i][field]=val;
  if(field==='amount'){
    const totEl=document.getElementById('budget-total-'+sec);
    if(totEl)totEl.textContent=fmt(budgetTotal(sec));
    renderBudgetSummary();
  }
  touchSection('budget');markDirty();
}
function addBudgetRow(sec){
  D.monthlyBudget[sec].push({name:'',amount:''});
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  const el=document.getElementById('budget-'+sec);
  if(el){const ins=el.querySelectorAll('input[type="text"]');if(ins.length)ins[ins.length-1].focus();}
}
function removeBudgetRow(sec,i){
  D.monthlyBudget[sec].splice(i,1);
  touchSection('budget');markDirty();
  renderBudgetSection(sec);
  renderBudgetSummary();
}
function budgetMonthChange(el){
  if(!D.monthlyBudget)D.monthlyBudget=defBudget();
  D.monthlyBudget.month=el.value;
  touchSection('budget');markDirty();
}
function renderBudgetSummary(){
  const el=document.getElementById('budget-summary');
  if(!el)return;
  const inc=budgetTotal('income'),needs=budgetTotal('needs'),wants=budgetTotal('wants');
  const exp=needs+wants,saved=inc-exp;
  const pct=v=>inc>0?Math.round(v/inc*100):0;
  const needsPct=pct(needs),wantsPct=pct(wants),savePct=pct(saved);
  if(!inc&&!exp){
    el.innerHTML=`<div class="card" style="text-align:center;color:var(--t3);font-size:13px;padding:20px">מלא הכנסות והוצאות למטה כדי לראות כמה חסכת החודש 👇</div>`;
    return;
  }
  const savedPositive=saved>=0;
  // 50/30/20 reference bar (clamped to 100%)
  const barSeg=(w,c)=>w>0?`<div style="width:${Math.min(100,w)}%;background:${c};height:100%"></div>`:'';
  const overNeeds=needsPct>50,overWants=wantsPct>30;
  el.innerHTML=`
  <div class="card" style="background:linear-gradient(135deg,rgba(66,235,214,.09),rgba(66,235,214,.02));border:1.5px solid rgba(66,235,214,.35)">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:12px;color:var(--t3);margin-bottom:2px">${savedPositive?'חסכת החודש':'היית בגירעון החודש'}</div>
      <div style="font-size:30px;font-weight:800;color:${savedPositive?'var(--teal)':'var(--red)'}">${savedPositive?'':'−'}${fmt(Math.abs(saved))}</div>
      <div style="font-size:12px;color:var(--t2);margin-top:2px">שיעור חיסכון: <strong style="color:${savePct>=20?'var(--green)':savePct>=0?'var(--amber)':'var(--red)'}">${savePct}%</strong> מההכנסה ${savePct>=20?'✓ מצוין':savePct>=0?'':''}</div>
    </div>
    <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--s2);margin-bottom:6px">
      ${barSeg(needsPct,'var(--green)')}${barSeg(wantsPct,'var(--amber)')}${barSeg(savePct,'var(--teal)')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--green)">●</span> צרכים</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(needs)}</div>
        <div style="font-size:11px;color:${overNeeds?'var(--red)':'var(--t3)'}">${needsPct}% ${overNeeds?'⚠ מעל 50%':'(יעד 50%)'}</div>
      </div>
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--amber)">●</span> רצונות</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(wants)}</div>
        <div style="font-size:11px;color:${overWants?'var(--red)':'var(--t3)'}">${wantsPct}% ${overWants?'⚠ מעל 30%':'(יעד 30%)'}</div>
      </div>
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--teal)">●</span> חיסכון</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${fmt(Math.max(0,saved))}</div>
        <div style="font-size:11px;color:${savePct>=20?'var(--green)':'var(--t3)'}">${Math.max(0,savePct)}% (יעד 20%)</div>
      </div>
    </div>
    ${(overNeeds||overWants)?`<div style="margin-top:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:10px 12px;font-size:12px;color:#fca5a5;line-height:1.6;text-align:right">
      ${overNeeds?'<div>⚠ ההוצאות החיוניות מעל 50% מההכנסה — כדאי לבדוק אם אפשר להוזיל דיור, חשבונות או ביטוחים.</div>':''}
      ${overWants?'<div>⚠ המותרות מעל 30% מההכנסה — כאן הכי קל לחסוך בלי לפגוע באיכות החיים.</div>':''}
    </div>`:''}
    <div style="margin-top:10px;font-size:11px;color:var(--t3);text-align:center">
      הכנסות ${fmt(inc)} − הוצאות ${fmt(exp)} = ${savedPositive?'חיסכון':'גירעון'} ${fmt(Math.abs(saved))}
    </div>
  </div>`;
}
