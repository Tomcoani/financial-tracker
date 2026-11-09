// ══ "מה באת לעשות היום?" — THE HOME-PAGE BOARD + THE MONTHLY TRACK ══
// A board at the top of the home page (beta users, core.js isBeta). Clicked, it opens two buttons:
//  • עדכון חודשי — the monthly track below: files → check → savings & goals → close the month
//  • עדכון חצי־שנתי — the half-yearly track (half-year.js)
// Each says what's waiting. For beta users the board replaces the separate home-page cards of both.
// The monthly track reuses month-close.js (which month is due, per-account status, closing) and the
// look of half-year.js (stations, ✍️ by hand / 🤖 by itself, the "back to the track" pill).
let _tbOpen=false,_mtStep=0;

function renderTodayBoard(){
  const el=document.getElementById('today-board');if(!el)return;
  if(typeof isBeta!=='function'||!isBeta()){el.innerHTML='';return;}
  const k=mcDueMonth(),closed=mcIsClosed(k),hyDue=typeof hyIsDue==='function'&&hyIsDue();
  const hyLast=D.halfYear&&D.halfYear.lastDone;
  const waiting=(closed?0:1)+(hyDue?1:0);
  const tag=(due,txt)=>`<span style="font-size:11.5px;font-weight:700;color:${due?'var(--amber)':'var(--green)'}">${due?'• ':'✓ '}${txt}</span>`;
  const btn=(fn,icon,title,desc,status)=>`<button onclick="${fn}" style="text-align:right;display:flex;flex-direction:column;gap:5px;background:var(--s2);border:1.5px solid var(--teal-border);border-radius:14px;padding:14px 16px;font-family:var(--font);color:var(--white);cursor:pointer;min-width:0">
      <span style="font-size:16px;font-weight:800;color:var(--teal)">${icon} ${title}</span>
      <span style="font-size:12.5px;color:var(--t2);line-height:1.6">${desc}</span>
      ${status}
      <span style="margin-top:2px;font-size:12.5px;font-weight:800;color:var(--teal)">מתחילים ←</span></button>`;
  el.innerHTML=`<div style="background:linear-gradient(135deg,rgba(66,235,214,.14),rgba(66,235,214,.03));border:1.5px solid var(--teal-border);border-radius:16px;margin-bottom:14px;overflow:hidden">
    <button onclick="todayBoardToggle()" aria-expanded="${_tbOpen}" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:none;border:none;padding:16px 18px;font-family:var(--font);color:var(--white);cursor:pointer;text-align:right">
      <span style="min-width:0"><span style="display:block;font-size:18px;font-weight:800">👋 מה באת לעשות היום?</span>
        <span style="display:block;font-size:12.5px;color:var(--t2);margin-top:3px">${waiting?`${waiting===1?'יש דבר אחד שמחכה לך':'יש 2 דברים שמחכים לך'}. בוחרים, ונעשה את זה יחד שלב אחר שלב.`:'הכל מעודכן 🎉 אפשר לבחור עדכון בכל זמן.'}</span></span>
      <span style="font-size:18px;color:var(--teal);transition:transform .2s;transform:rotate(${_tbOpen?180:0}deg)">⌄</span>
    </button>
    ${_tbOpen?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:0 18px 18px">
      ${btn('openMonthlyTrack()','🗓️','עדכון חודשי','מעלים את קבצי הבנק והאשראי, בודקים שהכל במקום ומעדכנים את המטרות. בערך 10 דקות.',
        tag(!closed,closed?`${mcShortName(k)} סגור`:`${mcShortName(k)} מחכה לעדכון`))}
      ${btn('openHalfYear()','🧭','עדכון חצי־שנתי','פנסיה, תיק השקעות, מטרות ושווי נטו. בערך 20 דקות, פעם בחצי שנה.',
        tag(hyDue,hyDue?'הגיע הזמן':hyLast?'עודכן ב־'+fmtDate(hyLast):'מעודכן'))}
    </div>`:''}
  </div>`;
}
function todayBoardToggle(){_tbOpen=!_tbOpen;renderTodayBoard();}
function mcShortName(k){const m=+String(k).split('-')[1];return (typeof HEB_MONTHS!=='undefined'&&HEB_MONTHS[m-1])||k;}

// ── The monthly track ──
function _mtModal(){
  let o=document.getElementById('mt-modal');
  if(!o){o=document.createElement('div');o.id='mt-modal';
    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;z-index:9000;overflow:auto;padding:24px 12px';
    o.addEventListener('click',e=>{if(e.target===o)closeMonthlyTrack();});document.body.appendChild(o);}
  return o;
}
function _mtSteps(){return [{id:'map',title:'פתיחה'},{id:'files',title:'קבצים'},{id:'check',title:'בדיקה'},{id:'goals',title:'מטרות'},{id:'done',title:'סיום'}];}
function openMonthlyTrack(){_mtStep=0;_hyPill(false);_mtModal().style.display='flex';renderMonthlyTrack();}
function mtResume(){_hyPill(false);_mtModal().style.display='flex';renderMonthlyTrack();}
function closeMonthlyTrack(){
  const o=document.getElementById('mt-modal');if(o)o.style.display='none';
  _hyPill(false);
  if(typeof _lastTab!=='undefined'&&_lastTab==='dash'&&typeof renderDash==='function')renderDash();
  else renderTodayBoard();
}
function mtStepTo(i){_mtStep=Math.max(0,Math.min(_mtSteps().length-1,i));renderMonthlyTrack();_mtModal().scrollTop=0;}
// Leave the track for a page; the pill brings the client back
function _mtAway(){const o=document.getElementById('mt-modal');if(o)o.style.display='none';_hyPill(true,mtResume);}
function mtUpload(){_mtAway();mcGoBudget(mcDueMonth(),true);}
function mtOpenMonth(){_mtAway();mcGoBudget(mcDueMonth(),false);}
function mtGoTab(tab){_mtAway();goToTab(tab);}
function mtMark(sec){touchSection(sec);markDirty();renderMonthlyTrack();showToast('סומן כמעודכן ✓');}
function mtClose(){mcCloseMonth(mcDueMonth());renderMonthlyTrack();}

function _mtState(){
  const k=mcDueMonth(),st=_mcStatus(k),multi=st.length>1;
  const goals=typeof _hyGoals==='function'?_hyGoals():[];
  return {k,st,multi,
    files:st.filter(a=>!a.has||!a.bank||!a.cards).length,
    check:st.filter(a=>a.has&&(a.missing||a.misc>=1)).length,
    goals:goals.length&&_hyOld(_hyLU('goals'),parseInt((D.settings||{}).freq,10)||30),
    closed:mcIsClosed(k)};
}
function renderMonthlyTrack(){
  const o=_mtModal(),steps=_mtSteps(),cur=steps[_mtStep],scroll=o.scrollTop,s=_mtState();
  const pill=steps.map((x,i)=>`<button onclick="mtStepTo(${i})" style="flex:1 1 0;min-width:0;background:none;border:none;border-top:3px solid ${i<=_mtStep?'var(--teal)':'var(--border)'};padding:6px 2px 0;color:${i===_mtStep?'var(--teal)':'var(--t3)'};font-family:var(--font);font-size:11px;font-weight:${i===_mtStep?800:500};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.title}</button>`).join('');
  const body={map:_mtMapHtml,files:_mtFilesHtml,check:_mtCheckHtml,goals:_mtGoalsHtml,done:_mtDoneHtml}[cur.id](s);
  const back=_mtStep>0?`<button onclick="mtStepTo(${_mtStep-1})" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:10px;padding:9px 16px;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">→ חזרה</button>`:'<span></span>';
  const next=cur.id==='done'?'':`<button onclick="mtStepTo(${_mtStep+1})" style="background:var(--teal);color:#06121a;border:none;border-radius:10px;padding:9px 20px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer">${cur.id==='map'?'מתחילים':'הבא'} ←</button>`;
  o.innerHTML=`<div style="background:var(--s1);border:1px solid var(--border);border-radius:16px;max-width:600px;width:100%;padding:18px 18px 14px;direction:rtl">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800">🗓️ עדכון חודשי · ${esc(_mcName(s.k))}</div>
      <button onclick="closeMonthlyTrack()" aria-label="סגירה" style="background:none;border:none;color:var(--t3);font-size:22px;cursor:pointer">×</button></div>
    <div style="display:flex;gap:4px;margin-bottom:14px">${pill}</div>
    ${body}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:10px">${back}${next}</div>
  </div>`;
  o.scrollTop=scroll;
}
const _mtOk=t=>`<span style="color:var(--green)">✓</span> ${t}`,_mtWarn=t=>`<span style="color:var(--amber)">•</span> ${t}`;
const _mtMainBtn=(txt,fn)=>`<button onclick="${fn}" style="background:var(--teal);color:#06121a;border:none;border-radius:9px;padding:8px 16px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer">${txt}</button>`;
function _mtBox(html){return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:10px;font-size:12.5px;line-height:1.9;color:var(--t2)">${html}</div>`;}
function _mtPer(s,fn){return s.st.map(a=>(s.multi?`<b>${esc(a.name)}:</b> `:'')+fn(a)).join('<br>');}
// Which card statement holds this month: by purchase month it's the one billed the month after
function _mtCardNote(k){
  const buy=typeof cardMonthMode==='function'&&cardMonthMode()==='buy';
  const [y,m]=k.split('-').map(Number),nxt=_mcKey(new Date(y,m,1));
  return buy?`💳 ההוצאות באשראי נרשמות אצלך לפי חודש העסקה, אז לחודש ${mcShortName(k)} צריך את פירוט האשראי שמחויב ב${mcShortName(nxt)}, וגם את זה שמחויב ב${mcShortName(k)} (לקניות של תחילת החודש).`
    :`💳 ההוצאות באשראי נרשמות אצלך לפי חודש החיוב, אז לחודש ${mcShortName(k)} צריך את פירוט האשראי שמחויב ב${mcShortName(k)}.`;
}
function _mtMapHtml(s){
  const line=(icon,title,hand,auto,left)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:11px 14px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:800;margin-bottom:4px"><span>${icon} ${title}</span>${left?`<span style="color:var(--amber);font-size:11.5px;font-weight:700;white-space:nowrap">• ${left}</span>`:'<span style="color:var(--green);font-size:11.5px;font-weight:700">✓</span>'}</div>
    <div style="font-size:12.5px;line-height:1.7;color:var(--t2)"><b style="color:var(--amber)">✍️</b> ${hand}<br><b style="color:var(--teal)">🤖</b> ${auto}</div></div>`;
  return `<p style="font-size:13.5px;color:var(--t2);line-height:1.8;margin:0 0 12px">פעם בחודש מעדכנים את ${esc(_mcName(s.k))}: כמה נכנס, כמה יצא, כמה נשאר ולאן הוא הולך. בכל שלב כתוב מה עושים ומה המערכת עושה לבד.</p>
    ${line('📥','מעלים קבצים','להוריד מהבנק ומחברות האשראי את הקבצים של החודש ולהעלות אותם','כל עסקה נכנסת לקטגוריה ולחודש הנכונים, חיובי אשראי בעו"ש לא נספרים פעמיים, והעברות להשקעות נרשמות כחיסכון',s.files?'חסרים קבצים':'')}
    ${line('🔍','בודקים שהכל במקום','לשייך מה שנכנס ל"שונות" ולהוסיף הוצאות שלא עברו בבנק, כמו מזומן','המערכת לומדת מכל שיוך, מסמנת חיובי אשראי בלי פירוט ובודקת שהתקציב מתיישב עם העו"ש',s.check?'יש מה לבדוק':'')}
    ${line('🎯','חיסכון ומטרות','לרשום כמה מהחיסכון הועבר לכל מטרה','"כמה חסכתי החודש" מחושב מהתקציב, ומטרה שהושגה יורדת מרשימת ההעברות',s.goals?'לעדכן':'')}
    ${line('✅','סוגרים את החודש','לחיצה אחת','רואים כמה חסכתם לעומת החודש הקודם, והרצף שלכם ממשיך',s.closed?'':'עוד לא נסגר')}
    <div style="font-size:12px;color:var(--t3);line-height:1.7">💡 אפשר לעצור באמצע ולחזור. כל מה שהעליתם ותיקנתם נשמר.</div>`;
}
function _mtFilesHtml(s){
  const can=typeof canImportStatements==='function'&&canImportStatements();
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">📥 מעלים את הקבצים של ${esc(mcShortName(s.k))}</div>
    ${_hyHand('קובץ עו"ש מאתר הבנק, ופירוט של כל כרטיס אשראי מאתר חברת האשראי (אקסל, PDF או CSV). אפשר להעלות כמה קבצים יחד.')}
    ${_hyAuto('כל עסקה נכנסת לקטגוריה שלה ולחודש הנכון, גם אם בקובץ יש כמה חודשים. קובץ שכבר הועלה לא נספר פעמיים.')}
    ${_mtBox(_mtPer(s,a=>!a.has?_mtWarn('עוד אין נתונים לחודש'):(a.bank?_mtOk('עו"ש'):_mtWarn('עו"ש לא הועלה'))+' · '+(a.cards?_mtOk(a.cards+' פירוטי אשראי'):_mtWarn('פירוט אשראי לא הועלה'))))}
    <div style="font-size:12px;color:var(--t3);line-height:1.7;margin-bottom:10px">${_mtCardNote(s.k)} את זה אפשר לשנות בטאב התנהלות חודשית.</div>
    ${can?_mtMainBtn('📥 העלאת קבצים','mtUpload()'):''}`;
}
function _mtCheckHtml(s){
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">🔍 בודקים שהכל במקום</div>
    ${_hyHand('לשייך לקטגוריה את מה שנכנס ל"שונות", ולהוסיף הוצאות שלא עברו בבנק או באשראי, כמו מזומן.')}
    ${_hyAuto('המערכת זוכרת כל שיוך לפעם הבאה, מסמנת חיובי אשראי שאין להם פירוט ובודקת שהתקציב מתיישב עם העו"ש.')}
    ${_mtBox(_mtPer(s,a=>!a.has?'עוד אין נתונים':[a.missing?_mtWarn(a.missing+' חיובי אשראי בעו"ש בלי פירוט'):(a.bank?_mtOk('כל חיובי האשראי עם פירוט'):''),
      a.misc>=1?_mtWarn(`${fmt(a.misc)} ב"שונות", כדאי לשייך`):_mtOk('אין הוצאות לא משויכות')].filter(Boolean).join(' · ')))}
    ${_mtMainBtn('לפתוח את '+esc(mcShortName(s.k)),'mtOpenMonth()')}`;
}
function _mtGoalsHtml(s){
  const saved=_mcSaved(s.k),inv=s.st.reduce((a,x)=>a+(x.inv||0),0),any=s.st.some(a=>a.has);
  const lu=_hyLU('goals');
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">🎯 חיסכון ומטרות</div>
    ${_hyHand('לרשום במטרות כמה מהחיסכון של החודש הועבר לכל מטרה.')}
    ${_hyAuto('"כמה חסכתי החודש" מחושב מהתקציב. מטרה שהגעתם לסכום שלה יורדת מרשימת ההעברות.')}
    ${any?`<div style="background:rgba(66,235,214,.07);border:1px solid var(--teal-border);border-radius:12px;padding:10px 14px;margin-bottom:10px">
      <div style="font-size:12px;color:var(--t2)">חסכתם ב${esc(mcShortName(s.k))}</div>
      <div style="font-size:22px;font-weight:800;color:${saved>=0?'var(--teal)':'var(--red)'}">${saved>=0?'':'−'}${fmt(Math.abs(saved))}</div>
      ${inv?`<div style="font-size:12px;color:var(--t2)">📈 מתוכם ${fmt(inv)} הועברו להשקעות</div>`:''}</div>`:''}
    <div style="font-size:12px;margin-bottom:10px;color:${s.goals?'var(--amber)':'var(--green)'}">${lu?(s.goals?'• המטרות עודכנו לאחרונה ב־':'✓ המטרות עודכנו ב־')+fmtDate(lu):'• המטרות עוד לא עודכנו'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${_mtMainBtn('🎯 לעדכון המטרות',"mtGoTab('goals')")}<button onclick="mtMark('goals')" style="${_HY_SMALL}">המטרות מעודכנות</button></div>`;
}
function _mtDoneHtml(s){
  const items=[['📥 קבצים',s.files,1],['🔍 בדיקה',s.check,2],['🎯 מטרות',s.goals,3]];
  const list=items.map(([t,miss,i])=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${miss?'<span style="color:var(--amber)">•</span>':'<span style="color:var(--green)">✓</span>'} <b>${t}</b></span>
      ${miss?`<button onclick="mtStepTo(${i})" style="${_HY_SMALL};color:var(--teal);border-color:var(--teal-border)">להשלים</button>`:''}</div>`).join('');
  const saved=_mcSaved(s.k),prev=_mcPrev(s.k),hasPrev=_mcStatus(prev).some(a=>a.has),prevSaved=hasPrev?_mcSaved(prev):0,streak=mcStreak();
  const left=items.some(x=>x[1]);
  return `<div style="font-size:15px;font-weight:800;margin-bottom:8px">${s.closed?`✅ ${esc(_mcName(s.k))} סגור`:left?'כמעט שם':'🎉 הכל מוכן לסגירה'}</div>
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:4px 14px 6px;margin-bottom:12px">${list}</div>
    ${s.st.some(a=>a.has)?`<div style="background:rgba(66,235,214,.07);border:1px solid var(--teal-border);border-radius:12px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--t2)">חסכתם ב${esc(mcShortName(s.k))}</div>
      <div style="font-size:24px;font-weight:800;color:${saved>=0?'var(--teal)':'var(--red)'}">${saved>=0?'':'−'}${fmt(Math.abs(saved))}</div>
      ${hasPrev?`<div style="font-size:12.5px;color:${saved>=prevSaved?'var(--green)':'var(--red)'}">${saved>=prevSaved?'↑':'↓'} ${fmt(Math.abs(saved-prevSaved))} לעומת ${esc(mcShortName(prev))}</div>`:''}
    </div>`:''}
    ${s.closed?`<div style="font-size:13px;color:var(--green);font-weight:800;margin-bottom:6px">✅ החודש סגור${streak>1?` · 🔥 ${streak} חודשים ברצף`:''}</div>
      <button onclick="closeMonthlyTrack()" style="width:100%;background:none;border:1px solid var(--border);color:var(--t2);border-radius:10px;padding:11px;font-family:var(--font);font-size:14px;font-weight:800;cursor:pointer">סגירה</button>`
    :`<button onclick="mtClose()" style="width:100%;background:${left?'none':'var(--teal)'};color:${left?'var(--t2)':'#06121a'};border:1px solid ${left?'var(--border)':'var(--teal)'};border-radius:10px;padding:11px;font-family:var(--font);font-size:14px;font-weight:800;cursor:pointer">${left?'לסגור את '+esc(mcShortName(s.k))+' בכל זאת':'✅ סגרתי את '+esc(mcShortName(s.k))}</button>`}`;
}
