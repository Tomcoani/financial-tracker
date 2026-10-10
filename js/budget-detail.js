// ══ MONTHLY BUDGET — statement detail (התנהלות חודשית) ══
// Works on what statement-import.js saved on a month:
//   month.tx       = [{id, d:'YYYY-MM-DD', n:merchant, a:amount, k:'sec|row name', s:source}]
//   month.bank     = {src, opening, closing, inn, out, invest, own, cards:[{d,a,iss,ref}], from, to}
//   month.cardSegs = [{d, a, iss, card}] — each card charge from the uploaded card statements

// ── Transactions behind a row ──
// 📋 on a row lists them by date; each one can be moved to another row or re-priced, and the row
// amounts follow (only the difference moves, so typed-in amounts are kept).
let _budgetOpenRow=null,_budgetEditTx=null;
const _bNum=v=>parseFloat(String(v||0).replace(/,/g,''))||0;
const _BSEC_LBL={income:'הכנסות',needs:'צרכים',wants:'כיף',business:'עסק',bizIncome:'הכנסות העסק'};
function budgetRowTx(sec,name){
  const tx=curBudget().tx;if(!Array.isArray(tx)||!name)return [];
  const k=sec+'|'+String(name).trim();
  return tx.filter(t=>t.k===k);
}
function budgetToggleRowTx(sec,i){
  const row=(curBudget()[sec]||[])[i];if(!row)return;
  const k=sec+'|'+(row.name||'').trim();
  _budgetOpenRow=_budgetOpenRow===k?null:k;_budgetEditTx=null;
  renderBudgetSection(sec);
}
function _bShortDate(d){const p=String(d||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0].slice(2):d;}
function _bRowOptions(sel){
  const b=curBudget();
  return Object.keys(_BSEC_LBL).filter(s=>(b[s]||[]).some(r=>(r.name||'').trim())).map(s=>
    `<optgroup label="${_BSEC_LBL[s]}">`+b[s].filter(r=>(r.name||'').trim()).map(r=>{
      const v=s+'|'+r.name.trim();return `<option value="${esc(v)}"${v===sel?' selected':''}>${esc(r.name.trim())}</option>`;}).join('')+'</optgroup>').join('');
}
function budgetRowTxPanel(sec,name,txs){
  const list=txs.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const sum=list.reduce((s,t)=>s+t.a,0);
  const row=(curBudget()[sec]||[]).find(r=>(r.name||'').trim()===String(name).trim());
  const manual=row?Math.round(_bNum(row.amount)-sum):0;
  const item=t=>{
    if(_budgetEditTx===t.id)return `<div style="background:var(--s1);border:1px solid var(--teal-border);border-radius:9px;padding:8px;margin:4px 0">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">${esc(t.n)} <span style="color:var(--t3);font-weight:400">· ${_bShortDate(t.d)}${t.s?' · '+esc(t.s):''}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <select id="btx-k" style="flex:1;min-width:150px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12px;padding:5px">${_bRowOptions(t.k)}</select>
        <input id="btx-a" type="number" step="0.01" value="${t.a}" data-no-fmt style="width:95px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12.5px;padding:5px;text-align:center">
        <button onclick="budgetTxSave('${t.id}')" class="btnsave" style="padding:5px 12px;font-size:12px">שמור</button>
        <button onclick="budgetTxRemove('${t.id}')" title="הסר את העסקה מהקטגוריה (למשל אם נספרה פעמיים)" style="background:none;border:1px solid rgba(239,68,68,.35);color:#fca5a5;border-radius:7px;padding:5px 8px;font-family:var(--font);font-size:11.5px;cursor:pointer">🗑 הסר</button>
        <button onclick="budgetTxEdit(null)" style="background:none;border:none;color:var(--t3);font-family:var(--font);font-size:12px;cursor:pointer">ביטול</button>
      </div></div>`;
    return `<div onclick="budgetTxEdit('${t.id}')" title="לחצו לשינוי הקטגוריה או הסכום"
      style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);cursor:pointer;font-size:12.5px">
      <span style="color:var(--t3);font-size:11.5px;white-space:nowrap;width:58px">${_bShortDate(t.d)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.n)}${t.edited?' <span style="font-size:10px;color:var(--amber)">· עודכן</span>':''}</span>
      <span style="font-size:10.5px;color:var(--t3);white-space:nowrap">${esc(t.s||'')}</span>
      <b style="white-space:nowrap">${iln(fmt(t.a))}</b><span style="color:var(--t3);font-size:11px">✎</span></div>`;
  };
  return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:6px 10px 8px;margin:-2px 0 10px">
    <div style="font-size:11px;color:var(--t3);padding:2px 0 4px">לפי תאריך העסקה · לחיצה על עסקה מאפשרת להעביר אותה לקטגוריה אחרת או לתקן את הסכום</div>
    ${list.map(item).join('')}
    <div style="display:flex;justify-content:space-between;font-size:12px;padding-top:6px;color:var(--t2)"><span>${list.length} עסקאות</span><b>${iln(fmt(sum))}</b></div>
    ${Math.abs(manual)>=1?`<div style="font-size:11px;color:var(--t3)">${manual>0?'+':'−'} ${iln(fmt(Math.abs(manual)))} הוקלדו ידנית בשורה</div>`:''}
  </div>`;
}
function budgetTxEdit(id){_budgetEditTx=id;const sec=String(_budgetOpenRow||'').split('|')[0];if(sec)renderBudgetSection(sec);}
// Move an amount between rows (the row's other, typed-in part stays as it was)
function _budgetMoveAmt(key,delta){
  const [sec,name]=String(key).split('|');
  const row=(curBudget()[sec]||[]).find(r=>(r.name||'').trim()===name);
  if(row)row.amount=String(Math.max(0,Math.round(_bNum(row.amount)+delta)));
}
function budgetTxSave(id){
  const b=curBudget(),t=(b.tx||[]).find(x=>x.id===id);
  const kEl=document.getElementById('btx-k'),aEl=document.getElementById('btx-a');
  if(!t||!kEl||!aEl)return;
  const k=kEl.value,a=parseFloat(aEl.value);
  if(!k||isNaN(a)){showToast('בחרו קטגוריה וסכום');return;}
  if(k===t.k&&a===t.a){budgetTxEdit(null);return;}
  _budgetMoveAmt(t.k,-t.a);_budgetMoveAmt(k,a);
  const moved=k!==t.k;
  t.k=k;t.a=a;t.edited=true;_budgetEditTx=null;
  touchSection('budget');markDirty();renderBudget();
  showToast(moved?'העסקה הועברה ל"'+k.split('|')[1]+'" ✓ הסכומים עודכנו':'הסכום עודכן ✓');
}
function budgetTxRemove(id){
  const b=curBudget(),t=(b.tx||[]).find(x=>x.id===id);if(!t)return;
  if(!confirm('להסיר את "'+t.n+'" ('+fmt(t.a)+') מהקטגוריה? הסכום יירד מהשורה.'))return;
  _budgetMoveAmt(t.k,-t.a);
  b.tx=b.tx.filter(x=>x.id!==id);_budgetEditTx=null;
  touchSection('budget');markDirty();renderBudget();
  showToast('העסקה הוסרה ✓');
}

// ── Fixed expenses: apply one row's amount to other months ──
// After an amount is typed (or via 🔁), the client picks months; the same-named row in those
// months gets the amount (added if missing). By default only months where it's still empty are
// ticked, so amounts already typed elsewhere aren't overwritten unless chosen.
let _budgetRepeat=null; // {sec, name, mode:'offer'|'pick', sel:Set of month keys}
const _bKeyOf=(sec,row)=>sec+'|'+String(row&&row.name||'').trim();
function budgetRepeatOffer(sec,i){
  const row=(curBudget()[sec]||[])[i];
  if(!row||!_bNum(row.amount)||!(row.name||'').trim())return;
  if(_budgetRepeat&&_budgetRepeat.mode==='pick'&&_budgetRepeat.key===_bKeyOf(sec,row))return;
  _budgetRepeat={key:_bKeyOf(sec,row),sec,mode:'offer'};
  renderBudgetSection(sec);
}
// Months to offer: every existing month + the next 6 from today, except the one shown
function _budgetRepeatMonths(){
  const keys=new Set(Object.keys(D.budgetMonths||{}));
  const now=new Date();
  for(let i=0;i<=6;i++){const d=new Date(now.getFullYear(),now.getMonth()+i,1);keys.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  keys.delete(D.budgetCurMonth);
  return [...keys].sort();
}
function _budgetRowIn(monthKey,sec,name){
  const m=D.budgetMonths[monthKey];if(!m)return null;
  return (m[sec]||[]).find(r=>(r.name||'').trim()===name)||null;
}
function budgetRepeatOpen(sec,i,toggle){
  const row=(curBudget()[sec]||[])[i];if(!row)return;
  const key=_bKeyOf(sec,row),name=(row.name||'').trim();
  if(toggle&&_budgetRepeat&&_budgetRepeat.key===key&&_budgetRepeat.mode==='pick'){_budgetRepeat=null;renderBudgetSection(sec);return;}
  // pre-tick existing months where this row is still empty (future months only if chosen)
  const sel=new Set(_budgetRepeatMonths().filter(k=>{if(!D.budgetMonths[k])return false;const r=_budgetRowIn(k,sec,name);return !r||!_bNum(r.amount);}));
  _budgetRepeat={key,sec,mode:'pick',sel};
  renderBudgetSection(sec);
}
function budgetRepeatClose(){const s=_budgetRepeat&&_budgetRepeat.sec;_budgetRepeat=null;if(s)renderBudgetSection(s);}
function budgetRepeatToggle(k){
  const r=_budgetRepeat;if(!r||!r.sel)return;
  if(r.sel.has(k))r.sel.delete(k);else r.sel.add(k);
  renderBudgetSection(r.sec);
}
function budgetRepeatAll(on){
  const r=_budgetRepeat;if(!r)return;
  r.sel=new Set(on?_budgetRepeatMonths():[]);renderBudgetSection(r.sec);
}
function budgetRepeatPanel(sec,i,row){
  const r=_budgetRepeat;
  if(!r||r.key!==_bKeyOf(sec,row)||!_bNum(row.amount))return '';
  const amt=_bNum(row.amount),name=(row.name||'').trim();
  const wrap=html=>`<div style="background:rgba(66,235,214,.06);border:1px solid var(--teal-border);border-radius:10px;padding:8px 10px;margin:-2px 0 10px;font-size:12.5px">${html}</div>`;
  if(r.mode==='offer')return wrap(`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="flex:1;min-width:0">🔁 הוצאה קבועה? אפשר להחיל <b>${iln(fmt(amt))}</b> של "${esc(name)}" גם על חודשים אחרים</span>
    <button onclick="budgetRepeatOpen('${sec}',${i})" class="btnsave" style="padding:5px 12px;font-size:12px">בחירת חודשים</button>
    <button onclick="budgetRepeatClose()" title="לא עכשיו" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:15px">✕</button></div>`);
  const months=_budgetRepeatMonths();
  const chip=k=>{
    const ex=_budgetRowIn(k,sec,name),v=ex?_bNum(ex.amount):0,on=r.sel.has(k);
    const note=!D.budgetMonths[k]?'חודש חדש':v?(v===amt?'כבר '+fmt(v):fmt(v)):'ריק';
    return `<label style="display:inline-flex;align-items:center;gap:5px;padding:5px 8px;margin:3px;border-radius:8px;cursor:pointer;
      border:1px solid ${on?'var(--teal-border)':'var(--border)'};background:${on?'rgba(66,235,214,.12)':'var(--s2)'}">
      <input type="checkbox" ${on?'checked':''} onchange="budgetRepeatToggle('${k}')" style="margin:0">
      <span>${fmtBudgetMonth(k)}</span><span style="font-size:10.5px;color:${v&&v!==amt?'var(--amber)':'var(--t3)'}">${note}</span></label>`;
  };
  const n=r.sel.size,over=[...r.sel].filter(k=>{const ex=_budgetRowIn(k,sec,name);return ex&&_bNum(ex.amount)&&_bNum(ex.amount)!==amt;}).length;
  return wrap(`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
      <b>🔁 להחיל ${iln(fmt(amt))} של "${esc(name)}" על:</b>
      <button onclick="budgetRepeatClose()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:15px">✕</button></div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:4px">מסומנים מראש החודשים שבהם השורה עדיין ריקה. חודש עם סכום אחר (בכתום) יתעדכן רק אם תסמנו אותו. "חודש חדש" ייפתח עם הסכום הזה, ויכנס לחישובים רק כשיגיע.</div>
    <div>${months.map(chip).join('')}</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button onclick="budgetRepeatApply()" class="btnsave" style="padding:6px 14px;font-size:12.5px"${n?'':' disabled'}>החל על ${n} חודשים${over?` (${over} יידרסו)`:''}</button>
      <button onclick="budgetRepeatAll(true)" style="background:none;border:none;color:var(--teal);font-family:var(--font);font-size:12px;cursor:pointer;text-decoration:underline">סמן הכל</button>
      <button onclick="budgetRepeatAll(false)" style="background:none;border:none;color:var(--t3);font-family:var(--font);font-size:12px;cursor:pointer;text-decoration:underline">נקה</button>
    </div>`);
}
function budgetRepeatApply(){
  const r=_budgetRepeat;if(!r||!r.sel||!r.sel.size)return;
  const [sec,name]=r.key.split('|');
  const src=(curBudget()[sec]||[]).find(x=>(x.name||'').trim()===name);if(!src)return;
  const amt=String(_bNum(src.amount));
  const keys=[...r.sel].sort();
  keys.forEach(k=>{
    if(!D.budgetMonths[k])D.budgetMonths[k]=newBudgetMonthTemplate(); // inherits the category names
    const m=D.budgetMonths[k];
    if(!Array.isArray(m[sec]))m[sec]=[];
    let row=m[sec].find(x=>(x.name||'').trim()===name);
    if(!row){row={name,amount:''};m[sec].push(row);}
    row.amount=amt;
  });
  _budgetRepeat=null;
  touchSection('budget');markDirty();renderBudget();
  showToast(`"${name}" עודכן ל־${fmt(_bNum(amt))} ב־${keys.length} חודשים ✓`);
}

// ── Duplicates already in a month (e.g. overlapping files uploaded before duplicate checks) ──
// Same date + amount + direction + bank/card, coming from different uploads (the upload is the
// last part of the transaction id). Each upload's own identical items are legit (two coffees);
// the extras beyond the largest single upload are duplicates.
function _bDupKey(x){const sec=String(x.k||'').split('|')[0];
  return x.d+'|'+Math.round(Math.abs(x.a)*100)/100+'|'+(sec==='income'||sec==='bizIncome'?'in':'out')+'|'+(/^עו"ש/.test(x.s||'')?'bank':'card');}
function budgetFindDups(m){
  const groups={};
  (m.tx||[]).forEach(x=>{(groups[_bDupKey(x)]=groups[_bDupKey(x)]||[]).push(x);});
  const extra=[];
  Object.values(groups).forEach(list=>{
    const byBatch={};list.forEach(x=>{const b=String(x.id).split(':').pop();(byBatch[b]=byBatch[b]||[]).push(x);});
    const batches=Object.keys(byBatch);if(batches.length<2)return;
    // keep the batch with the most items (earliest on a tie); everything else is extra
    batches.sort((a,b)=>byBatch[b].length-byBatch[a].length||parseInt(a,36)-parseInt(b,36));
    batches.slice(1).forEach(b=>extra.push(...byBatch[b]));
  });
  return extra;
}
// Rows whose amount is below the transactions listed in them (📋) — a row can't hold less than
// its own listed items, so this means an amount was taken out by mistake
function budgetShortRows(m){
  const out=[];
  Object.keys(_BSEC_LBL).forEach(sec=>(m[sec]||[]).forEach(r=>{
    const name=(r.name||'').trim();if(!name)return;
    const listed=(m.tx||[]).filter(x=>x.k===sec+'|'+name).reduce((s,x)=>s+x.a,0);
    if(listed>0&&_bNum(r.amount)<listed-1)out.push({sec,row:r,name,listed:Math.round(listed),now:_bNum(r.amount)});
  }));
  return out;
}
function budgetRestoreFromTx(){
  const m=curBudget(),s=budgetShortRows(m);if(!s.length)return;
  s.forEach(x=>{x.row.amount=String(x.listed);});
  touchSection('budget');markDirty();renderBudget();
  showToast('הסכומים הוחזרו לפי העסקאות ב־'+s.length+' שורות ✓');
}
function renderBudgetDups(){
  const el=document.getElementById('budget-dup-notice');if(!el)return;
  const m=curBudget(),d=budgetFindDups(m),short=budgetShortRows(m);
  const shortHtml=short.length?`<div class="card" style="border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.06)">
    <div style="font-size:13.5px;font-weight:800;color:#fca5a5;margin-bottom:4px">⚠️ ${short.length} שורות נמוכות מסכום העסקאות שבתוכן</div>
    <div style="font-size:12.5px;color:var(--t2);line-height:1.7;margin-bottom:6px">${short.map(x=>`"${esc(x.name)}": רשום ${iln(fmt(x.now))}, אבל העסקאות בתוכה מסתכמות ב־${iln(fmt(x.listed))}`).join('<br>')}</div>
    <button onclick="budgetRestoreFromTx()" class="btnsave" style="padding:7px 16px;font-size:12.5px">החזר את הסכומים לפי העסקאות ✓</button>
  </div>`:'';
  if(!d.length){el.innerHTML=shortHtml;return;}
  const out=d.filter(x=>!/^(income|bizIncome)\|/.test(x.k)).reduce((s,x)=>s+x.a,0),inn=d.reduce((s,x)=>s+x.a,0)-out;
  el.innerHTML=`<div class="card" style="border-color:rgba(245,158,11,.45);background:rgba(245,158,11,.06)">
    <div style="font-size:13.5px;font-weight:800;color:var(--amber);margin-bottom:4px">🔁 נמצאו ${d.length} פעולות שנרשמו פעמיים החודש</div>
    <div style="font-size:12.5px;color:var(--t2);line-height:1.7;margin-bottom:6px">אותה פעולה (תאריך, סכום ומקור זהים) נכנסה משני קבצים שונים —
      ${out?'הוצאות כפולות '+iln(fmt(out)):''}${out&&inn?' · ':''}${inn?'הכנסות כפולות '+iln(fmt(inn)):''}.</div>
    <div style="font-size:12px;color:var(--t3);margin-bottom:8px">${d.slice(0,6).map(x=>esc(_bShortDate(x.d))+' · '+esc(x.n)+' · '+fmt(x.a)).join('<br>')}${d.length>6?'<br>ועוד '+(d.length-6)+'...':''}</div>
    <button onclick="budgetRemoveDups()" class="btnsave" style="padding:7px 16px;font-size:12.5px">הסר את הכפילויות ✓</button>
  </div>`+shortHtml;
}
function budgetRemoveDups(){
  const m=curBudget(),d=budgetFindDups(m);if(!d.length)return;
  const ids=new Set(d.map(x=>x.id));
  m.tx=m.tx.filter(x=>!ids.has(x.id));
  // Take the duplicates' amount out of each row — but never below what the row's remaining
  // transactions add up to (a duplicate listing doesn't always mean the amount was doubled)
  const per={};d.forEach(x=>{per[x.k]=(per[x.k]||0)+x.a;});
  Object.entries(per).forEach(([k,dupSum])=>{
    const [sec,name]=k.split('|');
    const row=(m[sec]||[]).find(r=>(r.name||'').trim()===name);if(!row)return;
    const listed=m.tx.filter(x=>x.k===k).reduce((s,x)=>s+x.a,0);
    row.amount=String(Math.max(0,Math.round(Math.max(_bNum(row.amount)-dupSum,listed))));
  });
  touchSection('budget');markDirty();renderBudget();
  showToast('הוסרו '+d.length+' כפילויות ✓ הסכומים עודכנו');
}

// ── Where does the gap between the budget and the account come from? ──
// gap = (closing − opening) − (income − expenses − investments − own transfers). Everything the
// bank file counted appears on both sides and cancels out, so what's left is exactly:
//   + expenses typed by hand (not from this account: cash, another account…)
//   + card-statement expenses recorded this month − card bills the bank actually paid
//   + money in that was marked "לא לספור"   − money out that was marked "לא לספור"
//   − income typed by hand
// Anything still unexplained is shown as such.
function budgetGapHtml(m,bk,diff,open){
  const isBank=x=>/^עו"ש/.test(x.s||''),isInc=k=>/^(income|bizIncome)\|/.test(k||'');
  const listed=(sec,n)=>(m.tx||[]).filter(x=>x.k===sec+'|'+n).reduce((s,x)=>s+x.a,0);
  const hand=secs=>{const out=[];secs.forEach(sec=>(m[sec]||[]).forEach(r=>{const n=(r.name||'').trim();if(!n)return;
    const v=_bNum(r.amount)-listed(sec,n);if(Math.abs(v)>=1)out.push({n,a:v});}));return out;};
  const manExp=hand(['needs','wants','business']),manInc=hand(['income','bizIncome']);
  const cardTx=(m.tx||[]).filter(x=>!isBank(x)&&!isInc(x.k)).reduce((s,x)=>s+x.a,0);
  const cardBills=(bk.cards||[]).reduce((s,c)=>s+c.a,0);
  const sk=Array.isArray(bk.skipped)?bk.skipped:null;
  const skIn=sk?sk.filter(x=>x.dir==='in'):[],skOut=sk?sk.filter(x=>x.dir==='out'):[];
  const tot=l=>l.reduce((s,x)=>s+x.a,0);
  const comps=[
    {lbl:'הוצאות שהוקלדו ידנית — לא עברו בעו"ש הזה (מזומן, חשבון אחר, 🔁 הוצאה קבועה...)',v:tot(manExp),items:manExp},
    {lbl:'פירוטי אשראי שנרשמו בחודש הזה, לעומת חיובי האשראי שירדו בפועל מהעו"ש',v:cardTx-cardBills,
      note:`בפירוטים ${iln(fmt(cardTx))} · ירד מהעו"ש ${iln(fmt(cardBills))}`},
    {lbl:'כסף שנכנס לעו"ש וסומן "לא לספור"',v:tot(skIn),items:skIn.map(x=>({n:_bShortDate(x.d)+' · '+x.n,a:x.a}))},
    {lbl:'כסף שיצא מהעו"ש וסומן "לא לספור"',v:-tot(skOut),items:skOut.map(x=>({n:_bShortDate(x.d)+' · '+x.n,a:x.a}))},
    {lbl:'הכנסות שהוקלדו ידנית — לא עברו בעו"ש הזה',v:-tot(manInc),items:manInc}
  ].filter(c=>Math.abs(c.v)>=1);
  const rest=diff-comps.reduce((s,c)=>s+c.v,0);
  const sgn=v=>iln((v>=0?'+':'−')+fmt(Math.abs(v)));
  const line=c=>`<div style="padding:6px 0;border-bottom:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span style="color:var(--t1)">${c.lbl}</span><b style="white-space:nowrap;color:${(c.v>0)===(diff>0)?'var(--amber)':'var(--t2)'}">${sgn(c.v)}</b></div>
    ${c.note?`<div style="font-size:11px;color:var(--t3)">${c.note}</div>`:''}
    ${c.items&&c.items.length?`<div style="font-size:11px;color:var(--t3);margin-top:2px">${c.items.slice(0,6).map(x=>esc(x.n)+' '+fmt(x.a)).join(' · ')}${c.items.length>6?' · ועוד '+(c.items.length-6):''}</div>`:''}
  </div>`;
  return `<details${open?' open':''} style="margin-top:10px;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px">
    <summary style="cursor:pointer;font-size:12.5px;font-weight:800;color:var(--teal)">🔍 מאיפה הפער של ${iln(fmt(Math.abs(diff)))}?</summary>
    <div style="font-size:11px;color:var(--t3);margin:4px 0 2px">מה שהגיע מקובץ העו"ש רשום גם בתקציב וגם בחשבון, ולכן מתקזז. הפער נוצר רק מהדברים האלה (בכתום: מה שדוחף לכיוון הפער):</div>
    ${comps.map(line).join('')}
    ${Math.abs(rest)>=1?`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:6px 0"><span>לא מוסבר${sk?'':' (כולל פעולות בעו"ש שסומנו "לא לספור")'}</span><b>${sgn(rest)}</b></div>`:''}
    ${!sk?`<div style="font-size:11px;color:var(--t2);margin-top:4px">💡 כדי לראות גם אילו פעולות בעו"ש לא נספרו — העלה שוב את קובץ העו"ש. שום דבר לא ייספר פעמיים, רק נתוני החשבון יתעדכנו.</div>`:''}
  </details>`;
}

// ── "It's fine" on a gap alert, with a note (e.g. "rent is paid from another account") ──
// month.bank.ack = {note, diff, at}. Kept while the gap is the same amount it was approved for;
// if the gap changes (a new expense, a new upload) the alert comes back and says so.
let _bankAckEdit=false;
function budgetGapAckHtml(bk,diff,warn,box){
  const ack=bk.ack,same=ack&&Math.abs(ack.diff-diff)<1;
  const editor=`<div style="margin-top:8px">
      <textarea id="bank-ack-note" rows="2" dir="rtl" placeholder="למה זה בסדר? למשל: שכר הדירה יורד מחשבון אחר"
        style="width:100%;background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:7px 9px;color:var(--white);font-family:var(--font);font-size:12.5px;resize:vertical">${esc(ack&&ack.note||'')}</textarea>
      <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
        <button onclick="budgetGapAckSave(${diff})" class="btnsave" style="padding:6px 14px;font-size:12px">✓ הכל בסדר — שמור</button>
        <button onclick="_bankAckEdit=false;renderBudgetBank()" style="background:none;border:none;color:var(--t3);font-family:var(--font);font-size:12px;cursor:pointer">ביטול</button>
      </div></div>`;
  if(same&&!_bankAckEdit)return box('rgba(16,185,129,.08)','rgba(16,185,129,.35)',
    `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <span><span style="color:var(--green);font-weight:800">✓ סומן כתקין</span> <span style="color:var(--t3);font-size:11.5px">(פער של ${iln(fmt(Math.abs(diff)))})</span>
        ${ack.note?`<div style="color:var(--t2);font-size:12px;margin-top:2px">📝 ${esc(ack.note)}</div>`:''}</span>
      <span style="white-space:nowrap"><button onclick="_bankAckEdit=true;renderBudgetBank()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">✎ הערה</button>
        <button onclick="budgetGapAckClear()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px">בטל</button></span>
    </div>${_bankAckEdit?editor:''}`);
  const changed=ack&&!same?`<div style="font-size:11.5px;color:var(--t3);margin-top:4px">סומן קודם כתקין בפער של ${iln(fmt(Math.abs(ack.diff)))}${ack.note?' ("'+esc(ack.note)+'")':''} — מאז הפער השתנה.</div>`:'';
  return warn.replace(/<\/div>$/,'')+changed
    +(_bankAckEdit?editor:`<div><button onclick="_bankAckEdit=true;renderBudgetBank()" style="margin-top:6px;background:var(--s2);border:1px solid var(--border);color:var(--t2);border-radius:8px;padding:4px 10px;font-family:var(--font);font-size:12px;cursor:pointer">✓ הכל בסדר — סמן והוסף הערה</button></div>`)+'</div>';
}
function budgetGapAckSave(diff){
  const bk=curBudget().bank;if(!bk)return;
  const el=document.getElementById('bank-ack-note');
  bk.ack={note:(el?el.value:'').trim(),diff:Math.round(diff*100)/100,at:new Date().toISOString()};
  _bankAckEdit=false;touchSection('budget');markDirty();renderBudgetBank();
  showToast('סומן כתקין ✓');
}
function budgetGapAckClear(){
  const bk=curBudget().bank;if(!bk)return;
  delete bk.ack;_bankAckEdit=false;touchSection('budget');markDirty();renderBudgetBank();
}

// ── Bank account check ──
// 1. Opening / closing balance of the month.
// 2. Reconciliation: the real change in the account vs. what the budget says
//    (income − expenses − money moved to investments / own accounts). A gap means missing or
//    double-counted expenses (or missing income).
// 3. Card bills the bank paid vs. the card statements uploaded.
function renderBudgetBank(){
  renderBudgetDups();
  const el=document.getElementById('budget-bank-card');if(!el)return;
  const m=curBudget(),bk=m.bank;
  if(!bk){el.style.display='none';el.innerHTML='';return;}
  el.style.display='';
  const sum=rows=>(rows||[]).reduce((s,r)=>s+_bNum(r.amount),0);
  const inc=sum(m.income)+sum(m.bizIncome),exp=sum(m.needs)+sum(m.wants)+sum(m.business);
  const hasBal=bk.opening!=null&&bk.closing!=null;
  const actual=hasBal?bk.closing-bk.opening:0;
  const expected=inc-exp-(bk.invest||0)-(bk.own||0);
  const diff=actual-expected,thr=Math.max(200,(bk.out||0)*0.02);
  // Card bills ↔ uploaded card statements (same amount ±₪1, same issuer when both are known)
  const segs=(m.cardSegs||[]).map(s=>Object.assign({},s,{used:false}));
  const cards=(bk.cards||[]).map(c=>{
    const s=segs.find(x=>!x.used&&Math.abs(x.a-c.a)<=1&&(!x.iss||!c.iss||x.iss===c.iss));
    if(s)s.used=true;return Object.assign({},c,{ok:!!s});
  });
  const missing=cards.filter(c=>!c.ok),missSum=missing.reduce((s,c)=>s+c.a,0);
  const extra=segs.filter(s=>!s.used&&s.d&&bk.from&&s.d>=bk.from&&s.d<=bk.to);
  const signed=v=>iln((v>=0?'+':'−')+fmt(Math.abs(v)));
  const box=(bg,bd,html)=>`<div style="background:${bg};border:1px solid ${bd};border-radius:10px;padding:8px 10px;font-size:12.5px;line-height:1.6">${html}</div>`;
  let verdict='';
  if(hasBal){
    if(Math.abs(diff)<=thr)verdict=box('rgba(16,185,129,.08)','rgba(16,185,129,.35)',`<span style="color:var(--green)">✓ התקציב מתיישב עם העו"ש${Math.abs(diff)>=1?' (הפרש של '+iln(fmt(Math.abs(diff)))+')':''}</span>`);
    else if(diff<0)verdict=box('rgba(239,68,68,.08)','rgba(239,68,68,.35)',
      `⚠️ <b>ירדו מהחשבון ${iln(fmt(-diff))} יותר ממה שרשום בתקציב</b> — כנראה <b>חסרות הוצאות</b>${missing.length?` (למשל ${missing.length} חיובי כרטיס בלי פירוט, ${iln(fmt(missSum))})`:''}.`);
    else verdict=box('rgba(245,158,11,.08)','rgba(245,158,11,.35)',
      `⚠️ <b>נשארו בחשבון ${iln(fmt(diff))} יותר ממה שהתקציב מראה</b> — אולי <b>הוצאה נרשמה פעמיים</b>, או שחסרה הכנסה.`);
    if(Math.abs(diff)>thr)verdict=budgetGapAckHtml(bk,diff,verdict,box);
  }
  const cardList=!cards.length?'':`<div style="font-size:12.5px;font-weight:800;margin:12px 0 4px">💳 חיובי אשראי שירדו מהחשבון</div>`
    +cards.map(c=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
      <span>${c.ok?'✅':'⚠️'} ${esc(c.iss||'כרטיס')}${c.ref?' · '+esc(c.ref):''} <span style="color:var(--t3)">· ${_bShortDate(c.d)}</span></span>
      <span style="white-space:nowrap">${iln(fmt(c.a))} <span style="font-size:11px;color:${c.ok?'var(--green)':'var(--amber)'}">${c.ok?'תואם לפירוט':'אין פירוט'}</span></span></div>`).join('')
    +(missing.length?`<div style="font-size:11.5px;color:var(--amber);margin-top:4px">כדאי להעלות את פירוט הכרטיס של החיובים המסומנים ב־⚠️ — עד אז ההוצאות שבהם לא בתקציב.</div>`:'')
    // a statement uploaded before the matching existed has no charge data — re-uploading fixes it
    +(missing.length&&(m.imports||[]).some(x=>!x.v)?`<div style="font-size:11.5px;color:var(--t2);margin-top:4px">💡 כבר העלית את הפירוט? אם הוא הועלה לפני שנוספה ההתאמה לעו"ש — העלה אותו שוב. הסכומים לא ייספרו פעמיים, רק החיבור יושלם.</div>`:'')
    +(extra.length?`<div style="font-size:11.5px;color:var(--t3);margin-top:4px">${extra.length} חיובי כרטיס מהפירוט לא נמצאו בעו"ש (${extra.map(s=>esc(s.iss||'כרטיס')+' '+fmt(s.a)).join(', ')}) — אולי יורדים מחשבון אחר.</div>`:'');
  const inv=bk.invest||0;
  const tile=(lbl,val,color)=>`<div style="flex:1;min-width:110px;background:var(--s2);border-radius:10px;padding:8px;text-align:center"><div style="font-size:11px;color:var(--t3)">${lbl}</div><div style="font-size:16px;font-weight:800${color?';color:'+color:''}">${val}</div></div>`;
  el.innerHTML=`
    <div class="ch-title">🏦 חשבון עו"ש${bk.src?' · '+esc(bk.src):''}</div>
    ${hasBal?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${tile('יתרה בתחילת החודש',iln(fmt(bk.opening)))}${tile('יתרה בסוף החודש',iln(fmt(bk.closing)))}${tile('שינוי',signed(actual),actual>=0?'var(--teal)':'var(--red)')}
    </div>`:''}
    ${verdict}
    ${cardList}
    ${inv?`<div style="font-size:12.5px;margin-top:12px">📈 ${inv>0?'הועברו להשקעות בשוק ההון':'נמשכו מהשקעות בשוק ההון'}: <b>${iln(fmt(Math.abs(inv)))}</b> <span style="font-size:11px;color:var(--t3)">— לא נספר כהוצאה או כהכנסה</span></div>`:''}
    ${bk.own?`<div style="font-size:12.5px;margin-top:4px">🔁 העברות בין החשבונות שלך: <b>${signed(-bk.own)}</b> <span style="font-size:11px;color:var(--t3)">— לא נספר</span></div>`:''}
    ${hasBal&&Math.abs(diff)>=1?budgetGapHtml(m,bk,diff,Math.abs(diff)>thr&&!(bk.ack&&Math.abs(bk.ack.diff-diff)<1)):''}
    ${hasBal?`<details style="margin-top:10px;font-size:11.5px;color:var(--t3)"><summary style="cursor:pointer">איך מחושבת הבדיקה?</summary>
      <div style="line-height:1.8;margin-top:4px">לפי התקציב: הכנסות ${iln(fmt(inc))} − הוצאות ${iln(fmt(exp))}${inv?' − השקעות '+signed(inv):''}${bk.own?' − העברות לחשבונות שלך '+signed(bk.own):''} = ${signed(expected)}<br>
      בפועל בעו"ש: ${signed(actual)} · הפרש: ${signed(diff)}<br>
      הבדיקה מניחה שכל ההכנסות וההוצאות עוברות בחשבון הזה. הוצאות במזומן או מחשבון אחר ייראו כאן כהפרש.</div></details>`:''}`;
}
