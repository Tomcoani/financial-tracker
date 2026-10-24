// ══ MONTHLY CLOSE (סגירת חודש) ══
// The monthly habit: from the close day (default the 11th — after the card bills) the previous month
// is "ready to close". A card on the dashboard and the budget page opens a short flow: upload the
// files → check what's left → see the result and mark the month closed. Closed months: D.monthClose
// = {'2026-09': iso}, household-wide (all accounts). A small summary is kept on users/{uid}
// (lastClosedMonth, name, email, phone, closeDay) — the monthly Make scenario reads it to remind
// whoever hasn't closed (WhatsApp / e-mail). No money figures go there.

function mcCloseDay(){const n=parseInt((D.settings||{}).closeDay,10);return n>=1&&n<=28?n:11;}
function _mcKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
// the month that should be closed now: last month from the close day on, the one before until then
function mcDueMonth(){
  const t=new Date(),back=t.getDate()>=mcCloseDay()?1:2;
  return _mcKey(new Date(t.getFullYear(),t.getMonth()-back,1));
}
function mcIsClosed(k){return !!((D.monthClose||{})[k]);}
// consecutive closed months, counting back from the latest closed one
function mcStreak(){
  const keys=Object.keys(D.monthClose||{}).sort();if(!keys.length)return 0;
  let k=keys[keys.length-1],n=0;
  while(mcIsClosed(k)){n++;const [y,m]=k.split('-').map(Number);k=_mcKey(new Date(y,m-2,1));}
  return n;
}
function _mcEntries(){return typeof budgetAccEntries==='function'?budgetAccEntries():[{months:D.budgetMonths||{},profile:D.budgetProfile||{}}];}
function _mcName(k){return typeof fmtBudgetMonth==='function'?fmtBudgetMonth(k):k;}
function _mcShort(k){const m=+k.split('-')[1];return (typeof HEB_MONTHS!=='undefined'?HEB_MONTHS[m-1]:k)||k;}

// ── The card (dashboard + budget page) ──
function renderMonthCloseBanners(){
  const k=mcDueMonth(),closed=mcIsClosed(k),streak=mcStreak();
  const html=closed
    ?`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:10px 14px;margin-bottom:14px">
        <div style="font-size:13px;color:var(--t2)">✅ <b style="color:var(--green)">${_mcName(k)} סגור</b>${streak>1?` · 🔥 ${streak} חודשים ברצף`:''}</div>
        <button onclick="openMonthClose()" style="background:none;border:none;color:var(--teal);font-family:var(--font);font-size:12px;cursor:pointer;text-decoration:underline dotted">לסיכום החודש</button></div>`
    :`<div onclick="openMonthClose()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(66,235,214,.16),rgba(66,235,214,.03));border:1.5px solid var(--teal-border);border-radius:14px;padding:14px 16px;margin-bottom:14px">
        <div style="min-width:0"><div style="font-size:15px;font-weight:800;color:var(--teal)">🗓️ סגירת ${_mcName(k)} — 5 דקות</div>
          <div style="font-size:12px;color:var(--t2);margin-top:3px">מעלים את הקבצים, בודקים שהכל במקום, ורואים כמה חסכתם.${streak?` כרגע ${streak} חודשים ברצף 🔥 — אל תשברו אותו!`:''}</div></div>
        <span style="background:var(--teal);color:#06121a;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:800;white-space:nowrap">להתחיל ←</span></div>`;
  ['mc-banner-dash','mc-banner-budget'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
}

// ── The flow ──
function _mcModal(){
  let o=document.getElementById('mc-modal');
  if(!o){o=document.createElement('div');o.id='mc-modal';
    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;z-index:9000;overflow:auto;padding:24px 12px';
    o.addEventListener('click',e=>{if(e.target===o)closeMonthClose();});document.body.appendChild(o);}
  return o;
}
function openMonthClose(){_mcModal().style.display='flex';renderMonthClose();}
function closeMonthClose(){const o=document.getElementById('mc-modal');if(o)o.style.display='none';}
// what each account has for month k
function _mcStatus(k){
  const accs=typeof budgetAccs==='function'&&budgetAccs()?budgetAccs():null;
  return _mcEntries().map((e,i)=>{
    const m=(e.months||{})[k]||null;
    const name=accs?accs[i].name:'';
    if(!m)return {name,has:false};
    const bank=!!m.bank;
    let missing=0;
    if(bank&&typeof budgetMatchCardBills==='function'){
      const segs=(m.cardSegs||[]).map(s=>Object.assign({},s,{used:false}));
      missing=budgetMatchCardBills(m.bank.cards||[],segs).filter(c=>!c.ok).length;
    }
    const misc=(m.needs||[]).concat(m.wants||[]).filter(r=>/שונות/.test(r.name||'')).reduce((s,r)=>s+(budgetRowAmt(r)||0),0);
    const s=budgetSavedOf(m,e.profile,e.months);
    return {name,has:true,bank,cards:(m.cardSegs||[]).length,missing,misc,inc:s.inc,exp:s.exp-(s.inv||0),inv:s.inv||0};
  });
}
function _mcPrev(k){const [y,m]=k.split('-').map(Number);return _mcKey(new Date(y,m-2,1));}
function _mcSaved(k){return _mcStatus(k).filter(a=>a.has).reduce((s,a)=>s+a.inc-a.exp,0);}
function renderMonthClose(){
  const o=_mcModal(),k=mcDueMonth(),st=_mcStatus(k),closed=mcIsClosed(k);
  const any=st.some(a=>a.has),multi=st.length>1;
  const saved=_mcSaved(k),prevSaved=_mcSaved(_mcPrev(k)),hasPrev=_mcStatus(_mcPrev(k)).some(a=>a.has);
  const inv=st.reduce((s,a)=>s+(a.inv||0),0);
  const ok=t=>`<span style="color:var(--green)">✓</span> ${t}`,warn=t=>`<span style="color:var(--amber)">•</span> ${t}`;
  const box=(n,title,body)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="font-size:14px;font-weight:800;margin-bottom:6px"><span style="color:var(--teal)">${n}.</span> ${title}</div><div style="font-size:12.5px;color:var(--t2);line-height:1.8">${body}</div></div>`;
  const btn=(txt,js,main)=>`<button onclick="${js}" style="margin-top:6px;background:${main?'var(--teal)':'none'};color:${main?'#06121a':'var(--teal)'};border:1px solid var(--teal-border);border-radius:9px;padding:6px 14px;font-family:var(--font);font-size:12.5px;font-weight:800;cursor:pointer">${txt}</button>`;
  const per=(fn)=>st.map(a=>(multi?`<b>${esc(a.name)}:</b> `:'')+fn(a)).join('<br>');
  const step1=box(1,'מעלים את הקבצים של '+_mcShort(k),
    per(a=>!a.has?warn('עוד אין נתונים לחודש'):(a.bank?ok('עו"ש'):warn('עו"ש לא הועלה'))+' · '+(a.cards?ok(a.cards+' פירוטי אשראי'):warn('פירוטי אשראי לא הועלו')))
    +'<div style="font-size:11.5px;color:var(--t3)">קובץ עו"ש + פירוט של כל כרטיס אשראי. אפשר להעלות כמה קבצים יחד — הכל נכנס לחודש הנכון לבד.</div>'
    +(typeof canImportStatements==='function'&&canImportStatements()?btn('📥 העלאת קבצים',`mcGoBudget('${k}',true)`,true):''));
  const step2=box(2,'בודקים שהכל במקום',
    per(a=>!a.has?'—':[a.missing?warn(a.missing+' חיובי אשראי בעו"ש בלי פירוט'):(a.bank?ok('כל חיובי האשראי עם פירוט'):''),
      a.misc>=1?warn(`${fmt(a.misc)} ב"שונות" — כדאי לשייך לקטגוריות`):ok('אין הוצאות לא משויכות')].filter(Boolean).join(' · '))
    +'<br>'+btn('לפתוח את '+_mcShort(k),`mcGoBudget('${k}',false)`));
  const step3=box(3,'כמה חסכתם',
    any?`<div style="font-size:22px;font-weight:800;color:${saved>=0?'var(--teal)':'var(--red)'}">${saved>=0?'':'−'}${fmt(Math.abs(saved))}</div>
      ${inv?`<div>📈 מתוכם ${fmt(inv)} הועברו להשקעות</div>`:''}
      ${hasPrev?`<div>${saved>=prevSaved?'↑':'↓'} ${fmt(Math.abs(saved-prevSaved))} לעומת ${_mcShort(_mcPrev(k))}</div>`:''}
      ${closed?`<div style="margin-top:6px;color:var(--green);font-weight:800">✅ החודש סגור${mcStreak()>1?' · 🔥 '+mcStreak()+' חודשים ברצף':''}</div>`
        :btn('✅ סגרתי את '+_mcShort(k),`mcCloseMonth('${k}')`,true)}
      ${btn('🎯 לאן להעביר את הכסף?',"closeMonthClose();goTo('goals',document.getElementById('nav-goals'))")}`
    :'אין עדיין נתונים לחודש הזה — מתחילים בשלב 1.');
  o.innerHTML=`<div style="background:var(--s1);border:1px solid var(--border);border-radius:16px;max-width:560px;width:100%;padding:18px 18px 12px;direction:rtl">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800">🗓️ סגירת ${_mcName(k)}</div>
      <button onclick="closeMonthClose()" style="background:none;border:none;color:var(--t3);font-size:22px;cursor:pointer">×</button></div>
    ${step1}${step2}${step3}
    <div style="font-size:11.5px;color:var(--t3);margin:4px 0 6px">החודש נפתח לסגירה כל חודש ב־
      <select onchange="mcSetCloseDay(this.value)" style="background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--white);font-family:var(--font);font-size:11.5px">
        ${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}"${d===mcCloseDay()?' selected':''}>${d}</option>`).join('')}</select>
      לחודש (אחרי יום החיוב של האשראי).</div>
  </div>`;
}
function mcGoBudget(k,upload){
  closeMonthClose();
  if(D.budgetMonths&&D.budgetMonths[k])D.budgetCurMonth=k;
  if(D.budgetView==='all')D.budgetView='';
  goTo('budget',document.getElementById('nav-budget'));
  if(typeof renderBudget==='function')renderBudget();
  if(upload&&window.SIX)setTimeout(()=>SIX.open(),150);
}
function mcSetCloseDay(v){D.settings=D.settings||{};D.settings.closeDay=String(v);markDirty();mcSyncSummary();renderMonthClose();renderMonthCloseBanners();}
function mcCloseMonth(k){
  D.monthClose=D.monthClose||{};D.monthClose[k]=new Date().toISOString();
  touchSection&&touchSection('budget');markDirty();mcSyncSummary();
  renderMonthClose();renderMonthCloseBanners();
  const s=mcStreak();
  showToast(`✅ ${_mcName(k)} נסגר${s>1?` — ${s} חודשים ברצף 🔥`:''}. כל הכבוד!`);
}
// The small record the monthly Make scenario reads (users/{uid}) — no money figures
function mcSyncSummary(){
  if(typeof CU==='undefined'||!CU||typeof db==='undefined')return;
  const keys=Object.keys(D.monthClose||{}).sort(),s=D.settings||{};
  const u=auth.currentUser||{};
  db.collection('users').doc(CU).set({
    name:s.displayName||'',email:s.email||u.email||'',phone:s.phone||'',
    lastClosedMonth:keys.length?keys[keys.length-1]:'',closeDay:mcCloseDay(),
    remindersOff:!!s.monthCloseRemindersOff
  },{merge:true}).catch(()=>{});
}
