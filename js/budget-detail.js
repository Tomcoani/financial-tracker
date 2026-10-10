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
const _BSEC_LBL={income:'הכנסות',needs:'צרכים',wants:'כיף',invest:'העברה להשקעות',business:'עסק',bizInvest:'עסק — העברה להשקעות',bizIncome:'הכנסות העסק'};
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
  const biz=!!((D.budgetProfile||{}).selfEmployed);
  // + a new row right from here (e.g. "בעלי חיים" that this month doesn't have yet)
  const add=[['needs','➕ קטגוריה חדשה בצרכים...'],['wants','➕ קטגוריה חדשה בכיף...']]
    .concat([['invest','➕ שורה חדשה בהעברה להשקעות...']]).concat(biz?[['business','➕ קטגוריה חדשה בעסק...']]:[]).concat([['income','➕ שורת הכנסה חדשה...']]);
  return Object.keys(_BSEC_LBL).filter(s=>(b[s]||[]).some(r=>(r.name||'').trim())).map(s=>
    `<optgroup label="${_BSEC_LBL[s]}">`+b[s].filter(r=>(r.name||'').trim()).map(r=>{
      const v=s+'|'+r.name.trim();return `<option value="${esc(v)}"${v===sel?' selected':''}>${esc(r.name.trim())}</option>`;}).join('')+'</optgroup>').join('')
    +`<optgroup label="חדש">${add.map(([s,l])=>`<option value="__new|${s}">${l}</option>`).join('')}</optgroup>`
    // money that only moved (back from investments / between the client's own accounts) — neither
    // income nor an expense: kept in "לא נספר" under its own heading. Money moved TO investments
    // has its own section (invest)
    +`<optgroup label="לא הכנסה ולא הוצאה">`
    +[['skip|invest','📈 כסף שחזר מהשקעות (משיכה — לא הכנסה)'],['skip|own','🔁 העברה בין החשבונות שלי'],['skip|other','🚫 לא לספור בתקציב']]
      .map(([v,l])=>`<option value="${v}"${v===sel||(v==='skip|other'&&String(sel).startsWith('skip|')&&!/^skip\|(invest|own)$/.test(sel))?' selected':''}>${l}</option>`).join('')
    +`</optgroup>`;
}
// ── "לא נספר בתקציב": everything that came from a file but isn't in the budget ──
// (month.tx with k "skip|<why>": card bills, investments, own transfers, marked "לא לספור" on
// import or moved here) — plus transactions switched off with ⊘. Click one to put it into a
// category if it was classified wrong.
const _SKIP_LBL={other:'🚫 סומן "לא לספור"',card:'💳 תשלומי כרטיס אשראי מהעו"ש (הפירוט מגיע מקובץ הכרטיס)',invest:'📈 השקעות בשוק ההון',own:'🔁 העברות בין החשבונות שלך'};
let _skipOpen=false;
function renderBudgetSkipped(){
  const el=document.getElementById('budget-skip-card');if(!el)return;
  const m=curBudget(),tx=m.tx||[];
  // card bills paid from the bank aren't listed here: their expenses are in the categories (from
  // the card statement), and the bills themselves are shown in the bank check ("💳 חיובי אשראי")
  const skipped=tx.filter(x=>String(x.k).startsWith('skip|')&&!(x.k==='skip|card'&&m.bank)),offs=tx.filter(x=>x.off);
  if(!skipped.length&&!offs.length){el.style.display='none';el.innerHTML='';return;}
  el.style.display='';
  const sgn=x=>(x.dir==='in'?'+':'')+fmt(x.a);
  const item=x=>{
    if(_budgetEditTx===x.id)return `<div style="background:var(--s1);border:1px solid var(--teal-border);border-radius:9px;padding:8px;margin:4px 0">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">${esc(x.n)} <span style="color:var(--t3);font-weight:400">· ${_bShortDate(x.d)}${x.s?' · '+esc(x.s):''}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <select id="btx-k" data-prev="${esc(x.k)}" onchange="budgetTxNewRow(this)" style="flex:1;min-width:150px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12px;padding:5px">${_bRowOptions(x.k)}</select>
        <input id="btx-a" type="number" step="0.01" value="${x.a}" data-no-fmt style="width:95px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12.5px;padding:5px;text-align:center">
        <button onclick="budgetTxSave('${x.id}')" class="btnsave" style="padding:5px 12px;font-size:12px">שמור</button>
        <button onclick="_budgetEditTx=null;renderBudgetSkipped()" style="background:none;border:none;color:var(--t3);font-family:var(--font);font-size:12px;cursor:pointer">ביטול</button>
      </div></div>`;
    return `<div onclick="_budgetEditTx='${x.id}';renderBudgetSkipped()" title="לחצו כדי להכניס לקטגוריה"
      style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);cursor:pointer;font-size:12.5px">
      <span style="color:var(--t3);font-size:11.5px;white-space:nowrap;width:58px">${_bShortDate(x.d)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.n)}</span>
      <span style="font-size:10.5px;color:var(--t3);white-space:nowrap">${esc(x.s||'')}</span>
      <b style="white-space:nowrap;color:${x.dir==='in'?'var(--teal)':'var(--white)'}">${iln(sgn(x))}</b><span style="color:var(--t3);font-size:11px">✎</span></div>`;
  };
  const groups=['other','card','invest','own'].map(w=>{
    const list=skipped.filter(x=>x.k==='skip|'+w).sort((a,b)=>a.d<b.d?-1:1);if(!list.length)return '';
    const toRow=w==='invest'&&list.some(x=>x.dir!=='in')?`<button onclick="budgetSkipInvestToRow()" style="margin:2px 0 4px;background:none;border:1px solid rgba(96,165,250,.45);border-radius:7px;color:#60a5fa;font-family:var(--font);font-size:11.5px;padding:3px 9px;cursor:pointer">📈 להעביר את ההעברות להשקעות לקטגוריה "העברה להשקעות"</button>`:'';
    return `<div style="font-size:12px;font-weight:700;color:var(--t2);margin:10px 0 2px">${_SKIP_LBL[w]} (${list.length})</div>${toRow}${list.map(item).join('')}`;
  }).join('');
  const offHtml=offs.length?`<div style="font-size:12px;font-weight:700;color:var(--t2);margin:10px 0 2px">⊘ עסקאות שהוצאת מהחישוב (${offs.length})</div>`
    +offs.map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);font-size:12.5px">
      <span style="color:var(--t3);font-size:11.5px;width:58px">${_bShortDate(x.d)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.n)} <span style="font-size:10.5px;color:var(--t3)">· ב"${esc(String(x.k).split('|')[1])}"</span></span>
      <b>${iln(fmt(x.a))}</b><button onclick="budgetTxToggleOff('${x.id}')" title="להחזיר לחישוב" style="background:none;border:none;color:var(--amber);cursor:pointer">↩</button></div>`).join(''):'';
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="_skipOpen=!_skipOpen;renderBudgetSkipped()">
      <div class="ch-title" style="margin:0">🚫 לא נספר בתקציב <span style="font-size:12px;font-weight:400;color:var(--t3)">(${skipped.length+offs.length})</span></div>
      <span style="color:var(--t3);font-size:12px">${_skipOpen?'▲ הסתר':'▼ הצג'}</span></div>
    <div class="ch-hint" style="margin-top:4px">פעולות מהקבצים שלא נכנסו לחישוב. סווג משהו לא נכון? לחצו עליו ובחרו קטגוריה — מאותו רגע הוא נספר.</div>
    ${_skipOpen?groups+offHtml:''}`;
}
// Picking "➕ ..." in the transaction editor: name the row, add it to this month, select it
function budgetTxNewRow(sel){
  if(!String(sel.value).startsWith('__new|')){sel.dataset.prev=sel.value;return;}
  const sec=sel.value.split('|')[1];
  const name=(prompt('שם הקטגוריה החדשה ('+_BSEC_LBL[sec]+'):','')||'').trim();
  if(!name){sel.value=sel.dataset.prev||'';return;}
  const b=curBudget();if(!Array.isArray(b[sec]))b[sec]=[];
  if(!b[sec].some(r=>(r.name||'').trim()===name))b[sec].push({name,amount:''});
  touchSection('budget');markDirty();
  const v=sec+'|'+name;
  sel.innerHTML=_bRowOptions(v);sel.value=v;sel.dataset.prev=v;
  showToast('נוספה הקטגוריה "'+name+'" ב'+_BSEC_LBL[sec]+' — לחצו "שמור" כדי להעביר אליה את העסקה');
}
function budgetRowTxPanel(sec,name,txs){
  const list=txs.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  // transactions marked "לא לספור" (t.off) are listed but their amount isn't in the row
  const sum=list.filter(t=>!t.off).reduce((s,t)=>s+t.a,0),offN=list.filter(t=>t.off).length;
  const row=(curBudget()[sec]||[]).find(r=>(r.name||'').trim()===String(name).trim());
  const manual=row?Math.round(_bNum(row.amount)-sum):0;
  const item=t=>{
    if(_budgetEditTx===t.id)return `<div style="background:var(--s1);border:1px solid var(--teal-border);border-radius:9px;padding:8px;margin:4px 0">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">${esc(t.n)} <span style="color:var(--t3);font-weight:400">· ${_bShortDate(t.d)}${t.s?' · '+esc(t.s):''}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <select id="btx-k" data-prev="${esc(t.k)}" onchange="budgetTxNewRow(this)" style="flex:1;min-width:150px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12px;padding:5px">${_bRowOptions(t.k)}</select>
        <input id="btx-a" type="number" step="0.01" value="${t.a}" data-no-fmt style="width:95px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:12.5px;padding:5px;text-align:center">
        <button onclick="budgetTxSave('${t.id}')" class="btnsave" style="padding:5px 12px;font-size:12px">שמור</button>
        <button onclick="budgetTxRemove('${t.id}')" title="הסר את העסקה מהקטגוריה (למשל אם נספרה פעמיים)" style="background:none;border:1px solid rgba(239,68,68,.35);color:#fca5a5;border-radius:7px;padding:5px 8px;font-family:var(--font);font-size:11.5px;cursor:pointer">🗑 הסר</button>
        <button onclick="budgetTxEdit(null)" style="background:none;border:none;color:var(--t3);font-family:var(--font);font-size:12px;cursor:pointer">ביטול</button>
      </div></div>`;
    return `<div onclick="budgetTxEdit('${t.id}')" title="לחצו לשינוי הקטגוריה או הסכום"
      style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);cursor:pointer;font-size:12.5px${t.off?';opacity:.55':''}">
      <span style="color:var(--t3);font-size:11.5px;white-space:nowrap;width:58px">${_bShortDate(t.d)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.n)}${t.edited?' <span style="font-size:10px;color:var(--amber)">· עודכן</span>':''}${t.off?' <span style="font-size:10px;color:var(--amber)">· לא נספר</span>':''}</span>
      <span style="font-size:10.5px;color:var(--t3);white-space:nowrap">${esc(t.s||'')}</span>
      <b style="white-space:nowrap${t.off?';text-decoration:line-through':''}">${iln(fmt(t.a))}</b>
      <button onclick="event.stopPropagation();budgetTxToggleOff('${t.id}')" title="${t.off?'להחזיר לחישוב':'לא לספור את העסקה הזו בחישוב (למשל חד־פעמית, או כזו שתוחזר)'}"
        style="flex-shrink:0;background:none;border:none;color:${t.off?'var(--amber)':'var(--t3)'};cursor:pointer;font-size:13px;padding:0 2px">${t.off?'↩':'⊘'}</button></div>`;
  };
  return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:6px 10px 8px;margin:-2px 0 10px">
    <div style="font-size:11px;color:var(--t3);padding:2px 0 4px">לפי תאריך העסקה · לחיצה על עסקה: העברה לקטגוריה אחרת או תיקון הסכום · ⊘ = לא לספור אותה בחישוב</div>
    ${list.map(item).join('')}
    <div style="display:flex;justify-content:space-between;font-size:12px;padding-top:6px;color:var(--t2)"><span>${list.length-offN} עסקאות${offN?` <span style="color:var(--amber)">(+${offN} שלא נספרות)</span>`:''}</span><b>${iln(fmt(sum))}</b></div>
    ${Math.abs(manual)>=1?`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--t3)">
      <span>${manual>0?'+':'−'} ${iln(fmt(Math.abs(manual)))} ${manual>0?'נוספו בשורה מעבר לעסקאות (הוקלדו ידנית, או נספרו פעמיים)':'חסרים בשורה לעומת העסקאות'}</span>
      <button onclick="budgetRowMatchTx('${sec}','${encodeURIComponent(String(name).trim()).replace(/'/g,'%27')}')" style="background:none;border:1px solid var(--teal-border);border-radius:7px;color:var(--teal);font-family:var(--font);font-size:11px;padding:2px 8px;cursor:pointer">↺ השוו את השורה לעסקאות (${iln(fmt(sum))})</button></div>`:''}
    ${(()=>{const inv=_bInvestInIncome(sec,list);if(!inv.length)return '';
      return `<div style="margin-top:8px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.35);border-radius:9px;padding:7px 9px;font-size:11.5px;line-height:1.6;color:var(--t2)">
        📈 <b>${inv.length===list.filter(t=>!t.off).length?'כל העסקאות כאן':inv.length+' מהעסקאות כאן'} הן העברות להשקעות</b> (${iln(fmt(inv.reduce((s,t)=>s+t.a,0)))}) — זו לא הכנסה, רק כסף קיים שעבר מהחשבון להשקעה.
        <button onclick="budgetIncomeToInvest('${sec}','${encodeURIComponent(String(name).trim()).replace(/'/g,'%27')}')" style="margin-top:5px;display:block;background:#60a5fa;border:none;border-radius:7px;color:#0b1220;font-family:var(--font);font-size:11.5px;font-weight:700;padding:4px 10px;cursor:pointer">להעביר ל"📈 העברה להשקעות" ✓</button></div>`;})()}
  </div>`;
}
// Transfers to investments sitting in an income row: money that LEFT the account (kept direction),
// or — moved before the direction was kept — a broker / securities transfer from the bank file
function _bInvestInIncome(sec,list){
  if(sec!=='income'&&sec!=='bizIncome')return [];
  const isInv=n=>!!(window.SIX&&SIX.isInvest&&SIX.isInvest(n));
  return list.filter(t=>!t.off&&/^עו"ש/.test(t.s||'')&&(t.dir==='out'||(!t.dir&&isInv(t.n))));
}
// Take them out of income → the "📈 העברה להשקעות" section. When nothing else is left in the
// income row, the row goes too (it may also hold the same amount added twice — see v=109).
function budgetIncomeToInvest(sec,nameEnc){
  const name=decodeURIComponent(nameEnc),m=curBudget(),k=sec+'|'+name;
  const row=(m[sec]||[]).find(r=>(r.name||'').trim()===name);if(!row)return;
  const all=(m.tx||[]).filter(x=>x.k===k),inv=_bInvestInIncome(sec,all),invSum=inv.reduce((s,t)=>s+t.a,0);
  const rest=all.filter(x=>!inv.includes(x)),onlyInv=!rest.length;
  if(!confirm(onlyInv
    ?`להעביר את "${name}" מההכנסות ל"📈 העברה להשקעות"?\n${inv.length} העברות (${fmt(invSum)}) יעברו לשם, והשורה בהכנסות (${fmt(_bNum(row.amount))}) תימחק.`
    :`להעביר ${inv.length} העברות להשקעות (${fmt(invSum)}) מ"${name}" ל"📈 העברה להשקעות"?`))return;
  const dest=_budgetInvestRow(m);
  inv.forEach(t=>{t.k='invest|'+dest.name.trim();t.dir='out';t.edited=true;});
  dest.amount=String(Math.round(_bNum(dest.amount)+invSum));
  if(onlyInv)m[sec]=m[sec].filter(r=>r!==row);
  else row.amount=String(Math.max(0,Math.round(_bNum(row.amount)-invSum)));
  _budgetOpenRow=null;
  touchSection('budget');markDirty();renderBudget();
  showToast(`${fmt(invSum)} הועברו ל"📈 העברה להשקעות" ✓ — לא נספרים יותר כהכנסה`);
}
// The investments row money moved to investments goes into (the market row, else the first one)
function _budgetInvestRow(m){
  if(!Array.isArray(m.invest)||!m.invest.length)m.invest=INVEST_DEFAULT_ROWS();
  return m.invest.find(r=>/שוק ההון|השקע/.test(r.name||''))||m.invest[0];
}
// Automatic, once per month (m.invMig): bank transfers TO a broker (פסגות, מיטב, אקסלנס...) that
// sit in an income row (moved there by hand before) or in "לא נספר" (older uploads) go to the
// "📈 העברה להשקעות" section. Money that came BACK from investments is left alone. An income row
// left holding nothing but the same amount again (the doubling fixed in v=109) is removed.
const _B_TO_BROKER=/(^|[\s.])ל(פסגות|מיטב|אקסלנס|אלטשולר|אינטראקטיב|בלינק|ספארק|אנליסט)|^קניה|קרן כספית/;
function budgetAutoInvest(){
  if(!(window.SIX&&SIX.isInvest))return; // importer not loaded yet — try on the next render
  // tax withheld on securities is a tax, not an investment
  const isInv=n=>SIX.isInvest(n)&&!/(^|\s)מס ני"?ע|ניכוי מס/.test(n);
  let moved=0,sum=0;
  Object.values(D.budgetMonths||{}).forEach(m=>{
    if(!m||m.invMig||!Array.isArray(m.tx))return;
    m.invMig=1;
    const out=t=>/^עו"ש/.test(t.s||'')&&!t.off&&isInv(t.n)&&(t.dir==='out'||(!t.dir&&_B_TO_BROKER.test(t.n)));
    const list=m.tx.filter(t=>(/^(income|bizIncome)\|/.test(t.k||'')||t.k==='skip|invest')&&out(t));
    if(!list.length)return;
    const dest=_budgetInvestRow(m),destK='invest|'+dest.name.trim(),fromRows={};
    list.forEach(t=>{if(t.k!=='skip|invest')fromRows[t.k]=(fromRows[t.k]||0)+t.a;t.k=destK;t.dir='out';t.edited=true;dest.amount=String(Math.round(_bNum(dest.amount)+t.a));moved++;sum+=t.a;});
    Object.entries(fromRows).forEach(([k,s])=>{
      const [sec,name]=k.split('|'),row=(m[sec]||[]).find(r=>(r.name||'').trim()===name);if(!row)return;
      const left=Math.max(0,_bNum(row.amount)-s),still=m.tx.some(x=>x.k===k);
      // nothing else listed, and what's left is zero or exactly the same amount again → it was doubled
      if(!still&&(left<1||Math.abs(left-s)<1))m[sec]=m[sec].filter(r=>r!==row);
      else row.amount=String(Math.round(left));
    });
  });
  if(moved){touchSection('budget');markDirty();showToast(`📈 ${moved} העברות לבתי השקעות (${fmt(sum)}) עברו אוטומטית ל"העברה להשקעות" — הן לא הכנסה ולא הוצאה`);}
}
// Automatic, once per month (m.signFix): up to v=105 a bank file with one signed "זכות/חובה"
// column (Discount) was read wrongly — money that LEFT the account (card bills, rent, transfers)
// went into income rows, mostly with a NEGATIVE amount (a correctly imported bank transaction is
// never negative in a row). Moving such an item out of a row then ADDED to that row. In a month
// where that happened, that whole bank upload is undone (its transactions — same upload time as
// the negative ones), and every row it touched is set back to exactly its remaining transactions
// (empty if none). Re-uploading the bank file then brings it all in correctly.
function budgetAutoFixSigns(){
  let fixed=0,months=0;
  const isBank=x=>/^עו"ש/.test(x.s||'');
  const stamp=x=>parseInt(String(x.id||'').split(':').pop(),36)||0;
  Object.values(D.budgetMonths||{}).forEach(m=>{
    if(!m||m.signFix||!Array.isArray(m.tx))return;
    m.signFix=1;
    const neg=m.tx.filter(x=>isBank(x)&&!String(x.k||'').startsWith('skip|')&&x.a<0);
    if(!neg.length)return;
    const times=neg.map(stamp);
    const sameUpload=x=>isBank(x)&&times.some(t=>Math.abs(stamp(x)-t)<10000); // within 10 s
    const bad=m.tx.filter(sameUpload);
    const touched=new Set(bad.map(x=>x.k).filter(k=>!String(k).startsWith('skip|')));
    m.tx.filter(x=>isBank(x)&&!bad.includes(x)).forEach(x=>{if(!String(x.k).startsWith('skip|'))touched.add(x.k);});
    m.tx=m.tx.filter(x=>!bad.includes(x));
    touched.forEach(k=>{
      const [sec,name]=k.split('|'),row=(m[sec]||[]).find(r=>(r.name||'').trim()===name);if(!row)return;
      const rest=m.tx.filter(x=>!x.off&&x.k===k).reduce((s,x)=>s+x.a,0);
      row.amount=rest>0?String(Math.round(rest)):'';
    });
    delete m.bank; // its balances came from the misread file — the re-upload brings them back
    fixed+=bad.length;months++;
  });
  if(fixed){touchSection('budget');markDirty();
    showToast(`🧹 נמצאה העלאה ישנה של קובץ עו"ש שנקלט הפוך (כסף שיצא נרשם כהכנסה) ב־${months} חודשים — היא בוטלה (${fixed} פעולות). העלו שוב את קובץ העו"ש של החשבון הזה — הכל ייכנס נכון`);}
  return fixed;
}
// Older uploads put transfers TO investments in "לא נספר" — move this month's into the section
function budgetSkipInvestToRow(){
  const m=curBudget(),list=(m.tx||[]).filter(x=>x.k==='skip|invest'&&x.dir!=='in');if(!list.length)return;
  const s=list.reduce((a,x)=>a+x.a,0);
  if(!confirm(`להעביר ${list.length} העברות להשקעות (${fmt(s)}) ל"📈 העברה להשקעות"? הן ייספרו שם כחיסכון — לא כהוצאה ולא כהכנסה.`))return;
  const dest=_budgetInvestRow(m);
  list.forEach(x=>{x.k='invest|'+dest.name.trim();x.dir='out';x.edited=true;});
  dest.amount=String(Math.round(_bNum(dest.amount)+s));
  touchSection('budget');markDirty();renderBudget();
  showToast(`${fmt(s)} הועברו ל"📈 העברה להשקעות" ✓`);
}
// Set a row to exactly what its listed transactions add up to (drops a doubled / stray amount)
function budgetRowMatchTx(sec,nameEnc){
  const name=decodeURIComponent(nameEnc),m=curBudget();
  const row=(m[sec]||[]).find(r=>(r.name||'').trim()===name);if(!row)return;
  const sum=(m.tx||[]).filter(x=>!x.off&&x.k===sec+'|'+name).reduce((s,x)=>s+x.a,0);
  if(!confirm(`לעדכן את "${name}" ל־${fmt(sum)} — בדיוק סכום העסקאות שבה? (סכום שהוקלד ידנית בשורה יימחק)`))return;
  row.amount=String(Math.max(0,Math.round(sum)));
  touchSection('budget');markDirty();renderBudget();
  showToast(`"${name}" עודכן ל־${fmt(sum)} ✓`);
}
// Which way the money went (in / out) — kept on the transaction when it moves between rows, so
// the duplicate check still recognises it when the same file is uploaded again
function _bTxDir(t){return t.dir||(/^(income|bizIncome)\|/.test(t.k||'')?'in':'out');}
function budgetTxEdit(id){_budgetEditTx=id;const sec=String(_budgetOpenRow||'').split('|')[0];if(sec)renderBudgetSection(sec);}
// Move an amount between rows (the row's other, typed-in part stays as it was)
function _budgetMoveAmt(key,delta){
  const [sec,name]=String(key).split('|');
  if(sec==='skip')return; // "לא נספר" has no row — nothing to add or take
  const row=(curBudget()[sec]||[]).find(r=>(r.name||'').trim()===name);
  if(row)row.amount=String(Math.max(0,Math.round(_bNum(row.amount)+delta)));
}
function budgetTxSave(id){
  const b=curBudget(),t=(b.tx||[]).find(x=>x.id===id);
  const kEl=document.getElementById('btx-k'),aEl=document.getElementById('btx-a');
  if(!t||!kEl||!aEl)return;
  const k=kEl.value,a=parseFloat(aEl.value);
  if(!k||k.startsWith('__new|')||isNaN(a)){showToast('בחרו קטגוריה וסכום');return;}
  if(k===t.k&&a===t.a){budgetTxEdit(null);return;}
  // money that left the account going into an income row (or the other way) — usually a mistake:
  // a transfer to investments isn't income
  const dir=_bTxDir(t),toInc=/^(income|bizIncome)\|/.test(k);
  if(k!==t.k&&!k.startsWith('skip|')&&(dir==='out')===toInc&&
    !confirm(dir==='out'?`"${t.n}" — כאן כסף יצא מהחשבון. להכניס אותו לשורת הכנסה? (העברה להשקעות היא לא הכנסה — בחרו שורה בקבוצה "העברה להשקעות", או "🔁 העברה בין החשבונות שלי")`:`"${t.n}" — כאן כסף נכנס לחשבון. להכניס אותו לשורת הוצאה?`))return;
  if(!t.off){_budgetMoveAmt(t.k,-t.a);_budgetMoveAmt(k,a);} // a "לא לספור" one isn't in any row
  const wasOff=!!t.off;
  const moved=k!==t.k;
  t.dir=dir; // kept wherever it moves (see _bTxDir)
  if(a!==t.a&&t.a0===undefined)t.a0=t.a; // the file's amount — the duplicate check keeps using it
  t.k=k;t.a=a;t.edited=true;_budgetEditTx=null;
  // remember the merchant's new place for the next uploads too (like the "all months" popup does)
  if(moved&&!wasOff){const mk=_bMk(t.n);if(mk){const [sec,name]=k.split('|');
    D.importMerchants=D.importMerchants||{};D.importMerchants[mk]=sec==='skip'?'skip':{sec,name};}}
  touchSection('budget');markDirty();renderBudget();
  showToast(moved?'העסקה הועברה ל"'+k.split('|')[1]+'" ✓ הסכומים עודכנו':'הסכום עודכן ✓');
  if(moved&&!wasOff)budgetBulkOffer(t,k);
}
// One transaction in or out of the figures: its amount leaves the row (or comes back to it).
// The bank check still counts it — the money really moved.
function budgetTxToggleOff(id){
  const b=curBudget(),t=(b.tx||[]).find(x=>x.id===id);if(!t)return;
  if(t.off){delete t.off;_budgetMoveAmt(t.k,t.a);}
  else{t.off=true;_budgetMoveAmt(t.k,-t.a);}
  _budgetEditTx=null;
  touchSection('budget');markDirty();renderBudget();
  showToast(t.off?'"'+t.n+'" לא נספר בחישוב ('+fmt(t.a)+' ירדו מהקטגוריה) — ↩ להחזרה':'"'+t.n+'" חזר לחישוב ✓');
}

// ── Same merchant in other months: re-categorise everywhere, in some months, or only here ──
// After a transaction is moved to another row, the same merchant (same key the import uses to
// remember merchants) is looked for in every month of this account wherever it's still in a
// different row. A popup asks: all of them / pick months / only this one. Moving keeps the
// rows in each month in step, and the choice is remembered for future uploads.
let _bulk=null; // {name, mk, newK, groups:{monthKey:[tx]}, picking:boolean, sel:Set}
function _bMk(n){
  const base=String(n||'').split(' · ')[0];
  return (window.SIX&&SIX.mk)?SIX.mk(base):base.toLowerCase().replace(/[\d"'׳״.,\-_/\\*|()]+/g,' ').replace(/\s+/g,' ').trim();
}
function budgetBulkOffer(t,newK){
  const mk=_bMk(t.n);if(!mk)return;
  const groups={};
  Object.entries(D.budgetMonths||{}).forEach(([key,m])=>(m.tx||[]).forEach(x=>{
    if(x.id!==t.id&&x.k!==newK&&_bMk(x.n)===mk)(groups[key]=groups[key]||[]).push(x);}));
  if(!Object.keys(groups).length)return;
  _bulk={name:String(t.n).split(' · ')[0],mk,newK,groups,picking:false,sel:new Set(Object.keys(groups))};
  budgetBulkRender();
}
function budgetBulkRender(){
  let o=document.getElementById('btx-bulk');
  if(!_bulk){if(o)o.style.display='none';return;}
  if(!o){o=document.createElement('div');o.className='overlay';o.id='btx-bulk';document.body.appendChild(o);
    o.addEventListener('click',e=>{if(e.target===o)budgetBulkClose();});}
  const b=_bulk,keys=Object.keys(b.groups).sort(),newRow=b.newK.split('|')[1];
  const nTx=keys.reduce((s,k)=>s+b.groups[k].length,0);
  const monthLine=k=>{const g=b.groups[k],sum=g.reduce((s,x)=>s+x.a,0),cats=[...new Set(g.map(x=>x.k.split('|')[1]))].join(', ');
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);cursor:pointer;font-size:12.5px">
      <input type="checkbox" ${b.sel.has(k)?'checked':''} onchange="budgetBulkToggle('${k}')">
      <span style="flex:1"><b>${fmtBudgetMonth(k)}</b>${k===D.budgetCurMonth?' <span style="font-size:10.5px;color:var(--teal)">(החודש הזה)</span>':''}
        <span style="font-size:11px;color:var(--t3)"> · עכשיו ב"${esc(cats)}"</span></span>
      <span style="white-space:nowrap">${g.length>1?g.length+' × ':''}${iln(fmt(sum))}</span></label>`;};
  o.innerHTML=`<div class="modal" style="text-align:right;width:min(480px,94vw)">
    <h2 style="margin-bottom:6px">🔁 אותה הוצאה מופיעה גם ב־${keys.length===1?'חודש אחד':keys.length+' חודשים'}</h2>
    <p style="margin-bottom:12px">"<b>${esc(b.name)}</b>" מופיע עוד ${nTx} פעמים בסיווג אחר. לשנות את הסיווג ל"<b>${esc(newRow)}</b>" בכל החודשים במערכת, או רק בחלק?</p>
    ${b.picking?`<div style="max-height:45vh;overflow:auto;margin-bottom:10px">${keys.map(monthLine).join('')}</div>
      <div class="modal-btns" style="margin-top:6px">
        <button class="btnsnap primary" style="flex:1" onclick="budgetBulkApply(false)"${b.sel.size?'':' disabled'}>${b.sel.size===1?'שנה בחודש שסומן':'שנה ב־'+b.sel.size+' החודשים שסומנו'}</button>
        <button class="btnsnap" style="flex:0 0 auto;padding:12px 16px;background:var(--s2);color:var(--t2);border:1px solid var(--border)" onclick="budgetBulkClose()">רק כאן</button></div>`
    :`<div class="modal-btns" style="flex-wrap:wrap">
        <button class="btnsnap primary" style="flex:1" onclick="budgetBulkApply(true)">בכל החודשים (${keys.length})</button>
        <button class="btnsnap" style="flex:1;background:var(--s2);color:var(--teal);border:1px solid var(--teal-border)" onclick="_bulk.picking=true;budgetBulkRender()">רק בחלק — לבחור חודשים</button>
        <button class="btnsnap" style="flex:0 0 100%;background:none;color:var(--t3);border:none;padding:6px" onclick="budgetBulkClose()">רק בעסקה הזו</button></div>`}
  </div>`;
  o.style.display='flex';
}
function budgetBulkToggle(k){if(!_bulk)return;if(_bulk.sel.has(k))_bulk.sel.delete(k);else _bulk.sel.add(k);budgetBulkRender();}
function budgetBulkClose(){_bulk=null;budgetBulkRender();}
// move an amount between rows of a given month (adds the target row there if it's missing)
function _budgetMoveAmtIn(m,key,delta){
  const [sec,name]=String(key).split('|');
  if(sec==='skip')return; // "לא נספר" has no row
  if(!Array.isArray(m[sec]))m[sec]=[];
  let row=m[sec].find(r=>(r.name||'').trim()===name);
  if(!row){if(delta<=0)return;row={name,amount:''};m[sec].push(row);}
  row.amount=String(Math.max(0,Math.round(_bNum(row.amount)+delta)));
}
function budgetBulkApply(all){
  const b=_bulk;if(!b)return;
  const keys=Object.keys(b.groups).filter(k=>all||b.sel.has(k));
  let n=0;
  keys.forEach(k=>{const m=D.budgetMonths[k];if(!m)return;
    b.groups[k].forEach(x=>{if(!x.off){_budgetMoveAmtIn(m,x.k,-x.a);_budgetMoveAmtIn(m,b.newK,x.a);}
      x.dir=_bTxDir(x); // kept wherever it moves
      x.k=b.newK;x.edited=true;n++;});});
  // remember it for future uploads too
  const [sec,name]=b.newK.split('|');
  if(window.SIX&&SIX.mk){D.importMerchants=D.importMerchants||{};D.importMerchants[b.mk]={sec,name};}
  _bulk=null;budgetBulkRender();
  touchSection('budget');markDirty();renderBudget();
  showToast(`"${b.name}" סווג ל"${name}" ב־${keys.length} חודשים נוספים (${n} עסקאות) ✓`);
}
function budgetTxRemove(id){
  const b=curBudget(),t=(b.tx||[]).find(x=>x.id===id);if(!t)return;
  if(!confirm('להסיר את "'+t.n+'" ('+fmt(t.a)+') מהקטגוריה? הסכום יירד מהשורה.'))return;
  if(!t.off)_budgetMoveAmt(t.k,-t.a);
  // remembered, so uploading the same file again doesn't bring it back
  (b.txGone=b.txGone||[]).push({d:t.d,a:t.a0!==undefined?t.a0:t.a,dir:_bTxDir(t),s:t.s||'',k:t.k});
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
  return x.d+'|'+Math.round(Math.abs(x.a)*100)/100+'|'+(x.dir||(sec==='income'||sec==='bizIncome'?'in':'out'))+'|'+(/^עו"ש/.test(x.s||'')?'bank':'card');}
function budgetFindDups(m){
  const groups={};
  (m.tx||[]).filter(x=>!x.off).forEach(x=>{(groups[_bDupKey(x)]=groups[_bDupKey(x)]||[]).push(x);});
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
    const listed=(m.tx||[]).filter(x=>!x.off&&x.k===sec+'|'+name).reduce((s,x)=>s+x.a,0);
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
    const listed=m.tx.filter(x=>!x.off&&x.k===k).reduce((s,x)=>s+x.a,0);
    row.amount=String(Math.max(0,Math.round(Math.max(_bNum(row.amount)-dupSum,listed))));
  });
  touchSection('budget');markDirty();renderBudget();
  showToast('הוסרו '+d.length+' כפילויות ✓ הסכומים עודכנו');
}

// Card bills in the bank ↔ charges from the uploaded card statements. A statement is often split
// into sections with their own totals (domestic / abroad, one per card) while the bank takes ONE
// amount for all of them — so a bill matches one charge or a combination of charges (±₪1), of the
// same issuer when both are known, preferring the same card digits and the fewest pieces.
function budgetMatchCardBills(bills,segs){
  const ok=(s,c)=>!s.iss||!c.iss||s.iss===c.iss;
  return bills.map(c=>{
    let pool=segs.filter(s=>!s.used&&ok(s,c));
    if(c.ref&&pool.some(s=>s.card===c.ref))pool=pool.filter(s=>!s.card||s.card===c.ref);
    pool=pool.slice(0,14); // keeps the search small
    let best=null;
    const n=pool.length;
    for(let mask=1;mask<(1<<n);mask++){
      let sum=0,cnt=0;
      for(let i=0;i<n;i++)if(mask&(1<<i)){sum+=pool[i].a;cnt++;}
      if(Math.abs(sum-c.a)<=1&&(!best||cnt<best.cnt))best={mask,cnt};
      if(best&&best.cnt===1)break;
    }
    if(best)for(let i=0;i<n;i++)if(best.mask&(1<<i)){pool[i].used=true;pool[i].by=c.iss;}
    return Object.assign({},c,{ok:!!best,parts:best?best.cnt:0});
  });
}
// Is this unmatched card bill an immediate charge? The issuer's regular bill = its biggest bill in
// each month; immediate charges fall on other days.
function _budgetIsImmediate(c){
  const day=d=>+String(d||'').slice(8,10)||0,iss=c.iss||'';
  const reg={};
  Object.values(D.budgetMonths||{}).forEach(m=>{
    const big=((m.bank||{}).cards||[]).filter(x=>(x.iss||'')===iss&&(!c.ref||!x.ref||x.ref===c.ref)).sort((a,b)=>b.a-a.a)[0];
    if(big&&day(big.d))reg[day(big.d)]=(reg[day(big.d)]||0)+1;
  });
  const usual=Object.entries(reg).sort((a,b)=>b[1]-a[1])[0];
  if(!usual||usual[1]<2)return false; // not enough history to tell
  return Math.abs(day(c.d)-(+usual[0]))>2;
}
// Jump to a row (from the gap breakdown) and flash it
function budgetGoToRow(sec,nameEnc){
  const name=decodeURIComponent(nameEnc);
  const i=(curBudget()[sec]||[]).findIndex(r=>(r.name||'').trim()===name);
  const el=document.getElementById('brow-'+sec+'-'+i);if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.style.transition='box-shadow .3s';el.style.boxShadow='0 0 0 2px var(--teal)';el.style.borderRadius='9px';
  setTimeout(()=>{el.style.boxShadow='';},2200);
}
// Card statements recorded this month vs card bills paid from the bank — per card, so it's clear
// which card makes the difference. Statements are labelled "issuer digits" (e.g. "כאל 1234");
// a bank bill carries the issuer and sometimes the card digits.
function budgetCardSplitHtml(m,bk){
  const isBank=x=>/^עו"ש/.test(x.s||''),isInc=k=>/^(income|bizIncome)\|/.test(k||'');
  const st={};
  // an Excel statement doesn't name its issuer ("כרטיס 1234") — take it from the bank bill with those digits
  const issOfRef={};(bk.cards||[]).forEach(c=>{if(c.ref&&c.iss)issOfRef[c.ref]=c.iss;});
  // …or from the bank bill its charges matched (the bank doesn't always print the card digits)
  const segs=(m.cardSegs||[]).map(s=>Object.assign({},s,{used:false}));budgetMatchCardBills(bk.cards||[],segs);
  segs.forEach(s=>{if(s.used&&s.by&&s.card&&!issOfRef[s.card])issOfRef[s.card]=s.by;});
  const lbl=s=>{const mm=s.match(/^כרטיס (\d{4})$/);return mm&&issOfRef[mm[1]]?issOfRef[mm[1]]+' '+mm[1]:s;};
  (m.tx||[]).filter(x=>!isBank(x)&&!isInc(x.k)).forEach(x=>{const k=lbl((x.s||'כרטיס').trim());st[k]=(st[k]||0)+(x.dir==='in'?-x.a:x.a);});
  const bills={};
  (bk.cards||[]).forEach(c=>{const k=(c.iss||'כרטיס')+(c.ref?' '+c.ref:'');(bills[k]=bills[k]||{a:0,d:[]}).a+=c.a;bills[k].d.push(_bShortDate(c.d));});
  const sLine=Object.entries(st).sort((a,b)=>b[1]-a[1]).map(([k,v])=>esc(k)+' '+iln(fmt(v))).join(' · ')||'—';
  const bLine=Object.entries(bills).sort((a,b)=>b[1].a-a[1].a).map(([k,v])=>esc(k)+' '+iln(fmt(v.a))+' <span style="opacity:.75">('+v.d.join(', ')+')</span>').join(' · ')||'—';
  // per issuer: which card is off
  const iss=s=>String(s).split(' ')[0];
  const byIss={};
  Object.entries(st).forEach(([k,v])=>{const i=iss(k);(byIss[i]=byIss[i]||{st:0,bill:0}).st+=v;});
  Object.entries(bills).forEach(([k,v])=>{const i=iss(k);(byIss[i]=byIss[i]||{st:0,bill:0}).bill+=v.a;});
  const off=Object.entries(byIss).filter(([,v])=>Math.abs(v.st-v.bill)>=1)
    .map(([i,v])=>`<b>${esc(i)}</b>: ${v.st>v.bill?'בפירוטים '+iln(fmt(v.st-v.bill))+' יותר ממה שירד מהעו"ש':'ירד מהעו"ש '+iln(fmt(v.bill-v.st))+' יותר מהפירוטים'}${!v.st?' — לא הועלה פירוט':''}${!v.bill?' — לא נמצא חיוב בעו"ש הזה':''}`);
  return `<div style="line-height:1.8">📄 פירוטים שנרשמו החודש: ${sLine}<br>🏦 חיובי כרטיס בעו"ש: ${bLine}</div>`
    +(off.length?`<div style="margin-top:2px;color:var(--t2)">ההפרש: ${off.join(' · ')}</div>`:'');
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
  const listed=(sec,n)=>(m.tx||[]).filter(x=>!x.off&&x.k===sec+'|'+n).reduce((s,x)=>s+x.a,0);
  const hand=secs=>{const out=[];secs.forEach(sec=>(m[sec]||[]).forEach(r=>{const n=(r.name||'').trim();if(!n)return;
    const v=_bNum(r.amount)-listed(sec,n);if(Math.abs(v)>=1)out.push({n,a:v,sec});}));return out;};
  const manExp=hand(['needs','wants','invest','business','bizInvest']),manInc=hand(['income','bizIncome']);
  const cardTx=(m.tx||[]).filter(x=>!isBank(x)&&!isInc(x.k)).reduce((s,x)=>s+(x.dir==='in'?-x.a:x.a),0); // ("not counted" items carry their direction)
  // card bills after the bank file's last day are already left out of diff (renderBudgetBank)
  const cardBills=(bk.cards||[]).reduce((s,c)=>s+c.a,0)+(m.cardSegs||[]).filter(s=>bk.to&&s.d&&s.d>bk.to).reduce((s,x)=>s+x.a,0);
  const sk=Array.isArray(bk.skipped)?bk.skipped:null;
  const skIn=sk?sk.filter(x=>x.dir==='in'):[],skOut=sk?sk.filter(x=>x.dir==='out'):[];
  const tot=l=>l.reduce((s,x)=>s+x.a,0);
  const comps=[
    {lbl:'הוצאות שהוקלדו ידנית — לא עברו בעו"ש הזה (מזומן, חשבון אחר, 🔁 הוצאה קבועה...)',v:tot(manExp),items:manExp},
    {lbl:'פירוטי אשראי שנרשמו בחודש הזה, לעומת חיובי האשראי שירדו בפועל מהעו"ש',v:cardTx-cardBills,
      note:budgetCardSplitHtml(m,bk)},
    {lbl:'כסף שנכנס לעו"ש וסומן "לא לספור"',v:tot(skIn),items:skIn.map(x=>({n:_bShortDate(x.d)+' · '+x.n,a:x.a}))},
    {lbl:'כסף שיצא מהעו"ש וסומן "לא לספור"',v:-tot(skOut),items:skOut.map(x=>({n:_bShortDate(x.d)+' · '+x.n,a:x.a}))},
    {lbl:'הכנסות שהוקלדו ידנית — לא עברו בעו"ש הזה',v:-tot(manInc),items:manInc}
  ].filter(c=>Math.abs(c.v)>=1);
  const rest=diff-comps.reduce((s,c)=>s+c.v,0);
  const sgn=v=>iln((v>=0?'+':'−')+fmt(Math.abs(v)));
  const line=c=>`<div style="padding:6px 0;border-bottom:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span style="color:var(--t1)">${c.lbl}</span><b style="white-space:nowrap;color:${(c.v>0)===(diff>0)?'var(--amber)':'var(--t2)'}">${sgn(c.v)}</b></div>
    ${c.note?`<div style="font-size:11px;color:var(--t3)">${c.note}</div>`:''}
    ${c.items&&c.items.length?`<div style="font-size:11px;color:var(--t3);margin-top:2px;line-height:1.8">${c.items.slice(0,8).map(x=>x.sec?`<button onclick="budgetGoToRow('${x.sec}','${encodeURIComponent(x.n).replace(/'/g,'%27')}')" title="לקפוץ לשורה" style="background:none;border:none;padding:0;color:var(--teal);font-family:var(--font);font-size:11px;cursor:pointer;text-decoration:underline dotted">${esc(x.n)} (${_BSEC_LBL[x.sec]||''}) ${fmt(x.a)}</button>`:esc(x.n)+' '+fmt(x.a)).join(' · ')}${c.items.length>8?' · ועוד '+(c.items.length-8):''}</div>`:''}
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
  renderBudgetSkipped();
  const el=document.getElementById('budget-bank-card');if(!el)return;
  const m=curBudget(),bk=m.bank;
  if(!bk){el.style.display='none';el.innerHTML='';return;}
  el.style.display='';
  const sum=rows=>(rows||[]).reduce((s,r)=>s+_bNum(r.amount),0);
  // transactions marked "לא לספור" are out of the rows but the money did move — add them back here
  const offOf=inc=>(m.tx||[]).filter(x=>x.off&&/^(income|bizIncome)\|/.test(x.k)===inc).reduce((s,x)=>s+x.a,0);
  const inc=sum(m.income)+sum(m.bizIncome)+offOf(true),exp=sum(m.needs)+sum(m.wants)+sum(m.invest)+sum(m.business)+sum(m.bizInvest)+offOf(false);
  const hasBal=bk.opening!=null&&bk.closing!=null;
  const actual=hasBal?bk.closing-bk.opening:0;
  // bk.invest = everything the bank file saw going to / coming back from investments; the part
  // that's in the "📈 העברה להשקעות" rows is already in exp — only the rest is taken out here
  const invInRows=(m.tx||[]).filter(x=>!x.off&&/^invest\|/.test(x.k||'')&&/^עו"ש/.test(x.s||'')).reduce((s,x)=>s+x.a,0);
  const expected=inc-exp-((bk.invest||0)-invInRows)-(bk.own||0);
  // The bank file may end before the month does (exported on the 7th): card bills dated after
  // its last day are in the budget but haven't left the account yet — they aren't a gap
  const later=(m.cardSegs||[]).filter(s=>bk.to&&s.d&&s.d>bk.to),laterSum=later.reduce((s,x)=>s+x.a,0);
  const diff=actual-expected-laterSum,thr=Math.max(200,(bk.out||0)*0.02);
  // Card bills ↔ uploaded card statements (same amount ±₪1, same issuer when both are known)
  const segs=(m.cardSegs||[]).map(s=>Object.assign({},s,{used:false}));
  const cards=budgetMatchCardBills(bk.cards||[],segs);
  // A bill off the issuer's usual day with no statement yet = an immediate charge (abroad / online):
  // it shows up on that card's NEXT statement, and is filed under this month once that's uploaded
  cards.forEach(c=>{if(!c.ok)c.now=_budgetIsImmediate(c);});
  const missing=cards.filter(c=>!c.ok),missSum=missing.reduce((s,c)=>s+c.a,0);
  const missReg=missing.filter(c=>!c.now),missNow=missing.filter(c=>c.now);
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
    if(laterSum)verdict+=`<div style="font-size:11.5px;color:var(--t2);margin-top:6px">⏳ קובץ העו"ש מגיע רק עד ${_bShortDate(bk.to)}. חיובי כרטיס של ${iln(fmt(laterSum))} (${later.map(s=>_bShortDate(s.d)).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}) כבר בתקציב אבל עוד לא ירדו בקובץ — לא נחשבים כפער. העלה עו"ש מעודכן אחרי התאריך הזה כדי לבדוק גם אותם.</div>`;
  }
  const cardList=!cards.length?'':`<div style="font-size:12.5px;font-weight:800;margin:12px 0 4px">💳 חיובי אשראי שירדו מהחשבון</div>`
    +cards.map(c=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
      <span>${c.ok?'✅':'⚠️'} ${esc(c.iss||'כרטיס')}${c.ref?' · '+esc(c.ref):''} <span style="color:var(--t3)">· ${_bShortDate(c.d)}</span></span>
      <span style="white-space:nowrap">${iln(fmt(c.a))} <span style="font-size:11px;color:${c.ok?'var(--green)':'var(--amber)'}">${c.ok?'תואם לפירוט':c.now?'חיוב מיידי — בפירוט הבא':'אין פירוט'}</span></span></div>`).join('')
    +(missReg.length?`<div style="font-size:11.5px;color:var(--amber);margin-top:4px">כדאי להעלות את פירוט הכרטיס של החיובים המסומנים ב־⚠️ — עד אז ההוצאות שבהם לא בתקציב.</div>`:'')
    +(missNow.length?`<div style="font-size:11.5px;color:var(--t2);margin-top:4px">⚡ <b>חיוב מיידי</b> = עסקה (בדרך כלל בחו"ל או באינטרנט) שירדה מהעו"ש מיד, לא ביום החיוב הרגיל של הכרטיס. היא תופיע <b>בפירוט של החודש הבא</b> של הכרטיס — כשתעלה אותו, ההוצאה תיכנס אוטומטית <b>לחודש הזה</b> (לפי היום שבו ירדה) ולא תיספר פעמיים.</div>`:'')
    // a statement uploaded before the matching existed has no charge data — re-uploading fixes it
    +(missing.length&&(m.imports||[]).some(x=>!x.v)?`<div style="font-size:11.5px;color:var(--t2);margin-top:4px">💡 כבר העלית את הפירוט? אם הוא הועלה לפני שנוספה ההתאמה לעו"ש — העלה אותו שוב. הסכומים לא ייספרו פעמיים, רק החיבור יושלם.</div>`:'')
    +(extra.length?`<div style="font-size:11.5px;color:var(--t3);margin-top:4px">${extra.length} חיובי כרטיס מהפירוט לא נמצאו בעו"ש (${extra.map(s=>esc(s.iss||'כרטיס')+' '+fmt(s.a)).join(', ')}) — אולי יורדים מחשבון אחר.</div>`:'');
  const inv=(bk.invest||0)-invInRows; // only what isn't in the "📈 העברה להשקעות" rows
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
