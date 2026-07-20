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
  wants:{color:'var(--amber)',ph:'הוצאת כיף...',totalLbl:'סה"כ כיף'}
};
// Force LTR rendering for money amounts inside RTL text, so "−₪1,120" doesn't
// get bidi-scrambled into "1,120₪−".
function iln(s){return '<span style="direction:ltr;unicode-bidi:isolate;display:inline-block">'+s+'</span>';}
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
  ['income','needs','wants'].forEach(sec=>{
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
  if(!amt||!nm||sec==='income')return null;
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
    html+=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <input type="text" value="${esc(row.name||'')}" placeholder="${meta.ph}" dir="rtl"
        oninput="updateBudgetRow('${sec}',${i},'name',this.value)"
        style="flex:1;min-width:0;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:var(--font);font-size:13px;padding:8px 10px;text-align:right"/>
      <span id="budget-flag-${sec}-${i}" onclick="budgetFlagInfo('${sec}',${i})"
        title="גבוה מהרגיל" style="display:${flagAvg!=null?'inline':'none'};cursor:pointer;font-size:14px;flex-shrink:0">👀</span>
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
// ── Savings trend chart: how much was left over, month by month ──
let chBudget=null;
function renderBudgetTrend(){
  const wrap=document.getElementById('budget-trend-card');
  const canvas=document.getElementById('ch-budget');
  if(!wrap||!canvas)return;
  const keys=Object.keys(D.budgetMonths).sort();
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
      ${barSeg(needsPct,'var(--green)')}${barSeg(wantsPct,'var(--amber)')}${barSeg(savePct,'var(--teal)')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
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
      <div style="text-align:center;background:var(--s2);border-radius:10px;padding:9px 6px">
        <div style="font-size:11px;color:var(--t3)"><span style="color:var(--teal)">●</span> נשאר פנוי</div>
        <div style="font-size:15px;font-weight:800;color:var(--white)">${iln(fmt(Math.max(0,saved)))}</div>
        <div style="font-size:11px;color:var(--t3)">${inc>0?Math.max(0,savePct)+'% מההכנסה':''}</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--t3);text-align:center">
      הכנסות ${iln(fmt(inc))} − הוצאות ${iln(fmt(exp))} = ${savedPositive?'נשארו':'גירעון של'} ${iln(fmt(Math.abs(saved)))}
    </div>
  </div>`;
}
